import type { Plugin } from 'vite';
import {
  invalidateFiles,
  PLUGIN_NAME,
  type PluginCssOptions,
  type PluginOptions,
  transformCssOutput,
} from '../../utils';
import { hasCssMarker, replaceCssMarker } from '../../utils/cssMarker';
import { formatError } from '../../utils/misc';
import { getVirtualModuleId, RESOLVED_RUNTIME_MODULE_ID } from '../../utils/virtual';
import { createVitePluginState } from './state';

export type { PluginCssOptions, PluginOptions };

type CssAsset = {
  source: string;
};

export default plugin;

export function plugin(options: PluginOptions = {}): Plugin {
  const state = createVitePluginState(options);

  return {
    name: PLUGIN_NAME,
    enforce: 'pre',

    async config(config, env) {
      return state.getConfig(config, env);
    },

    configResolved(resolvedConfig) {
      state.setConfig(resolvedConfig);
    },

    async buildStart() {
      state.getState();
      await state.ensureSidecarStarted();
    },

    resolveId(id) {
      return getVirtualModuleId(id);
    },

    async load(id) {
      if (getVirtualModuleId(id) === RESOLVED_RUNTIME_MODULE_ID) {
        await state.ensureSidecarStarted();
        return state.loadRuntimeModule();
      }
    },

    handleHotUpdate(ctx) {
      const current = state.getCurrentState();
      if (!current) return;

      invalidateFiles(current.compiler, [ctx.file]);
      current.filter.clear();
    },

    transformIndexHtml: {
      order: 'pre',
      handler() {
        return state.getHtmlEntryScript();
      },
    },

    async transform(code, id) {
      const current = state.getState();
      await state.ensureSidecarStarted();

      if (!current.filter(id)) return null;

      let result: ReturnType<typeof current.transform>;
      try {
        result = current.transform(code, id);
      } catch (error) {
        this.error(toCleanViteError(error, id));
      }
      if (!result) return null;

      return {
        code: result.code,
        map: result.map ? JSON.parse(result.map) : null,
      };
    },

    async generateBundle(_, bundle) {
      if (state.isServe()) return;

      const css = await transformCssOutput(
        state.getState().compiler.getExtractedCss(),
        options.cssOutput,
        'fluentic-style.css',
      );
      if (!css) return;

      let cssAsset: CssAsset | null = null;

      for (const item of Object.values(bundle)) {
        if (item.type !== 'asset') continue;
        if (!item.fileName.endsWith('.css')) continue;
        if (typeof item.source !== 'string') continue;

        if (!cssAsset && item.source) cssAsset = item as CssAsset;

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

function toCleanViteError(error: unknown, id: string) {
  const message = error instanceof Error ? error.message : String(error);

  return {
    id,
    message,
    stack: '',
  };
}
