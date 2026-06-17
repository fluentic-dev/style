import type { NextConfig } from 'next';
import { PHASE_DEVELOPMENT_SERVER } from 'next/constants';
import fs from 'node:fs';
import path from 'node:path';
import type { Compilation, Compiler, RuleSetRule, WebpackPluginInstance } from 'webpack';
import { isPromiseLike } from '../../utils/object';
import {
  createFileCssCache,
  createFileCssConfigHash,
  createPluginCompiler,
  DEFAULT_TRANSFORM_EXCLUDE,
  getExtractedCssMarker,
  invalidateFiles,
  PLUGIN_CACHE_DIR,
  PLUGIN_NAME,
} from '../utils';
import { getRuntimeImportAliases, getServerRuntimeImportAliases } from '../utils/bundler';
import { writeCacheFile, writePluginCacheFile } from '../utils/cache';
import { formatError } from '../utils/misc';
import { getSourcemapSidecar, type SourcemapSidecar } from '../utils/sidecar';
import type { SidecarRouteHandler } from '../utils/sidecar/server';
import { CLIENT_ENTRY_IMPORT_PATH, CSS_ENTRY_IMPORT_PATH, DEV_CSS_ROUTE, LOADER_IMPORT_PATH } from './constants';
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
  createNextBuildMeta,
  getNextCacheDir,
  getTransformLoaderPath,
  type NextLoaderState,
  nextRegistry,
  type PluginCompiler,
  PRECOLLECT_NAMESPACE,
  prependClientEntry,
  removeUndefinedValues,
  replaceCssMarkerAsset,
  resolveNextCompilerOptions,
} from './utils';

const CACHE_FOLDER = 'nextjs';

const CSS_ENTRY_FILE = CACHE_FOLDER + '/bundle.css';
const BUILD_META_ENV = 'FLUENTIC_STYLE_NEXT_BUILD_META';
const SIDECAR_URL_ENV = 'FLUENTIC_STYLE_NEXT_SIDECAR_URL';

