import type { NextConfig } from 'next';
import { PHASE_DEVELOPMENT_SERVER } from 'next/constants';
import fs from 'node:fs';
import path from 'node:path';
import type { Compiler, RuleSetRule } from 'webpack';
import type { BuildConfig, BuildDevConfig } from '../../config/build';
import { isPromiseLike } from '../../utils/object';
import {
  BUNDLE_CSS_FILE,
  createCompilerId,
  createFileCssCache,
  createPluginCompiler,
  DEFAULT_TRANSFORM_EXCLUDE,
  DEFAULT_TRANSFORM_INCLUDE,
  EXTRACTED_CSS_MARKER,
  invalidateFiles,
  PLUGIN_CACHE_DIR,
  PLUGIN_NAME,
  type PluginCssOutputOptions,
  transformCssOutput,
} from '../utils';
import { writeCacheFile } from '../utils/cache';
import { getStyleEntryDefines, getStyleRuntimeMode } from '../utils/runtimeEntry';
import { getSourcemapSidecar, type SourcemapSidecar } from '../utils/sidecar';
import type { SidecarRouteHandler } from '../utils/sidecar/server';
import { CSS_ENTRY_IMPORT_PATH, DEV_CSS_ROUTE, LOADER_IMPORT_PATH } from './constants';
import type {
  MaybePromise,
  NextConfigFunction,
  NextConfigInput,
  PluginOptions,
  TurbopackConfig,
  TurbopackLoaderItem,
  TurbopackResolveAlias,
  TurbopackRules,
  WebpackConfigContext,
  WebpackConfiguration,
} from './types';
import {
  addAliases,
  addWebpackPlugin,
  createNextBuildConfig,
  createNextBuildDevConfig,
  createNextConfigHash,
  getNextCacheDir,
  getNextPrecollectCacheSubdir,
  getTransformLoaderPath,
  NEXT_COMPILER_IDS,
  type NextLoaderState,
  nextRegistry,
  removeUndefinedValues,
  replaceCssMarkerAsset,
  resolveNextCompilerOptions,
} from './utils';

export default plugin;

const TURBOPACK_TRANSFORM_EXTENSIONS = ['*.ts', '*.tsx', '*.js', '*.jsx'] as const;
const clearedPrecollectCacheRoots = new Set<string>();

type NextPhaseState = {
  buildConfig: BuildConfig;
  buildDevConfig: BuildDevConfig | null;
  configHash: string;
  dev: boolean;
};

export function plugin(
  nextConfig: NextConfigInput = {},
  options: PluginOptions = {},
): NextConfigFunction {
  return (phase, context) => {
    const resolvedConfig = typeof nextConfig === 'function'
      ? nextConfig(phase, context)
      : nextConfig;

    const dev = phase === PHASE_DEVELOPMENT_SERVER;

    if (isPromiseLike(resolvedConfig)) {
      return resolvedConfig.then((config) => createNextConfig(config, options, dev));
    }

    return createNextConfig(resolvedConfig, options, dev);
  };
}

function createNextConfig(
  nextConfig: NextConfig,
  options: PluginOptions,
  dev: boolean,
): MaybePromise<NextConfig> {
  const rootDir = process.cwd();
  const cacheDir = getNextCacheDir(rootDir, options.cacheDir);

  const cssCache = createFileCssCache({
    cacheDir,
    cacheSubdir: getNextPrecollectCacheSubdir(dev),
  });

  const phaseState: NextPhaseState = {
    buildConfig: createNextBuildConfig(options),
    buildDevConfig: createNextBuildDevConfig(options),
    configHash: '',
    dev,
  };

  phaseState.configHash = createNextConfigHash(
    phaseState.buildConfig,
    phaseState.dev,
  );

  let sidecar: SourcemapSidecar | null = null;

  if (dev) {
    const route: SidecarRouteHandler = () => ({
      contentType: 'text/css; charset=utf-8',
      body: cssCache.getCss({
        ...phaseState.buildConfig.css,
        configHash: phaseState.configHash,
      }),
    });

    sidecar = getSourcemapSidecar({
      projectDir: rootDir,
      cacheDir,
      routes: { [DEV_CSS_ROUTE]: route },
    });
  }

  const finish = () =>
    createFluenticNextConfigResolved(
      nextConfig,
      options,
      dev,
      cacheDir,
      cssCache,
      sidecar,
      phaseState,
    );

  return sidecar && dev
    ? sidecar.ensureStarted().then(finish)
    : finish();
}

