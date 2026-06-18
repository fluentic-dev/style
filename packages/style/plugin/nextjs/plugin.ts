import type { NextConfig } from 'next';
import { PHASE_DEVELOPMENT_SERVER } from 'next/constants';
import fs from 'node:fs';
import path from 'node:path';
import type { Compilation, Compiler, RuleSetRule, WebpackPluginInstance } from 'webpack';
import type { BuildConfig, BuildDevConfig } from '../../config/build';
import { isPromiseLike } from '../../utils/object';
import {
  BUNDLE_CSS_FILE,
  createFileCssCache,
  createFileCssConfigHash,
  createPluginCompiler,
  DEFAULT_TRANSFORM_EXCLUDE,
  DEFAULT_TRANSFORM_INCLUDE,
  EXTRACTED_CSS_MARKER,
  invalidateFiles,
  PLUGIN_CACHE_DIR,
  PLUGIN_NAME,
} from '../utils';
import { writeCacheFile } from '../utils/cache';
import { formatError } from '../utils/misc';
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
  getTransformLoaderPath,
  type NextLoaderState,
  nextRegistry,
  type PluginCompiler,
  PRECOLLECT_CACHE_DIR,
  removeUndefinedValues,
  replaceCssMarkerAsset,
  resolveNextCompilerOptions,
} from './utils';

export default plugin;

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
    cacheSubdir: PRECOLLECT_CACHE_DIR,
  });

  let sidecar: SourcemapSidecar | null = null;

  if (dev) {
    const buildConfig = createNextBuildConfig(options);
    const buildDevConfig = createNextBuildDevConfig(options);
    const configHash = createFileCssConfigHash(
      createNextConfigHash(buildConfig, buildDevConfig, dev),
    );

    const route: SidecarRouteHandler = () => ({
      contentType: 'text/css; charset=utf-8',
      body: cssCache.getCss({ configHash }),
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
): NextConfig {
  const originalWebpack = nextConfig.webpack;
  const originalTurbopack: TurbopackConfig = nextConfig.turbopack ?? {};
  const originalCompiler = nextConfig.compiler ?? {};
  const originalRunAfterProductionCompile = originalCompiler.runAfterProductionCompile;
  const extractCompilers: PluginCompiler[] = [];
  const projectDir = process.cwd();
  const phaseBuildConfig = createNextBuildConfig(options);
  const phaseBuildDevConfig = createNextBuildDevConfig(options);
  const phaseConfigHash = createFileCssConfigHash(
    createNextConfigHash(phaseBuildConfig, phaseBuildDevConfig, dev),
  );

  const devCssHref = dev && sidecar
    ? sidecar.getRouteUrl(DEV_CSS_ROUTE)
    : null;

  const turbopackCompilerId = createCompilerId('turbopack');

  const turbopackState = createPluginCompiler({
    projectDir,
    cacheDir,
    options: resolveNextCompilerOptions(
      options,
      sidecar,
      phaseBuildConfig,
      phaseBuildDevConfig,
      dev,
    ),
    dev,
    runtimeMode: getStyleRuntimeMode(dev),
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
    configHash: phaseConfigHash,
    cssCache,
    cssEntryImportPath: turbopackCssAliases[CSS_ENTRY_IMPORT_PATH],
    dev,
    devCssHref,
    isServer: false,
  });

  return {
    ...nextConfig,
    env: nextConfig.env,
    compiler: {
      ...originalCompiler,
      define: {
        ...originalCompiler.define,
        ...getStyleEntryDefines(
          phaseBuildConfig,
          phaseBuildDevConfig,
          dev,
          dev ? sidecar?.getBaseUrl() : '',
        ),
      },
      defineServer: originalCompiler.defineServer,
      async runAfterProductionCompile(metadata) {
        await originalRunAfterProductionCompile?.(metadata);

        if (dev) return;

        patchTurbopackExtractedCss({
          css: cssCache.getCss({ configHash: phaseConfigHash }),
          distDir: metadata.distDir,
          projectDir: metadata.projectDir,
        });
      },
    },
    turbopack: createTurbopackConfig(originalTurbopack, {
      buildConfig: phaseBuildConfig,
      buildDevConfig: phaseBuildDevConfig,
      cacheDir,
      compilerId: turbopackCompilerId,
      configHash: phaseConfigHash,
      cssAliases: turbopackCssAliases,
      dev,
      devCssHref,
      projectDir,
    }),
    webpack(config: WebpackConfiguration, context: WebpackConfigContext) {
      if (typeof originalWebpack === 'function') {
        config = originalWebpack(config, context);
      }

      const buildConfig = createNextBuildConfig(options);
      const buildDevConfig = createNextBuildDevConfig(options);
      const configHash = createFileCssConfigHash(
        createNextConfigHash(buildConfig, buildDevConfig, context.dev),
      );

      const state = createPluginCompiler({
        projectDir: context.dir ?? process.cwd(),
        cacheDir,
        options: resolveNextCompilerOptions(
          options,
          sidecar,
          buildConfig,
          buildDevConfig,
          context.dev,
        ),
        dev: context.dev,
        runtimeMode: getStyleRuntimeMode(context.dev, context.isServer),
      });

      extractCompilers.push(state.compiler);

      const compilerId = createCompilerId(context.isServer ? 'server' : 'client');

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
        configHash,
        cssCache: context.dev ? cssCache : null,
        cssEntryImportPath: CSS_ENTRY_IMPORT_PATH,
        dev: context.dev,
        devCssHref,
        isServer: context.isServer,
      });

      addAliases(config, cssAliases);

      addTransformLoader(config, options, compilerId);
      addWebpackPlugin(
        config,
        new context.webpack.DefinePlugin(getStyleEntryDefines(
          buildConfig,
          buildDevConfig,
          context.dev,
          context.dev ? sidecar?.getBaseUrl() : '',
        )),
      );

      if (!context.isServer) {
        addCssPatchPlugin(
          config,
          context.dev,
          () => extractCompilers.map((compiler) => compiler.getExtractedCss()).filter(Boolean).join('\n'),
        );
      }

      addLifecyclePlugin(config, state.compiler, sidecar);

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
      isServer: false,
      projectDir: args.projectDir,
    }),
  };

  return {
    ...existingRules,
    '*.ts': prependTurbopackLoader(existingRules['*.ts'], loaderItem),
    '*.tsx': prependTurbopackLoader(existingRules['*.tsx'], loaderItem),
    '*.js': prependTurbopackLoader(existingRules['*.js'], loaderItem),
    '*.jsx': prependTurbopackLoader(existingRules['*.jsx'], loaderItem),
  } as TurbopackRules;
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

