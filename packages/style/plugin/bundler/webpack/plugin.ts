import type { Compiler, RuleSetRule, WebpackPluginInstance } from 'webpack';
import {
  BUNDLE_CSS_FILE,
  createPluginCompiler,
  DEFAULT_TRANSFORM_EXCLUDE,
  DEFAULT_TRANSFORM_INCLUDE,
  EXTRACTED_CSS_MARKER,
  getPluginCacheDir,
  invalidateFiles,
  PLUGIN_NAME,
  type PluginOptions,
  resolvePluginSourcemapFilePath,
  writePluginCacheFile,
} from '../../utils';
import { formatError } from '../../utils/misc';
import {
  getPluginBuildConfig,
  getPluginBuildDevConfig,
  getStyleEntryDefines,
  getStyleRuntimeMode,
} from '../../utils/runtimeEntry';
import { getSourcemapSidecar } from '../../utils/sidecar';
import { resolveDevSourcemapMode } from '../../utils/sourcemap';
import {
  createWebpackRuntimeModuleSource,
  getStylePackageDistPath,
  getTransformLoaderPath,
  hasWebpackCssMarker,
  prependWebpackRuntimeEntry,
  replaceWebpackCssMarker,
  type WebpackLoaderState,
  webpackRegistry,
} from './utils';

export type { PluginOptions };

const WEBPACK_RUNTIME_FILE = 'webpack-runtime.js';

export default plugin;

export function plugin(options: PluginOptions = {}) {
  return new WebpackPlugin(options);
}

class WebpackPlugin implements WebpackPluginInstance {
  private readonly options: PluginOptions;

  constructor(options: PluginOptions = {}) {
    this.options = options;
  }

  apply(compiler: Compiler) {
    const dev = compiler.options.mode === 'development';
    const extract = !dev;

    const buildConfig = getPluginBuildConfig(this.options);
    const buildDevConfig = getPluginBuildDevConfig(this.options);
    const cacheDir = getPluginCacheDir(compiler.context, this.options.cacheDir);
    const devSourcemap = resolveDevSourcemapMode(this.options.devSourcemap, dev);

    const sourcemapSidecar = devSourcemap === 'sidecarServer'
      ? getSourcemapSidecar({ projectDir: compiler.context, cacheDir })
      : null;

    const getSourcemapFilePath = resolvePluginSourcemapFilePath(
      this.options.getSourcemapFilePath,
      sourcemapSidecar,
    );

    const state = createPluginCompiler({
      projectDir: compiler.context,
      cacheDir,
      dev,
      options: { ...this.options, devSourcemap, getSourcemapFilePath },
      runtimeMode: getStyleRuntimeMode(dev),
    });

    const cssFilePath = extract
      ? writePluginCacheFile(state, BUNDLE_CSS_FILE, EXTRACTED_CSS_MARKER)
      : null;

    const runtimeFilePath = writePluginCacheFile(
      state,
      WEBPACK_RUNTIME_FILE,
      createWebpackRuntimeModuleSource(extract, cssFilePath),
    );

    const compilerId = createCompilerId();

    webpackRegistry.setEntry<WebpackLoaderState>(compilerId, {
      compiler: state.compiler,
      dev,
    });

    compiler.options.entry = prependWebpackRuntimeEntry(
      compiler.options.entry,
      runtimeFilePath,
    );

    addTransformLoader(compiler, this.options, compilerId);
    const entryDefines = getStyleEntryDefines(buildConfig, buildDevConfig, dev);

    compiler.options.plugins ??= [];
    compiler.options.plugins.push(
      new compiler.webpack.DefinePlugin(entryDefines),
    );

    compiler.hooks.beforeRun.tapPromise(PLUGIN_NAME, async () => {
      await sourcemapSidecar?.ensureStarted();
      Object.assign(entryDefines, getStyleEntryDefines(
        buildConfig,
        buildDevConfig,
        dev,
        sourcemapSidecar?.getBaseUrl(),
      ));
      writePluginCacheFile(
        state,
        WEBPACK_RUNTIME_FILE,
        createWebpackRuntimeModuleSource(extract, cssFilePath),
      );
    });

    compiler.hooks.watchRun.tapPromise(PLUGIN_NAME, async (watchCompiler) => {
      await sourcemapSidecar?.ensureStarted();
      Object.assign(entryDefines, getStyleEntryDefines(
        buildConfig,
        buildDevConfig,
        dev,
        sourcemapSidecar?.getBaseUrl(),
      ));
      writePluginCacheFile(
        state,
        WEBPACK_RUNTIME_FILE,
        createWebpackRuntimeModuleSource(extract, cssFilePath),
      );

      const files = watchCompiler.modifiedFiles;
      if (!files || !files.size) return;

      invalidateFiles(state.compiler, files);
      state.filter.clear();
    });

    compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation) => {
      if (dev) return;

      compilation.hooks.processAssets.tap(
        {
          name: PLUGIN_NAME,
          stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONS,
        },
        () => {
          const css = state.compiler.getExtractedCss();
          if (!css) return;

          for (const asset of compilation.getAssets()) {
            if (!asset.name.endsWith('.css')) continue;

            const source = asset.source.source().toString();
            if (!hasWebpackCssMarker(source, EXTRACTED_CSS_MARKER)) continue;

            compilation.updateAsset(
              asset.name,
              new compiler.webpack.sources.RawSource(
                replaceWebpackCssMarker(source, EXTRACTED_CSS_MARKER, css),
              ),
            );

            return;
          }

          compilation.warnings.push(
            new Error(formatError(
              'No CSS asset containing the Fluentic marker was emitted by Webpack, so extracted CSS could not be attached. ' +
                'Make sure your Webpack config handles CSS imports so Webpack owns the output filename, hashing, and runtime loading.',
            )),
          );
        },
      );
    });
  }
}

function addTransformLoader(
  compiler: Compiler,
  options: PluginOptions,
  compilerId: string,
) {
  const loader = {
    loader: getTransformLoaderPath(),
    options: { ...options, compilerId },
  };

  const rule: RuleSetRule = {
    use: [loader],
    enforce: 'pre',
    test: DEFAULT_TRANSFORM_INCLUDE,
    exclude: options.include ? undefined : [
      DEFAULT_TRANSFORM_EXCLUDE,
      getStylePackageDistPath(),
    ],
  };

  compiler.options.module.rules.unshift(rule);
}

let nextCompilerId = 0;

function createCompilerId() {
  return `${PLUGIN_NAME}-${nextCompilerId++}`;
}