function createFluenticNextConfigResolved(
  nextConfig: NextConfig,
  options: PluginOptions,
  dev: boolean,
  cacheDir: string,
  cssCache: ReturnType<typeof createFileCssCache>,
  sidecar: SourcemapSidecar | null,
  phaseState: NextPhaseState,
): NextConfig {
  const originalWebpack = nextConfig.webpack;
  const originalTurbopack: TurbopackConfig = nextConfig.turbopack ?? {};
  const originalCompiler = nextConfig.compiler ?? {};
  const originalRunAfterProductionCompile = originalCompiler.runAfterProductionCompile;
  const projectDir = process.cwd();

  const devCssHref = dev && sidecar
    ? sidecar.getRouteUrl(DEV_CSS_ROUTE)
    : null;

  const turbopackCompilerId = createCompilerId(NEXT_COMPILER_IDS.turbopack);

  const turbopackState = createPluginCompiler({
    projectDir,
    cacheDir,
    options: resolveNextCompilerOptions(
      options,
      sidecar,
      phaseState.buildConfig,
      phaseState.buildDevConfig,
      dev,
    ),
    dev,
    runtimeMode: getStyleRuntimeMode(dev, true),
  });

  const turbopackCssEntryPath = writeCacheFile(
    getImportableCssCacheDir(projectDir),
    BUNDLE_CSS_FILE,
    EXTRACTED_CSS_MARKER,
  );
  const turbopackCssAliases = {
    [CSS_ENTRY_IMPORT_PATH]: turbopackCssEntryPath,
  };

  nextRegistry.setEntry<NextLoaderState>(turbopackCompilerId, {
    compiler: turbopackState.compiler,
    filter: turbopackState.filter,
    configHash: phaseState.configHash,
    cssCache,
    cssEntryImportPath: turbopackCssAliases[CSS_ENTRY_IMPORT_PATH],
    dev,
    devCssHref,
    isServer: true,
  });

  return {
    ...nextConfig,
    env: nextConfig.env,
    compiler: {
      ...originalCompiler,
      define: {
        ...originalCompiler.define,
        ...getStyleEntryDefines(
          phaseState.buildConfig,
          phaseState.buildDevConfig,
          (dev && sidecar?.getBaseUrl()) || null,
          false,
        ),
      },
      defineServer: originalCompiler.defineServer,
      async runAfterProductionCompile(metadata) {
        await originalRunAfterProductionCompile?.(metadata);

        if (dev) return;

        const css = await transformCssOutput(
          cssCache.getCss({
            ...phaseState.buildConfig.css,
            configHash: phaseState.configHash,
          }),
          options.cssOutput,
          BUNDLE_CSS_FILE,
        );

        patchTurbopackExtractedCss({
          css,
          distDir: metadata.distDir,
          projectDir: metadata.projectDir,
        });
      },
    },
    turbopack: createTurbopackConfig(originalTurbopack, {
      buildConfig: phaseState.buildConfig,
      buildDevConfig: phaseState.buildDevConfig,
      cacheDir,
      compilerId: turbopackCompilerId,
      configHash: phaseState.configHash,
      cssAliases: turbopackCssAliases,
      dev,
      devCssHref,
      projectDir,
    }),
    webpack(config: WebpackConfiguration, context: WebpackConfigContext) {
      if (typeof originalWebpack === 'function') {
        config = originalWebpack(config, context);
      }

      const state = createPluginCompiler({
        projectDir: context.dir,
        cacheDir,
        options: resolveNextCompilerOptions(
          options,
          sidecar,
          phaseState.buildConfig,
          phaseState.buildDevConfig,
          context.dev,
        ),
        dev: context.dev,
        runtimeMode: getStyleRuntimeMode(context.dev, context.isServer),
      });

      const compilerId = createCompilerId(
        context.isServer ? NEXT_COMPILER_IDS.webpackServer : NEXT_COMPILER_IDS.webpackClient,
      );

      const cssEntryPath = writeCacheFile(
        state.cacheDir,
        BUNDLE_CSS_FILE,
        EXTRACTED_CSS_MARKER,
      );
      const cssAliases = {
        [CSS_ENTRY_IMPORT_PATH]: cssEntryPath,
      };

      nextRegistry.setEntry<NextLoaderState>(compilerId, {
        compiler: state.compiler,
        filter: state.filter,
        configHash: phaseState.configHash,
        cssCache,
        cssEntryImportPath: cssEntryPath,
        dev: context.dev,
        devCssHref,
        isServer: context.isServer,
      });

      addAliases(config, cssAliases);

      addTransformLoader(config, options, compilerId);

      addLifecyclePlugin(config, {
        buildConfig: phaseState.buildConfig,
        configHash: phaseState.configHash,
        compiler: state.compiler,
        cssOutput: options.cssOutput,
        cssCache,
        dev: context.dev,
        sidecar,
      });

      return config;
    },
  };
}

function getImportableCssCacheDir(projectDir: string) {
  return path.join(projectDir, PLUGIN_CACHE_DIR);
}

function createTurbopackConfig(
  originalTurbopack: TurbopackConfig,
  args: {
    buildConfig: BuildConfig;
    buildDevConfig: BuildDevConfig | null;
    cacheDir: string;
    compilerId: string;
    configHash: string;
    cssAliases: Record<string, string>;
    dev: boolean;
    devCssHref: string | null;
    projectDir: string;
  },
): TurbopackConfig {
  const resolveAlias: TurbopackResolveAlias = {
    ...originalTurbopack.resolveAlias,
    ...args.cssAliases,
  };

  return {
    ...originalTurbopack,
    resolveAlias,
    rules: mergeTurbopackRules(
      originalTurbopack.rules ?? {},
      args,
    ),
  };
}

