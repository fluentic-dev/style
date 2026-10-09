import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Compilation, Compiler, WebpackPluginInstance } from 'webpack';
import type { Compiler as PluginCompiler } from '../../compiler';
import type { ImportSource } from '../../compiler/utils/import_source';
import { normalizePath } from '../../compiler/utils/path';
import type { BuildConfig, BuildDevConfig } from '../../config/build';
import { getStyleFnMeta } from '../../style/style';
import { createWebpackRegistry } from '../bundler/webpack/shared/registry';
import type { FileCssCache } from '../utils/cache';
import type { PluginOptions as BasePluginOptions } from '../utils/compiler';
import type { TransformFilter } from '../utils/filter';
import { getPluginBuildConfig, getPluginBuildDevConfig } from '../utils/runtimeEntry';
import type { SourcemapSidecar } from '../utils/sidecar';
import { resolvePluginSourcemapOptions } from '../utils/sourcemap';
import { LOADER_IMPORT_PATH } from './constants';
import type { PluginOptions, WebpackConfiguration } from './types';

export const nextRegistry = createWebpackRegistry('nextjs.registry');

export const PRECOLLECT_CACHE_DIRS = {
  dev: 'nextjs/precollect/dev',
  prod: 'nextjs/precollect/prod',
};

export const NEXT_COMPILER_IDS = {
  turbopack: 'nextjs:turbopack',
  webpackServer: 'nextjs:webpack-server',
  webpackClient: 'nextjs:webpack-client',
};

export type { PluginCompiler };

export type NextLoaderState = {
  compiler: PluginCompiler;
  filter: TransformFilter;
  dev: boolean;
  isServer: boolean;
  configHash: string;
  devCssHref: string | null;
  cssEntryImportPath: string;
  cssCache: Pick<FileCssCache, 'setFileCss'> | null;
};

export type NextWebpackEntryValue = string | string[] | {
  import?: string | string[];
  [key: string]: unknown;
};

export function getTransformLoaderPath() {
  return createRequire(import.meta.url).resolve(LOADER_IMPORT_PATH);
}

export function getNextCacheDir(rootDir: string, cacheDir?: string) {
  return cacheDir ?? path.join(rootDir, '.next/cache/fluentic-style');
}

export function getNextPrecollectCacheSubdir(dev: boolean) {
  return dev ? PRECOLLECT_CACHE_DIRS.dev : PRECOLLECT_CACHE_DIRS.prod;
}

export function createNextBuildConfig(options: PluginOptions): BuildConfig {
  return getPluginBuildConfig(options);
}

export function createNextBuildDevConfig(options: PluginOptions): BuildDevConfig | null {
  return getPluginBuildDevConfig(options);
}

export function createNextConfigHash(
  buildConfig: BuildConfig,
  dev: boolean,
  importSources?: readonly ImportSource[] | null,
) {
  const values = [
    createPackageCacheIdentity(),
    dev ? 'dev' : 'prod',
    buildConfig.hoist ? 'hoist' : 'no-hoist',
    JSON.stringify(createSerializableImportSources(importSources)),
  ];

  return createHash('sha256').update(values.join('\0')).digest('hex');
}

function createPackageCacheIdentity() {
  const require = createRequire(import.meta.url);
  let entryPath = '';

  try {
    entryPath = require.resolve('@fluentic/style/plugin/nextjs');
  } catch {
    entryPath = fileURLToPath(import.meta.url);
  }

  const packageInfo = findPackageInfo(entryPath);
  const parts = [
    packageInfo.version,
    normalizePath(packageInfo.packageRoot),
    normalizePath(entryPath),
    getStatIdentity(packageInfo.packageJsonPath),
    getStatIdentity(entryPath),
  ];

  return parts.join('\0');
}

function findPackageInfo(entryPath: string) {
  let current = path.dirname(entryPath);

  while (true) {
    const packageJsonPath = path.join(current, 'package.json');

    try {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as {
        name?: string;
        version?: string;
      };

      if (pkg.name === '@fluentic/style') {
        return {
          packageRoot: current,
          packageJsonPath,
          version: pkg.version ?? '',
        };
      }
    } catch {
      // Keep walking toward the filesystem root.
    }

    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }

  return {
    packageRoot: path.dirname(entryPath),
    packageJsonPath: '',
    version: '',
  };
}

function getStatIdentity(filePath: string) {
  if (!filePath) return '';

  try {
    const stat = fs.statSync(filePath);
    return `${stat.size}:${stat.mtimeMs}`;
  } catch {
    return '';
  }
}

