import { Buffer } from 'node:buffer';
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
import { hasCssMarker, replaceCssMarker } from '../../utils/cssMarker';
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

type FarmResource = {
  name: string;
  bytes: number[];
  emitted: boolean;
  resourceType: string;
  origin: {
    type: 'ResourcePot' | 'Module';
    value: string;
  };
};

type FarmResourcesMap = Record<string, FarmResource>;

export default plugin;

export function plugin(options: FarmPluginOptions = {}) {
  const dev = options.dev ?? false;
  const extract = !dev;
  const buildConfig = getPluginBuildConfig(options);
  const buildDevConfig = getPluginBuildDevConfig(options);
  const runtimeMode = getStyleRuntimeMode(dev);
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
      runtimeMode,
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
              sourcemapSidecar?.getBaseUrl() || null,
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

    finalizeResources: {
      executor(param: { resourcesMap: FarmResourcesMap; }) {
        const current = state;
        const css = current?.compiler.getExtractedCss();
        if (!css) return;

        return finalizeCssResources(param.resourcesMap, css);
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

function finalizeCssResources(resourcesMap: FarmResourcesMap, css: string) {
  const cssResource = getCssResource(resourcesMap);
  const cssFileName = cssResource?.name ?? 'fluentic-style.css';

  if (cssResource) {
    cssResource.bytes = textToBytes(mergeCssResource(cssResource, css));
  } else {
    resourcesMap[cssFileName] = {
      name: cssFileName,
      bytes: textToBytes(css),
      emitted: false,
      resourceType: 'css',
      origin: {
        type: 'Module',
        value: PLUGIN_NAME,
      },
    };
  }

  injectCssLink(resourcesMap, cssFileName);

  return resourcesMap;
}

function getCssResource(resourcesMap: FarmResourcesMap) {
  for (const resource of Object.values(resourcesMap)) {
    if (resource.resourceType === 'css' || resource.name.endsWith('.css')) {
      return resource;
    }
  }

  return null;
}

function mergeCssResource(resource: FarmResource, css: string) {
  const text = bytesToText(resource.bytes);
  if (!text) return css;

  return hasCssMarker(text)
    ? replaceCssMarker(text, css)
    : `${text}\n${css}`;
}

function injectCssLink(resourcesMap: FarmResourcesMap, cssFileName: string) {
  for (const resource of Object.values(resourcesMap)) {
    if (resource.resourceType !== 'html' && !resource.name.endsWith('.html')) continue;

    const html = bytesToText(resource.bytes);
    const href = `/${cssFileName}`;
    if (html.includes(`href="${href}"`) || html.includes(`href='${href}'`)) continue;

    const tag = `<link rel="stylesheet" href="${href}" data-fluentic-style>`;
    const nextHtml = html.includes('</head>')
      ? html.replace('</head>', `${tag}</head>`)
      : `${tag}${html}`;

    resource.bytes = textToBytes(nextHtml);
  }
}

function bytesToText(bytes: number[]) {
  return Buffer.from(bytes).toString('utf8');
}

function textToBytes(text: string) {
  return Array.from(Buffer.from(text));
}
