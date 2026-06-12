import type { Compiler, RuleSetRule, WebpackPluginInstance } from 'webpack';
import type { BuildMeta } from '../../config';
import {
  createPluginCompiler,
  DEFAULT_TRANSFORM_EXCLUDE,
  getExtractedCssMarker,
  getPluginCacheDir,
  invalidateFiles,
  PLUGIN_NAME,
  type PluginOptions,
  resolvePluginSourcemapFilePath,
  writePluginCacheFile,
} from '../utils';
import { formatError } from '../utils/misc';
import { getSourcemapSidecar } from '../utils/sidecar';
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

const WEBPACK_CSS_FILE = 'webpack.css';
const WEBPACK_RUNTIME_FILE = 'webpack-runtime.js';

const WEBPACK_CSS_MARKER = getExtractedCssMarker();

function getBuildMeta(dev: boolean, options: PluginOptions): BuildMeta {
  return {
    dev,
    extract: !dev,
    rsc: false,
    css: options.css ?? null,
  };
}

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

    const buildMeta = getBuildMeta(dev, this.options);
    const cacheDir = getPluginCacheDir(compiler.context, this.options.cacheDir);

    const sourcemapSidecar = this.options.devSourcemap === 'sidecarServer'
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
      options: { ...this.options, getSourcemapFilePath },
    });

    const cssFilePath = buildMeta.extract
      ? writePluginCacheFile(state, WEBPACK_CSS_FILE, WEBPACK_CSS_MARKER)
      : null;

    const runtimeFilePath = writePluginCacheFile(
      state,
      WEBPACK_RUNTIME_FILE,
      createWebpackRuntimeModuleSource(buildMeta, cssFilePath),
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

    compiler.hooks.beforeRun.tapPromise(PLUGIN_NAME, async () => {
      await sourcemapSidecar?.ensureStarted();
    });

    compiler.hooks.watchRun.tapPromise(PLUGIN_NAME, async (watchCompiler) => {
      await sourcemapSidecar?.ensureStarted();

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
            if (!hasWebpackCssMarker(source, WEBPACK_CSS_MARKER)) continue;

            compilation.updateAsset(
              asset.name,
              new compiler.webpack.sources.RawSource(
                replaceWebpackCssMarker(source, WEBPACK_CSS_MARKER, css),
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
    test: /\.[cm]?[jt]sx?$/,
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