function addCssPatchPlugin(
  config: WebpackConfiguration,
  dev: boolean,
  getExtractedCss: () => string,
) {
  if (dev) return;

  addWebpackPlugin(config, createCssPatchPlugin(getExtractedCss));
}

function createCssPatchPlugin(getExtractedCss: () => string): WebpackPluginInstance {
  return {
    apply(compiler: Compiler) {
      compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation) => {
        compilation.hooks.processAssets.tap(
          {
            name: PLUGIN_NAME,
            stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONS,
          },
          () =>
            patchExtractedCssAsset(
              compiler,
              compilation,
              getExtractedCss(),
            ),
        );
      });
    },
  };
}

function patchExtractedCssAsset(
  compiler: Compiler,
  compilation: Compilation,
  css: string,
) {
  if (!css) return;
  if (
    replaceCssMarkerAsset({
      compiler,
      compilation,
      css,
      marker: EXTRACTED_CSS_MARKER,
    })
  ) return;

  compilation.warnings.push(
    new Error(formatError(
      'No CSS asset containing the Fluentic marker was emitted by Next.js, so extracted CSS could not be attached. ' +
        'Make sure your app has a root layout that can receive the Fluentic CSS marker import.',
    )),
  );
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
  compiler: NextLoaderState['compiler'],
  sidecar: SourcemapSidecar | null,
) {
  addWebpackPlugin(config, {
    apply(webpackCompiler: Compiler) {
      webpackCompiler.hooks.beforeRun.tapPromise(PLUGIN_NAME, async () => {
        await sidecar?.ensureStarted();
      });

      webpackCompiler.hooks.watchRun.tapPromise(PLUGIN_NAME, async (watchCompiler) => {
        await sidecar?.ensureStarted();

        const files = watchCompiler.modifiedFiles;
        if (!files || !files.size) return;

        invalidateFiles(compiler, files);
      });
    },
  });
}

let nextCompilerId = 0;

function createCompilerId(label: string) {
  return `${PLUGIN_NAME}:nextjs:${label}:${nextCompilerId++}`;
}
