import type { Compiler, RuleSetRule, WebpackPluginInstance } from 'webpack';
import { getStyleRuntimeImportPath } from '../../../compiler/utils/imports';
import {
  BUNDLE_CSS_FILE,
  createCompilerId,
  createPluginCompiler,
  DEFAULT_TRANSFORM_EXCLUDE,
  DEFAULT_TRANSFORM_INCLUDE,
  EXTRACTED_CSS_MARKER,
  getPluginCacheDir,
  invalidateFiles,
  PLUGIN_NAME,
  type PluginOptions,
  resolvePluginSourcemapFilePath,
  transformCssOutput,
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

    const runtimeMode = getStyleRuntimeMode(dev);
    const useRuntimeSidecarUrl = isRspackCompiler(compiler) && devSourcemap === 'sidecarServer';

    const createRuntimeSource = (sidecarUrl: string | null = null) =>
      createWebpackRuntimeModuleSource(
        extract,
        cssFilePath,
        useRuntimeSidecarUrl
          ? {
            runtimeImportPath: getStyleRuntimeImportPath(runtimeMode),
            sidecarUrl,
          }
          : undefined,
      );

    const state = createPluginCompiler({
      projectDir: compiler.context,
      cacheDir,
      dev,
      options: { ...this.options, devSourcemap, getSourcemapFilePath },
      runtimeMode,
    });

    const cssFilePath = extract
      ? writePluginCacheFile(state, BUNDLE_CSS_FILE, EXTRACTED_CSS_MARKER)
      : null;

    const runtimeFilePath = writePluginCacheFile(
      state,
      WEBPACK_RUNTIME_FILE,
      createRuntimeSource(),
    );

    const compilerId = createCompilerId('webpack');

    webpackRegistry.setEntry<WebpackLoaderState>(compilerId, {
      transform: state.transform,
    });

    compiler.options.entry = prependWebpackRuntimeEntry(
      compiler.options.entry,
      runtimeFilePath,
    );

    addTransformLoader(compiler, this.options, compilerId);

    const entryDefines = getStyleEntryDefines(buildConfig, buildDevConfig, null);

    compiler.options.plugins ??= [];
    compiler.options.plugins.push(
      new compiler.webpack.DefinePlugin(entryDefines),
    );

    compiler.hooks.beforeRun.tapPromise(PLUGIN_NAME, async () => {
      await sourcemapSidecar?.ensureStarted();

      Object.assign(
        entryDefines,
        getStyleEntryDefines(
          buildConfig,
          buildDevConfig,
          sourcemapSidecar?.getBaseUrl() || null,
        ),
      );
      writePluginCacheFile(
        state,
        WEBPACK_RUNTIME_FILE,
        createRuntimeSource(sourcemapSidecar?.getBaseUrl() || null),
      );
    });

    compiler.hooks.watchRun.tapPromise(PLUGIN_NAME, async (watchCompiler) => {
      await sourcemapSidecar?.ensureStarted();
      Object.assign(
        entryDefines,
        getStyleEntryDefines(
          buildConfig,
          buildDevConfig,
          sourcemapSidecar?.getBaseUrl() || null,
        ),
      );
      writePluginCacheFile(
        state,
        WEBPACK_RUNTIME_FILE,
        createRuntimeSource(sourcemapSidecar?.getBaseUrl() || null),
      );

      const files = watchCompiler.modifiedFiles;
      if (!files || !files.size) return;

      invalidateFiles(state.compiler, files);
      state.filter.clear();
    });

    compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation) => {
      if (dev) return;

      compilation.hooks.processAssets.tapPromise(
        {
          name: PLUGIN_NAME,
          stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONS,
        },
        async () => {
          const css = await transformCssOutput(
            state.compiler.getExtractedCss(),
            this.options.cssOutput,
            BUNDLE_CSS_FILE,
          );
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

function isRspackCompiler(compiler: Compiler) {
  const webpack = compiler.webpack as typeof compiler.webpack & {
    rspackVersion?: unknown;
  };

  return typeof webpack.rspackVersion === 'string';
}