function mergeTurbopackRules(
  existingRules: TurbopackRules,
  args: {
    buildConfig: BuildConfig;
    buildDevConfig: BuildDevConfig | null;
    cacheDir: string;
    compilerId: string;
    configHash: string;
    cssAliases: Record<string, string>;
    dev: boolean;
    devCssHref: string | null;
    projectDir: string;
  },
): TurbopackRules {
  const loaderItem: TurbopackLoaderItem = {
    loader: LOADER_IMPORT_PATH,
    options: removeUndefinedValues({
      buildConfig: args.buildConfig,
      buildDevConfig: args.buildDevConfig,
      cacheDir: args.cacheDir,
      compilerId: args.compilerId,
      configHash: args.configHash,
      cssEntryImportPath: args.cssAliases[CSS_ENTRY_IMPORT_PATH],
      dev: args.dev,
      devCssHref: args.devCssHref,
      isServer: true,
      projectDir: args.projectDir,
    }),
  };

  const nextRules: Record<string, unknown> = { ...existingRules };

  for (const extension of TURBOPACK_TRANSFORM_EXTENSIONS) {
    nextRules[extension] = prependTurbopackLoader(existingRules[extension], loaderItem);
  }

  return nextRules as TurbopackRules;
}

function prependTurbopackLoader(rule: unknown, loader: TurbopackLoaderItem) {
  if (!rule || typeof rule !== 'object' || Array.isArray(rule)) {
    return { loaders: [loader] };
  }

  const item = rule as { loaders?: TurbopackLoaderItem | TurbopackLoaderItem[]; };

  const loaders = Array.isArray(item.loaders)
    ? item.loaders
    : item.loaders
    ? [item.loaders]
    : [];

  return {
    ...item,
    loaders: [loader, ...loaders],
  };
}

function addTransformLoader(
  config: WebpackConfiguration,
  options: PluginOptions,
  compilerId: string,
) {
  if (!config.module) config.module = { rules: [] };
  if (!config.module.rules) config.module.rules = [];

  const rule: RuleSetRule = {
    use: [{
      loader: getTransformLoaderPath(),
      options: { ...options, compilerId },
    }],
    enforce: 'pre',
    test: DEFAULT_TRANSFORM_INCLUDE,
    exclude: options.include ? undefined : [
      DEFAULT_TRANSFORM_EXCLUDE,
      /\.next/,
      /\.git/,
    ],
  };

  config.module.rules.unshift(rule);
}

function patchTurbopackExtractedCss(args: {
  css: string;
  distDir: string;
  projectDir: string;
}) {
  if (!args.css) return;

  const distDir = path.isAbsolute(args.distDir)
    ? args.distDir
    : path.join(args.projectDir, args.distDir);

  for (const filePath of findCssFiles(distDir)) {
    const source = fs.readFileSync(filePath, 'utf8');
    if (!source.includes(EXTRACTED_CSS_MARKER)) continue;

    fs.writeFileSync(filePath, source.split(EXTRACTED_CSS_MARKER).join(args.css), 'utf8');
  }
}

function findCssFiles(dir: string): string[] {
  let entries: fs.Dirent[];

  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const files: string[] = [];

  for (const entry of entries) {
    const filePath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...findCssFiles(filePath));
    } else if (entry.isFile() && entry.name.endsWith('.css')) {
      files.push(filePath);
    }
  }

  return files;
}

function addLifecyclePlugin(
  config: WebpackConfiguration,
  args: {
    buildConfig: BuildConfig;
    configHash: string;
    compiler: NextLoaderState['compiler'];
    cssOutput: PluginCssOutputOptions | undefined;
    cssCache: ReturnType<typeof createFileCssCache>;
    dev: boolean;
    sidecar: SourcemapSidecar | null;
  },
) {
  addWebpackPlugin(config, {
    apply(webpackCompiler: Compiler) {
      webpackCompiler.hooks.beforeRun.tapPromise(PLUGIN_NAME, async () => {
        await args.sidecar?.ensureStarted();

        if (!args.dev && !clearedPrecollectCacheRoots.has(args.cssCache.rootDir)) {
          clearedPrecollectCacheRoots.add(args.cssCache.rootDir);
          args.cssCache.clear();
        }
      });

      webpackCompiler.hooks.watchRun.tapPromise(PLUGIN_NAME, async (watchCompiler) => {
        await args.sidecar?.ensureStarted();

        const files = watchCompiler.modifiedFiles;
        if (!files || !files.size) return;

        invalidateFiles(args.compiler, files);
      });

      webpackCompiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation) => {
        if (args.dev) return;

        compilation.hooks.processAssets.tapPromise(
          {
            name: PLUGIN_NAME,
            stage: webpackCompiler.webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONS,
          },
          async () => {
            const css = await transformCssOutput(
              args.cssCache.getCss({
                ...args.buildConfig.css,
                configHash: args.configHash,
              }),
              args.cssOutput,
              BUNDLE_CSS_FILE,
            );

            if (!css) return;

            replaceCssMarkerAsset({
              compiler: webpackCompiler,
              compilation,
              css,
              marker: EXTRACTED_CSS_MARKER,
            });
          },
        );
      });
    },
  });
}
