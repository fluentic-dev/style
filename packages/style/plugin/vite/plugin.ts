import type { OutputAsset } from 'rolldown';
import type { Plugin, ResolvedConfig } from 'vite';
import type { BuildMeta } from '../../config';
import {
  createPluginCompiler,
  getExtractedCssMarker,
  getPluginCacheDir,
  invalidateFiles,
  PLUGIN_NAME,
  type PluginCompiler,
  type PluginOptions,
  resolvePluginSourcemapFilePath,
} from '../utils';
import { formatError } from '../utils/misc';
import type { SourcemapSidecar } from '../utils/sidecar';
import { getSourcemapSidecar } from '../utils/sidecar';
import { resolveDevSourcemapMode } from '../utils/sourcemap';
import {
  createRuntimeModuleSource,
  hasVirtualCssMarker,
  isVirtualModuleRequest,
  replaceVirtualCssMarker,
} from './utils';

export type { PluginOptions };

const RUNTIME_MODULE_ID = 'virtual:fluentic-style';

const CSS_MODULE_ID = `${RUNTIME_MODULE_ID}.css`;

const VIRTUAL_CSS_MARKER = getExtractedCssMarker();

function getBuildMeta(dev: boolean, options: PluginOptions): BuildMeta {
  return {
    dev,
    extract: !dev,
    rsc: false,
    css: options.css ?? null,
  };
}

export default plugin;

export function plugin(options: PluginOptions = {}): Plugin {
  let config: ResolvedConfig | null = null;
  let state: PluginCompiler | null = null;
  let sourcemapSidecar: SourcemapSidecar | null = null;

  const resolvedRuntimeModuleId = `\0${RUNTIME_MODULE_ID}`;
  const resolvedCssModuleId = `\0${CSS_MODULE_ID}`;

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

    configResolved(resolvedConfig) {
      config = resolvedConfig;
    },

    async buildStart() {
      getState();
      await sourcemapSidecar?.ensureStarted();
    },

    resolveId(id) {
      if (isVirtualModuleRequest(id, RUNTIME_MODULE_ID)) {
        return resolvedRuntimeModuleId;
      }

      if (isVirtualModuleRequest(id, CSS_MODULE_ID)) {
        return resolvedCssModuleId;
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
        return VIRTUAL_CSS_MARKER;
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

        if (hasVirtualCssMarker(item.source, VIRTUAL_CSS_MARKER)) {
          item.source = replaceVirtualCssMarker(item.source, VIRTUAL_CSS_MARKER, css);
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
