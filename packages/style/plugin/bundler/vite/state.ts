import path from 'node:path';
import type { ConfigEnv, ResolvedConfig, UserConfig } from 'vite';
import { normalizePath } from '../../../compiler/utils/path';
import {
  BUNDLE_CSS_FILE,
  createPluginCompiler,
  EXTRACTED_CSS_MARKER,
  getPluginCacheDir,
  getPluginBuildConfig,
  getPluginBuildDevConfig,
  type PluginCompiler,
  type PluginOptions,
  resolvePluginSourcemapFilePath,
  writePluginCacheFile,
} from '../../utils';
import { formatError } from '../../utils/misc';
import { getStyleEntryDefines, getStyleRuntimeMode } from '../../utils/runtimeEntry';
import type { SourcemapSidecar } from '../../utils/sidecar';
import { getSourcemapSidecar } from '../../utils/sidecar';
import { resolveDevSourcemapMode } from '../../utils/sourcemap';
import { RUNTIME_MODULE_ID } from '../../utils/virtual';

export function createVitePluginState(options: PluginOptions) {
  let config: ResolvedConfig | null = null;
  let state: PluginCompiler | null = null;
  let sidecar: SourcemapSidecar | null = null;

  return {
    setConfig(value: ResolvedConfig) {
      config = value;
    },

    getCurrentState() {
      return state;
    },

    isServe() {
      return config?.command === 'serve';
    },

    async getConfig(config: UserConfig, env: ConfigEnv) {
      const dev = env.command === 'serve';
      const buildConfig = getPluginBuildConfig(options);
      const buildDevConfig = getPluginBuildDevConfig(options);
      const sidecarUrl = await getSidecarUrl(dev, getViteRoot(config));

      return {
        define: getStyleEntryDefines(buildConfig, buildDevConfig, sidecarUrl),
      };
    },

    getHtmlEntryScript() {
      if (this.isServe()) return [];

      return [{
        tag: 'script',
        attrs: { type: 'module' },
        children: `import ${JSON.stringify(RUNTIME_MODULE_ID)};`,
        injectTo: 'head-prepend' as const,
      }];
    },

    loadRuntimeModule() {
      const current = this.getState();

      if (current.dev) return 'export {};';

      const cssFilePath = writePluginCacheFile(current, BUNDLE_CSS_FILE, EXTRACTED_CSS_MARKER);

      return `import ${JSON.stringify(toViteFsImport(cssFilePath))};\n`;
    },

    async ensureSidecarStarted() {
      await sidecar?.ensureStarted();
    },

    getState() {
      if (!config) {
        throw new Error(formatError('Vite config has not been resolved yet.'));
      }

      if (state) return state;

      const dev = config.command === 'serve';
      const cacheDir = getPluginCacheDir(config.root, options.cacheDir);
      const devSourcemap = resolveDevSourcemapMode(options.devSourcemap, dev);

      ensureSidecar(dev, config.root);

      state = createPluginCompiler({
        dev,
        projectDir: config.root,
        cacheDir,
        options: {
          ...options,
          devSourcemap,
          getSourcemapFilePath: resolvePluginSourcemapFilePath(
            options.getSourcemapFilePath,
            sidecar,
          ),
        },
        runtimeMode: getStyleRuntimeMode(dev),
      });

      return state;
    },
  };

  async function getSidecarUrl(dev: boolean, root: string) {
    const current = ensureSidecar(dev, root);

    await current?.ensureStarted();

    return current?.getBaseUrl() ?? '';
  }

  function ensureSidecar(dev: boolean, root: string) {
    if (!dev) return null;

    const devSourcemap = resolveDevSourcemapMode(options.devSourcemap, true);
    if (devSourcemap !== 'sidecarServer') return null;

    if (!sidecar) {
      sidecar = createViteSidecar({ options, root });
    }

    return sidecar;
  }
}

function createViteSidecar(args: {
  options: PluginOptions;
  root: string;
}) {
  return getSourcemapSidecar({
    projectDir: args.root,
    cacheDir: getPluginCacheDir(args.root, args.options.cacheDir),
  });
}

function getViteRoot(config: Pick<UserConfig | ResolvedConfig, 'root'>) {
  return path.resolve(config.root ?? process.cwd());
}

function toViteFsImport(filePath: string) {
  const normalized = normalizePath(filePath);

  return normalized.startsWith('/')
    ? `/@fs${normalized}`
    : `/@fs/${normalized}`;
}
