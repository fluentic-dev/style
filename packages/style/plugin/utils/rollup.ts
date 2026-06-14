import path from 'node:path';
import type { InputOption, Plugin, PluginContext } from 'rollup';
import {
  CSS_ASSET_FILE,
  getBuildMeta,
  getExtractedCss,
  getVirtualModuleId,
  loadVirtualModule,
  prependRuntimeImport,
  resolveRuntimeImportAlias,
} from './bundler';
import {
  createPluginCompiler,
  getPluginCacheDir,
  invalidateFiles,
  type PluginCompiler,
  type PluginOptions,
} from './compiler';
import { PLUGIN_NAME } from './constants';
import { getSourcemapSidecar, type SourcemapSidecar } from './sidecar';
import { parseBundlerSourceMap, resolveDevSourcemapMode, resolvePluginSourcemapFilePath } from './sourcemap';

export type RollupStylePluginOptions = PluginOptions & {
  dev?: boolean;
};

type RollupStylePluginArgs = {
  name?: string;
  pluginName?: string;
};

export function createRollupStylePlugin(
  options: RollupStylePluginOptions = {},
  args: RollupStylePluginArgs = {},
): Plugin {
  const dev = options.dev ?? false;
  const pluginName = args.pluginName ?? PLUGIN_NAME;
  const buildMeta = getBuildMeta(dev, options);
  const inputIds = new Set<string>();

  let state: PluginCompiler | null = null;
  let sourcemapSidecar: SourcemapSidecar | null = null;

  const getState = () => {
    if (state) return state;

    const projectDir = process.cwd();
    const cacheDir = getPluginCacheDir(projectDir, options.cacheDir);
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
    name: args.name ?? pluginName,

    options(inputOptions) {
      inputIds.clear();
      collectInputIds(inputOptions.input, inputIds);
      return null;
    },

    async buildStart() {
      getState();
      await sourcemapSidecar?.ensureStarted();
    },

    watchChange(id) {
      const current = state;
      if (!current) return;

      invalidateFiles(current.compiler, [id]);
      current.filter.clear();
    },

    resolveId(id) {
      return getVirtualModuleId(id) ?? resolveRuntimeImportAlias(id, buildMeta);
    },

    load(id) {
      return loadVirtualModule(id, buildMeta, null);
    },

    async transform(this: PluginContext, code, id) {
      const current = getState();
      await sourcemapSidecar?.ensureStarted();

      const inputCode = isEntryModule(this, id, inputIds)
        ? prependRuntimeImport(code)
        : code;

      const result = current.transform(inputCode, id, null);
      if (!result) {
        return inputCode === code ? null : { code: inputCode, map: null };
      }

      return {
        code: result.code,
        map: parseBundlerSourceMap(result.map),
      };
    },

    generateBundle() {
      const current = state;
      if (!current || !buildMeta.extract) return;

      const css = getExtractedCss(current);
      if (!css) return;

      this.emitFile({
        type: 'asset',
        fileName: CSS_ASSET_FILE,
        source: css,
      });
    },
  };
}

function collectInputIds(input: InputOption | undefined, ids: Set<string>) {
  const add = (value: string) => {
    ids.add(path.resolve(value));
  };

  if (!input) return;

  if (typeof input === 'string') {
    add(input);
    return;
  }

  if (Array.isArray(input)) {
    for (const item of input) {
      if (typeof item === 'string') add(item);
    }
    return;
  }

  for (const item of Object.values(input)) {
    if (typeof item === 'string') add(item);
  }
}

function isEntryModule(
  context: PluginContext,
  id: string,
  inputIds: Set<string>,
) {
  if (context.getModuleInfo(id)?.isEntry) return true;
  return inputIds.has(path.resolve(id));
}
