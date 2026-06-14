import type { Loader, OnLoadResult, Plugin as EsbuildPlugin, PluginBuild } from 'esbuild';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  createPluginCompiler,
  getPluginCacheDir,
  PLUGIN_NAME,
  type PluginCompiler,
  type PluginOptions,
  resolvePluginSourcemapFilePath,
} from '../utils';
import {
  CSS_MARKER,
  getBuildMeta,
  getExtractedCss,
  loadVirtualModule,
  prependRuntimeImport,
  replaceCssMarker,
  resolveRuntimeImportAlias,
  RUNTIME_IMPORT_ALIAS_RE,
  RUNTIME_MODULE_ID,
  VIRTUAL_MODULE_REQUEST_RE,
} from '../utils/bundler';
import { getSourcemapSidecar, type SourcemapSidecar } from '../utils/sidecar';
import { resolveDevSourcemapMode } from '../utils/sourcemap';

export type EsbuildPluginOptions = PluginOptions & {
  dev?: boolean;
};

export type { EsbuildPluginOptions as PluginOptions };

const VIRTUAL_NAMESPACE = 'fluentic-style';
const JS_FILTER = /\.[cm]?[jt]sx?$/;

export default plugin;

export function plugin(options: EsbuildPluginOptions = {}): EsbuildPlugin {
  return {
    name: PLUGIN_NAME,
    setup(build) {
      const dev = options.dev ?? false;
      const buildMeta = getBuildMeta(dev, options);
      const projectDir = build.initialOptions.absWorkingDir ?? process.cwd();
      const cacheDir = getPluginCacheDir(projectDir, options.cacheDir);
      const entryPoints = collectEntryPoints(build);

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

      build.onStart(async () => {
        getState();
        await sourcemapSidecar?.ensureStarted();
      });

      build.onResolve({ filter: VIRTUAL_MODULE_REQUEST_RE }, (args) => ({
        path: args.path,
        namespace: VIRTUAL_NAMESPACE,
      }));

      build.onResolve({ filter: RUNTIME_IMPORT_ALIAS_RE }, (args) => {
        const alias = resolveRuntimeImportAlias(args.path, buildMeta);
        return alias ? { path: alias, external: false } : null;
      });

      build.onLoad({ filter: /.*/, namespace: VIRTUAL_NAMESPACE }, (args) => {
        const contents = loadVirtualModule(
          args.path,
          buildMeta,
          buildMeta.extract ? `${RUNTIME_MODULE_ID}.css` : null,
        );

        if (contents == null) return null;

        return {
          contents,
          loader: args.path.endsWith('.css') ? 'css' : 'js',
          resolveDir: projectDir,
        };
      });

      build.onLoad({ filter: JS_FILTER }, async (args) => {
        const current = getState();
        await sourcemapSidecar?.ensureStarted();

        let code = await fs.readFile(args.path, 'utf8');
        if (entryPoints.has(path.resolve(args.path))) {
          code = prependRuntimeImport(code);
        }

        const result = current.transform(code, args.path, null);

        return {
          contents: result?.code ?? code,
          loader: getLoader(args.path),
          resolveDir: path.dirname(args.path),
        } satisfies OnLoadResult;
      });

      build.onEnd(async (result) => {
        const current = state;
        if (!current || !buildMeta.extract) return;

        const css = getExtractedCss(current);
        if (!css) return;

        if (result.outputFiles?.length) {
          for (const file of result.outputFiles) {
            if (!file.path.endsWith('.css')) continue;

            const text = new TextDecoder().decode(file.contents);
            if (!text.includes(CSS_MARKER)) continue;

            file.contents = new TextEncoder().encode(replaceCssMarker(text, css));
            return;
          }
        }

        await replaceWrittenCssMarker(build, css);
      });
    },
  };
}

function collectEntryPoints(build: PluginBuild) {
  const entryPoints = new Set<string>();
  const cwd = build.initialOptions.absWorkingDir ?? process.cwd();
  const input = build.initialOptions.entryPoints;

  const add = (value: string) => {
    entryPoints.add(path.resolve(cwd, value));
  };

  if (!input) return entryPoints;

  if (Array.isArray(input)) {
    for (const item of input) {
      if (typeof item === 'string') add(item);
      else add(item.in);
    }
    return entryPoints;
  }

  for (const value of Object.values(input)) {
    add(value);
  }

  return entryPoints;
}

function getLoader(filePath: string): Loader {
  const ext = path.extname(filePath);

  if (ext === '.tsx') return 'tsx';
  if (ext === '.ts' || ext === '.mts' || ext === '.cts') return 'ts';
  if (ext === '.jsx') return 'jsx';
  return 'js';
}

async function replaceWrittenCssMarker(build: PluginBuild, css: string) {
  const outputs = await getCssOutputPaths(build);

  for (const filePath of outputs) {
    let text: string;
    try {
      text = await fs.readFile(filePath, 'utf8');
    } catch {
      continue;
    }

    if (!text.includes(CSS_MARKER)) continue;

    await fs.writeFile(filePath, replaceCssMarker(text, css), 'utf8');
    return;
  }
}

async function getCssOutputPaths(build: PluginBuild) {
  const options = build.initialOptions;

  if (options.outfile) {
    return [options.outfile.replace(/\.[cm]?js$/, '.css')];
  }

  if (!options.outdir) return [];

  return findCssFiles(options.outdir);
}

async function findCssFiles(dir: string): Promise<string[]> {
  const result: string[] = [];

  let entries: Array<import('node:fs').Dirent>;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return result;
  }

  for (const entry of entries) {
    const filePath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      result.push(...await findCssFiles(filePath));
    } else if (entry.isFile() && filePath.endsWith('.css')) {
      result.push(filePath);
    }
  }

  return result;
}
