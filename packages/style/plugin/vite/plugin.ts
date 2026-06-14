import { createRequire } from 'node:module';
import type { OutputAsset } from 'rolldown';
import type { Plugin, ResolvedConfig } from 'vite';
import {
  BUILD_META_IMPORT_PATH,
  createPluginCompiler,
  CSS_MARKER,
  CSS_MODULE_ID,
  getPluginCacheDir,
  invalidateFiles,
  PLUGIN_NAME,
  type PluginCompiler,
  type PluginCssOptions,
  type PluginOptions,
  RESOLVED_CSS_MODULE_ID,
  RESOLVED_RUNTIME_MODULE_ID,
  resolvePluginSourcemapFilePath,
  RUNTIME_MODULE_ID,
} from '../utils';
import {
  createRuntimeModuleSource,
  getBuildMeta,
  getRuntimeImportAliases,
  hasCssMarker,
  isVirtualModuleRequest,
  replaceCssMarker,
} from '../utils/bundler';
import { formatError } from '../utils/misc';
import type { SourcemapSidecar } from '../utils/sidecar';
import { getSourcemapSidecar } from '../utils/sidecar';
import { resolveDevSourcemapMode } from '../utils/sourcemap';

export type { PluginCssOptions, PluginOptions };

export default plugin;

const require = createRequire(import.meta.url);
const BUILD_META_RESOLVED_ID = require.resolve(BUILD_META_IMPORT_PATH);

export function plugin(options: PluginOptions = {}): Plugin {
  let config: ResolvedConfig | null = null;
  let state: PluginCompiler | null = null;
  let sourcemapSidecar: SourcemapSidecar | null = null;

  const getState = () => {
    if (!config) {
      throw new Error(formatError('Vite config has not been resolved yet.'));
    }

    if (state) return state;

    const cacheDir = getPluginCacheDir(config.root, options.cacheDir);

    const devSourcemap = resolveDevSourcemapMode(
      options.devSourcemap,
      config.command === 'serve',
    );

    if (!sourcemapSidecar && devSourcemap === 'sidecarServer') {
      sourcemapSidecar = getSourcemapSidecar({
        projectDir: config.root,
        cacheDir,
      });
    }

    state = createPluginCompiler({
      dev: config.command === 'serve',
      projectDir: config.root,
      cacheDir,
      options: {
        ...options,
        devSourcemap,
        getSourcemapFilePath: resolvePluginSourcemapFilePath(
          options.getSourcemapFilePath,
          sourcemapSidecar,
        ),
      },
    });

    return state;
  };

  return {
    name: PLUGIN_NAME,
    enforce: 'pre',

    config(_config, env) {
      return {
        resolve: {
          alias: getRuntimeImportAliases(
            getBuildMeta(env.command === 'serve', options),
          ),
        },
      };
    },

    configResolved(resolvedConfig) {
      config = resolvedConfig;
    },

    async buildStart() {
      getState();
      await sourcemapSidecar?.ensureStarted();
    },

    resolveId(id) {
      if (id === BUILD_META_IMPORT_PATH) {
        return BUILD_META_RESOLVED_ID;
      }

      if (isVirtualModuleRequest(id, RUNTIME_MODULE_ID)) {
        return RESOLVED_RUNTIME_MODULE_ID;
      }

      if (isVirtualModuleRequest(id, CSS_MODULE_ID)) {
        return RESOLVED_CSS_MODULE_ID;
      }
    },

    load(id) {
      if (isVirtualModuleRequest(id, RUNTIME_MODULE_ID)) {
        return createRuntimeModuleSource(
          getBuildMeta(getState().dev, options),
          CSS_MODULE_ID,
        );
      }

      if (isVirtualModuleRequest(id, CSS_MODULE_ID)) {
        return CSS_MARKER;
      }
    },

    handleHotUpdate(ctx) {
      const current = state;
      if (!current) return;

      invalidateFiles(current.compiler, [ctx.file]);
      current.filter.clear();
    },

    transformIndexHtml: {
      order: 'pre',
      handler() {
        return [
          {
            tag: 'script',
            attrs: { type: 'module' },
            children: `import ${JSON.stringify(RUNTIME_MODULE_ID)};`,
            injectTo: 'head-prepend',
          },
        ];
      },
    },

    async transform(code, id) {
      const current = getState();
      await sourcemapSidecar?.ensureStarted();

      if (!current.filter(id)) return null;

      const result = current.transform(code, id);
      if (!result) return null;

      return {
        code: result.code,
        map: result.map ? JSON.parse(result.map) : null,
      };
    },

    generateBundle(_, bundle) {
      if (!config || config.command === 'serve') return;

      const css = getState().compiler.getExtractedCss();
      if (!css) return;

      let cssAsset: OutputAsset | null = null;

      for (const item of Object.values(bundle)) {
        if (item.type !== 'asset') continue;
        if (!item.fileName.endsWith('.css')) continue;
        if (typeof item.source !== 'string') continue;

        if (!cssAsset && item.source) cssAsset = item;

        if (hasCssMarker(item.source)) {
          item.source = replaceCssMarker(item.source, css);
          return;
        }
      }

      if (cssAsset) {
        cssAsset.source = cssAsset.source ? `${cssAsset.source}\n${css}` : css;
        return;
      }

      this.warn(formatError(
        'No CSS asset was emitted by Vite, so extracted CSS could not be attached. ' +
          'Import a CSS file from your app entry/root layout so Vite owns the output filename and hashing.',
      ));
    },
  };
}
