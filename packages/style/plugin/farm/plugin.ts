import path from 'node:path';
import {
  createPluginCompiler,
  getPluginCacheDir,
  invalidateFiles,
  PLUGIN_NAME,
  type PluginCompiler,
  type PluginOptions,
  resolvePluginSourcemapFilePath,
} from '../utils';
import {
  CSS_ASSET_FILE,
  CSS_MODULE_ID,
  getBuildMeta,
  getExtractedCss,
  isVirtualModuleRequest,
  loadVirtualModule,
  RUNTIME_MODULE_ID,
} from '../utils/bundler';
import { getSourcemapSidecar, type SourcemapSidecar } from '../utils/sidecar';
import { parseBundlerSourceMap, resolveDevSourcemapMode } from '../utils/sourcemap';

export type FarmPluginOptions = PluginOptions & {
  dev?: boolean;
};

export type { FarmPluginOptions as PluginOptions };

type FarmContext = {
  emitFile?: (file: {
    resolvedPath: string;
    name: string;
    content: number[];
    resourceType: string;
  }) => void;
};

export default plugin;

export function plugin(options: FarmPluginOptions = {}) {
  const dev = options.dev ?? false;
  const buildMeta = getBuildMeta(dev, options);
  const projectDir = process.cwd();
  const cacheDir = getPluginCacheDir(projectDir, options.cacheDir);

  let state: PluginCompiler | null = null;
  let sourcemapSidecar: SourcemapSidecar | null = null;

  const getState = () => {
    if (state) return state;

    const devSourcemap = resolveDevSourcemapMode(options.devSourcemap, dev);

    if (!sourcemapSidecar && devSourcemap === 'sidecarServer') {
      sourcemapSidecar = getSourcemapSidecar({ projectDir, cacheDir });
    }

    state = createPluginCompiler({
      projectDir,
      cacheDir,
      dev,
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
    priority: 101,

    buildStart: {
      async executor(_: unknown, context: FarmContext) {
        getState();
        await sourcemapSidecar?.ensureStarted();
      },
    },

    resolve: {
      filters: {
        sources: ['^virtual:fluentic-style(?:\\.css)?$'],
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
      filters: { resolvedPaths: ['^virtual:fluentic-style(?:\\.css)?$'] },
      executor(params: { resolvedPath: string; }) {
        const content = loadVirtualModule(
          params.resolvedPath,
          buildMeta,
          buildMeta.extract ? null : null,
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
        resolvedPaths: ['\\.[cm]?[jt]sx?$'],
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

    buildEnd: {
      executor(_: unknown, context: FarmContext) {
        const current = state;
        if (!current || !buildMeta.extract) return;

        const css = getExtractedCss(current);
        if (!css) return;

        context.emitFile?.({
          resolvedPath: CSS_ASSET_FILE,
          name: CSS_ASSET_FILE,
          content: Array.from(Buffer.from(css)),
          resourceType: path.extname(CSS_ASSET_FILE),
        });
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
