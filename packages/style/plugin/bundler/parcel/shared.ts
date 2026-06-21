import { Optimizer, Resolver, Runtime, Transformer } from '@parcel/plugin';
import path from 'node:path';
import { normalizePath } from '../../../compiler/utils/path';
import type { BuildCssConfig } from '../../../config/build';
import {
  createFileCssCache,
  createFileCssConfigHash,
  createPluginCompiler,
  EXTRACTED_CSS_MARKER,
  type FileCssCache,
  getPluginBuildConfig,
  getPluginBuildDevConfig,
  getPluginCacheDir,
  type PluginCompiler,
  type PluginOptions,
  resolvePluginSourcemapFilePath,
  writePluginCacheFile,
} from '../../utils';
import { formatError } from '../../utils/misc';
import { getStyleEntryDefines, getStyleRuntimeMode } from '../../utils/runtimeEntry';
import { getSourcemapSidecar, type SourcemapSidecar } from '../../utils/sidecar';

export const PARCEL_RUNTIME_FILE = 'parcel-runtime.js';
export const PARCEL_VIRTUAL_RUNTIME_FILE = 'parcel-virtual-runtime.js';
export const PARCEL_CSS_FILE = 'parcel-style.css';

type ParcelPluginOptions = {
  mode?: string;
  projectRoot?: string;
  packageManager?: {
    resolve: (
      id: string,
      from: string,
      options?: Record<string, unknown> | null,
    ) => Promise<{ resolved: string; }>;
  };
};

export type ParcelState = PluginCompiler & {
  entryDefines: Record<string, string>;
  cssCache: FileCssCache;
  cssConfig: BuildCssConfig;
  cssConfigHash: string;
  sidecar: SourcemapSidecar | null;
};

let state: ParcelState | null = null;
let stateKey = '';

export { Optimizer, Resolver, Runtime, Transformer };

export function getParcelState(options: ParcelPluginOptions, pluginOptions: PluginOptions = {}) {
  const projectDir = options.projectRoot ?? process.cwd();
  const dev = options.mode !== 'production';
  const cacheDir = getPluginCacheDir(projectDir, pluginOptions.cacheDir);
  const key = JSON.stringify({ projectDir, dev, cacheDir });

  if (state && stateKey === key) return state;

  const devSourcemap = pluginOptions.devSourcemap ?? (dev ? 'sourceContent' : 'sourceUrl');

  const sidecar = devSourcemap === 'sidecarServer'
    ? getSourcemapSidecar({ projectDir, cacheDir })
    : null;

  const buildConfig = getPluginBuildConfig(pluginOptions);
  const buildDevConfig = getPluginBuildDevConfig(pluginOptions);
  const cssConfigHash = createFileCssConfigHash(buildConfig.css);

  const current = createPluginCompiler({
    projectDir,
    cacheDir,
    dev,
    options: {
      ...pluginOptions,
      devSourcemap,
      getSourcemapFilePath: resolvePluginSourcemapFilePath(
        pluginOptions.getSourcemapFilePath,
        sidecar,
      ),
    },
    runtimeMode: getStyleRuntimeMode(dev),
  });

  const cssCache = createFileCssCache({
    cacheDir,
    cacheSubdir: 'parcel-css',
  });

  state = {
    ...current,
    cssCache,
    cssConfig: buildConfig.css,
    cssConfigHash,
    sidecar,
    entryDefines: getStyleEntryDefines(
      buildConfig,
      buildDevConfig,
      sidecar?.getBaseUrl() || null,
    ),
  };
  stateKey = key;

  return state;
}

export async function ensureParcelSidecarStarted(current: ParcelState) {
  await current.sidecar?.ensureStarted();

  if (current.sidecar) {
    Object.assign(
      current.entryDefines,
      getStyleEntryDefines(
        getPluginBuildConfig({}),
        getPluginBuildDevConfig({}),
        current.sidecar.getBaseUrl(),
      ),
    );
  }
}

export function replaceParcelDefines(code: string, current: ParcelState) {
  let next = code;

  for (const [key, value] of Object.entries(current.entryDefines)) {
    next = next.replace(new RegExp(`^\\s*declare\\s+const\\s+${key}\\s*:\\s*string\\s*;\\s*\\n?`, 'gm'), '');
    next = next.split(key).join(value);
  }

  return next;
}

export function writeParcelRuntimeFile(current: ParcelState, source: string) {
  return writePluginCacheFile(current, PARCEL_RUNTIME_FILE, source);
}

export function writeParcelVirtualRuntimeFile(current: ParcelState, source: string) {
  return writePluginCacheFile(current, PARCEL_VIRTUAL_RUNTIME_FILE, source);
}

export function writeParcelCssFile(current: ParcelState) {
  return writePluginCacheFile(current, PARCEL_CSS_FILE, EXTRACTED_CSS_MARKER);
}

export function createParcelRuntimeModuleSource(current: ParcelState) {
  const cssFilePath = !current.dev ? writeParcelCssFile(current) : null;

  return [
    cssFilePath && `import ${
      JSON.stringify(toParcelImportPath(path.relative(
        current.cacheDir,
        cssFilePath,
      )))
    };`,
    '',
  ].filter(Boolean).join('\n');
}

export function prependParcelRuntimeImport(
  code: string,
  current: ParcelState,
  sourceFilePath: string,
) {
  const runtimeFilePath = writeParcelVirtualRuntimeFile(
    current,
    createParcelRuntimeModuleSource(current),
  );
  const runtimeImportPath = toParcelImportPath(path.relative(
    path.dirname(sourceFilePath),
    runtimeFilePath,
  ));

  if (code.includes(runtimeImportPath)) return code;

  return `import ${JSON.stringify(runtimeImportPath)};\n${code}`;
}

export function isParcelGeneratedRuntimeFile(current: ParcelState, filePath: string) {
  const normalized = normalizePath(filePath);

  return normalized === normalizePath(resolveParcelCacheFile(current, PARCEL_RUNTIME_FILE)) ||
    normalized === normalizePath(resolveParcelCacheFile(current, PARCEL_VIRTUAL_RUNTIME_FILE));
}

export function getParcelExtractedCss(current: ParcelState) {
  const localCss = current.cssCache.getCss({
    ...current.cssConfig,
    configHash: current.cssConfigHash,
  });

  if (localCss) return localCss;

  let dir = current.projectDir;
  const seen = new Set([current.cacheDir]);

  while (true) {
    const cacheDir = getPluginCacheDir(dir);

    if (!seen.has(cacheDir)) {
      const css = createFileCssCache({
        cacheDir,
        cacheSubdir: 'parcel-css',
      }).getCss({
        ...current.cssConfig,
        configHash: current.cssConfigHash,
      });

      if (css) return css;
      seen.add(cacheDir);
    }

    const next = path.dirname(dir);
    if (next === dir) return '';
    dir = next;
  }
}

export function resolveParcelCacheFile(current: ParcelState, fileName: string) {
  return path.join(current.cacheDir, fileName);
}

function toParcelImportPath(filePath: string) {
  const normalized = normalizePath(filePath);

  return normalized.startsWith('.') ? normalized : `./${normalized}`;
}

export function createParcelError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return new Error(formatError(message));
}