export const CSS_MARKER = getExtractedCssMarker();

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
    namespace: PRECOLLECT_NAMESPACE,
  });

  let sidecar: SourcemapSidecar | null = null;

  if (dev) {
    const buildMeta = createNextBuildMeta(dev, options);
    const configHash = createFileCssConfigHash(buildMeta);

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
  const phaseBuildMeta = createNextBuildMeta(dev, options);
  const phaseConfigHash = createFileCssConfigHash(phaseBuildMeta);

  const devCssHref = dev && sidecar
    ? sidecar.getRouteUrl(DEV_CSS_ROUTE)
    : null;

  const turbopackCompilerId = createCompilerId('turbopack');

  const turbopackState = createPluginCompiler({
    projectDir,
    cacheDir,
    options: resolveNextCompilerOptions(options, sidecar, phaseBuildMeta),
    dev,
  });

  const turbopackCssAliases = createCssAliases({
    writeFile: (fileName, content) => writeCacheFile(getImportableCssCacheDir(projectDir), fileName, content),
  });
  const turbopackRuntimeAliases = getTurbopackRuntimeImportAliases(phaseBuildMeta);

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
    env: {
      ...nextConfig.env,
      [BUILD_META_ENV]: JSON.stringify(phaseBuildMeta),
      [SIDECAR_URL_ENV]: dev && sidecar ? sidecar.getBaseUrl() ?? '' : '',
    },
    compiler: {
      ...originalCompiler,
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
      buildMeta: phaseBuildMeta,
      cacheDir,
      compilerId: turbopackCompilerId,
      configHash: phaseConfigHash,
      cssAliases: turbopackCssAliases,
      runtimeAliases: turbopackRuntimeAliases,
      dev,
      devCssHref,
      projectDir,
    }),
    webpack(config: WebpackConfiguration, context: WebpackConfigContext) {
      if (typeof originalWebpack === 'function') {
        config = originalWebpack(config, context);
      }

      const buildMeta = createNextBuildMeta(context.dev, options);

      const state = createPluginCompiler({
        projectDir: context.dir ?? process.cwd(),
        cacheDir,
        options: resolveNextCompilerOptions(options, sidecar, buildMeta),
        dev: context.dev,
      });

      extractCompilers.push(state.compiler);

      const compilerId = createCompilerId(context.isServer ? 'server' : 'client');

      const cssAliases = createCssAliases({
        writeFile: (fileName, content) => writePluginCacheFile(state, fileName, content),
      });

      nextRegistry.setEntry<NextLoaderState>(compilerId, {
        compiler: state.compiler,
        filter: state.filter,
        configHash: createFileCssConfigHash(buildMeta),
        cssCache: context.dev ? cssCache : null,
        cssEntryImportPath: CSS_ENTRY_IMPORT_PATH,
        dev: context.dev,
        devCssHref,
        isServer: context.isServer,
      });

      addAliases(config, {
        ...cssAliases,
        ...(context.isServer
          ? getWebpackServerRuntimeImportAliases(buildMeta)
          : getRuntimeImportAliases(buildMeta)),
      });

      addTransformLoader(config, options, compilerId);

      if (!context.isServer) {
        config.entry = prependClientEntry(config.entry, CLIENT_ENTRY_IMPORT_PATH);

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

export function getTurbopackRuntimeImportAliases(
  buildMeta: ReturnType<typeof createNextBuildMeta>,
) {
  const serverAliases = getServerRuntimeImportAliases(buildMeta);
  const aliases = {
    ...getRuntimeImportAliases(buildMeta),
    ...serverAliases,
  };

  // Turbopack resolve aliases are shared by client and server graphs, so keep
  // the package root target-neutral and let exact import rewriting handle it.
  delete aliases['@fluentic/style'];

  return aliases;
}

function getWebpackServerRuntimeImportAliases(
  buildMeta: ReturnType<typeof createNextBuildMeta>,
) {
  const aliases = getServerRuntimeImportAliases(buildMeta);
  const rootAlias = aliases['@fluentic/style'];

  if (!rootAlias) return aliases;

  const exactAliases = { ...aliases };
  delete exactAliases['@fluentic/style'];
  exactAliases['@fluentic/style$'] = rootAlias;

  return exactAliases;
}

function createCssAliases(args: {
  writeFile: (fileName: string, content: string) => string;
}): Record<string, string> {
  return {
    [CSS_ENTRY_IMPORT_PATH]: args.writeFile(CSS_ENTRY_FILE, CSS_MARKER),
  };
}

function getImportableCssCacheDir(projectDir: string) {
  return path.join(projectDir, PLUGIN_CACHE_DIR);
}

function createTurbopackConfig(
  originalTurbopack: TurbopackConfig,
  args: {
    buildMeta: ReturnType<typeof createNextBuildMeta>;
    cacheDir: string;
    compilerId: string;
    configHash: string;
    cssAliases: Record<string, string>;
    runtimeAliases: Record<string, string>;
    dev: boolean;
    devCssHref: string | null;
    projectDir: string;
  },
): TurbopackConfig {
  const resolveAlias: TurbopackResolveAlias = {
    ...originalTurbopack.resolveAlias,
    ...args.cssAliases,
    ...args.runtimeAliases,
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
    buildMeta: ReturnType<typeof createNextBuildMeta>;
    cacheDir: string;
    compilerId: string;
    configHash: string;
    cssAliases: Record<string, string>;
    runtimeAliases: Record<string, string>;
    dev: boolean;
    devCssHref: string | null;
    projectDir: string;
  },
): TurbopackRules {
  const loaderItem: TurbopackLoaderItem = {
    loader: LOADER_IMPORT_PATH,
    options: removeUndefinedValues({
      buildMeta: args.buildMeta,
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
    test: /\.[cm]?[jt]sx?$/,
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
      marker: CSS_MARKER,
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
    if (!source.includes(CSS_MARKER)) continue;

    fs.writeFileSync(filePath, source.split(CSS_MARKER).join(args.css), 'utf8');
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