export function createSerializableImportSources(
  importSources: readonly ImportSource[] | null | undefined,
): ImportSource[] | undefined {
  if (!importSources?.length) return undefined;

  const result: ImportSource[] = [];

  for (const entry of importSources) {
    if (entry.check) continue;

    const source = serializeImportSourcePattern(entry.source);
    const name = entry.name;
    const meta = entry.meta ?? (entry.styleFn ? getStyleFnMeta(entry.styleFn) : null);

    if (!meta) continue;
    if (entry.source !== undefined && source === undefined) continue;

    result.push(removeUndefinedValues({
      source,
      name,
      meta,
    }));
  }

  return result.length ? result : undefined;
}

function serializeImportSourcePattern(
  source: ImportSource['source'],
): string | string[] | undefined {
  if (source === undefined) return undefined;

  if (Array.isArray(source)) {
    const result: string[] = [];

    for (const item of source) {
      if (typeof item !== 'string') return undefined;
      result.push(item);
    }

    return result;
  }

  return typeof source === 'string' ? source : undefined;
}

export function resolveNextCompilerOptions(
  options: PluginOptions,
  sidecar: SourcemapSidecar | null,
  buildConfig: BuildConfig,
  buildDevConfig: BuildDevConfig | null,
  dev: boolean,
): BasePluginOptions {
  const resolved = resolvePluginSourcemapOptions({
    ...options,
    devSourcemap: dev ? 'sidecarServer' : 'sourceUrl',
  }, sidecar);

  return {
    ...resolved,
    css: {
      ...resolved.css,
      ...buildConfig.css,
    },
    dev: {
      ...resolved.dev,
      ...buildDevConfig,
    },
  };
}

export function removeUndefinedValues<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => removeUndefinedValues(item)) as T;
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  const result: Record<string, unknown> = {};

  for (const [key, item] of Object.entries(value)) {
    if (item !== undefined) {
      result[key] = removeUndefinedValues(item);
    }
  }

  return result as T;
}

export function prependClientEntry(entry: unknown, moduleId: string) {
  if (typeof entry === 'function') {
    return async () => prependClientEntry(await entry(), moduleId);
  }

  if (!entry || typeof entry !== 'object') return entry;

  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(entry)) {
    result[key] = prependEntryValue(value as NextWebpackEntryValue, moduleId);
  }

  return result;
}

export function prependEntryValue(entry: NextWebpackEntryValue, moduleId: string): NextWebpackEntryValue {
  if (typeof entry === 'string') {
    return entry === moduleId ? entry : [moduleId, entry];
  }

  if (Array.isArray(entry)) {
    return entry.includes(moduleId) ? entry : [moduleId, ...entry];
  }

  const imports = entry.import;
  if (!imports) return { ...entry, import: moduleId };

  return {
    ...entry,
    import: Array.isArray(imports)
      ? imports.includes(moduleId) ? imports : [moduleId, ...imports]
      : imports === moduleId
      ? imports
      : [moduleId, imports],
  };
}

export function isAppLayoutFile(filePath: string) {
  return /\/app\/(?:[^/]+\/)*layout\.[cm]?[jt]sx?$/.test(normalizePath(filePath));
}

export function hasCssMarker(source: string, marker: string) {
  return source.includes(marker);
}

export function replaceCssMarker(source: string, marker: string, css: string) {
  return source.split(marker).join(css);
}

export function addAliases(config: WebpackConfiguration, aliases: Record<string, string>) {
  if (!config.resolve) config.resolve = {};
  if (!config.resolve.alias) config.resolve.alias = {};
  Object.assign(config.resolve.alias, aliases);
}

export function addWebpackPlugin(config: WebpackConfiguration, plugin: WebpackPluginInstance) {
  if (!config.plugins) config.plugins = [];
  config.plugins.push(plugin);
}

export function replaceCssMarkerAsset(args: {
  compiler: Compiler;
  compilation: Compilation;
  css: string;
  marker: string;
}) {
  for (const asset of args.compilation.getAssets()) {
    if (!asset.name.endsWith('.css')) continue;

    const source = asset.source.source().toString();
    if (!hasCssMarker(source, args.marker)) continue;

    args.compilation.updateAsset(
      asset.name,
      new args.compiler.webpack.sources.RawSource(
        replaceCssMarker(source, args.marker, args.css),
      ),
    );

    return true;
  }

  return false;
}
