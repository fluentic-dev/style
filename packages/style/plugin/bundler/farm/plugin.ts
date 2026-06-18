import path from 'node:path';
import {
  createPluginCompiler,
  DEFAULT_TRANSFORM_INCLUDE_PATTERN,
  getPluginCacheDir,
  invalidateFiles,
  PLUGIN_NAME,
  type PluginCompiler,
  type PluginOptions,
  resolvePluginSourcemapFilePath,
} from '../../utils';
import {
  getPluginBuildConfig,
  getPluginBuildDevConfig,
  getStyleEntryDefines,
  getStyleRuntimeMode,
} from '../../utils/runtimeEntry';
import { getSourcemapSidecar, type SourcemapSidecar } from '../../utils/sidecar';
import { parseBundlerSourceMap, resolveDevSourcemapMode } from '../../utils/sourcemap';
import {
  CSS_MODULE_ID,
  isVirtualModuleRequest,
  loadVirtualModule,
  RUNTIME_MODULE_ID,
  VIRTUAL_MODULE_REQUEST_PATTERN,
} from '../../utils/virtual';

export type FarmPluginOptions = PluginOptions & {
  dev?: boolean;
};

export type { FarmPluginOptions as PluginOptions };

type FarmUserConfig = {
  compilation?: {
    define?: Record<string, unknown>;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

export default plugin;

export function plugin(options: FarmPluginOptions = {}) {
  const dev = options.dev ?? false;
  const extract = !dev;
  const buildConfig = getPluginBuildConfig(options);
  const buildDevConfig = getPluginBuildDevConfig(options);
  const projectDir = process.cwd();
  const cacheDir = getPluginCacheDir(projectDir, options.cacheDir);

  let state: PluginCompiler | null = null;
  let sourcemapSidecar: SourcemapSidecar | null = null;

  const ensureSidecar = () => {
    const devSourcemap = resolveDevSourcemapMode(options.devSourcemap, dev);

    if (!sourcemapSidecar && devSourcemap === 'sidecarServer') {
      sourcemapSidecar = getSourcemapSidecar({ projectDir, cacheDir });
    }

    return devSourcemap;
  };

  const getState = () => {
    if (state) return state;

    const devSourcemap = ensureSidecar();

    const getSourcemapFilePath = resolvePluginSourcemapFilePath(
      options.getSourcemapFilePath,
      sourcemapSidecar,
    );

    const pluginOptions: PluginOptions = {
      ...options,
      devSourcemap,
      getSourcemapFilePath,
    };

    state = createPluginCompiler({
      projectDir,
      cacheDir,
      dev,
      options: pluginOptions,
      runtimeMode: getStyleRuntimeMode(dev),
    });

    return state;
  };

  return {
    name: PLUGIN_NAME,
    priority: 101,

    async config(config: FarmUserConfig) {
      ensureSidecar();
      await sourcemapSidecar?.ensureStarted();

      return {
        ...config,
        compilation: {
          ...config.compilation,
          define: {
            ...config.compilation?.define,
            ...getStyleEntryDefines(
              buildConfig,
              buildDevConfig,
              dev,
              sourcemapSidecar?.getBaseUrl(),
            ),
          },
        },
      };
    },

    buildStart: {
      async executor() {
        getState();
        await sourcemapSidecar?.ensureStarted();
      },
    },

    resolve: {
      filters: {
        sources: [VIRTUAL_MODULE_REQUEST_PATTERN],
        importers: ['.*'],
      },
      executor(params: { source: string; }) {
        if (
          !isVirtualModuleRequest(params.source, RUNTIME_MODULE_ID) &&
          !isVirtualModuleRequest(params.source, CSS_MODULE_ID)
        ) return null;

        return {
          resolvedPath: params.source,
          sideEffects: true,
          external: false,
          meta: {},
        };
      },
    },

    load: {
      filters: { resolvedPaths: [VIRTUAL_MODULE_REQUEST_PATTERN] },
      executor(params: { resolvedPath: string; }) {
        const content = loadVirtualModule(
          params.resolvedPath,
          extract,
          extract ? CSS_MODULE_ID : null,
        );

        if (content == null) return null;

        return {
          content,
          moduleType: params.resolvedPath.endsWith('.css') ? 'css' : 'js',
        };
      },
    },

    transform: {
      filters: {
        resolvedPaths: [DEFAULT_TRANSFORM_INCLUDE_PATTERN],
        moduleTypes: ['.*'],
      },
      async executor(
        params: {
          content: string;
          resolvedPath: string;
          query?: Array<[string, string]>;
          sourceMap?: string;
        },
      ) {
        const current = getState();
        await sourcemapSidecar?.ensureStarted();

        const id = appendQuery(params.resolvedPath, params.query);
        const result = current.transform(
          params.content,
          id,
          parseBundlerSourceMap(params.sourceMap),
        );

        if (!result) return null;

        return {
          content: result.code,
          moduleType: getModuleType(params.resolvedPath),
          sourceMap: result.map ?? undefined,
        };
      },
    },

    updateModules: {
      executor(param: { paths?: Array<[string, number | string]>; }) {
        const current = state;
        const files = param.paths?.map((item) => item[0]) ?? [];
        if (!current || !files.length) return;

        invalidateFiles(current.compiler, files);
        current.filter.clear();
      },
    },

  };
}

function appendQuery(id: string, query: Array<[string, string]> | undefined) {
  if (!query?.length) return id;

  const params = new URLSearchParams(query);
  return `${id}?${params.toString()}`;
}

function getModuleType(filePath: string) {
  const ext = path.extname(filePath);

  if (ext === '.tsx') return 'tsx';
  if (ext === '.ts' || ext === '.mts' || ext === '.cts') return 'ts';
  if (ext === '.jsx') return 'jsx';
  return 'js';
}
