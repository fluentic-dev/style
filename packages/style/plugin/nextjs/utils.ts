import { createRequire } from 'node:module';
import path from 'node:path';
import type { Compilation, Compiler, WebpackPluginInstance } from 'webpack';
import type { Compiler as PluginCompiler } from '../../compiler';
import { normalizePath } from '../../compiler/utils/path';
import type { BuildMeta } from '../../config';
import type { FileCssCache } from '../utils/cache';
import type { PluginOptions as BasePluginOptions } from '../utils/compiler';
import type { TransformFilter } from '../utils/filter';
import type { SourcemapSidecar } from '../utils/sidecar';
import { resolvePluginSourcemapOptions } from '../utils/sourcemap';
import { createWebpackRegistry } from '../utils/webpack/registry';
import { LOADER_IMPORT_PATH } from './constants';
import type { PluginOptions, WebpackConfiguration } from './types';

export const nextRegistry = createWebpackRegistry('nextjs.registry');

export const PRECOLLECT_NAMESPACE = 'nextjs/precollect';

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

export function createNextBuildMeta(dev: boolean, options: { css?: BuildMeta['css']; }): BuildMeta {
  return {
    dev,
    extract: !dev,
    rsc: true,
    css: {
      ...options.css,
      localClassName: options.css?.localClassName ?? dev,
      debugClassName: options.css?.debugClassName ?? dev,
    },
  };
}

export function resolveNextCompilerOptions(
  options: PluginOptions,
  sidecar: SourcemapSidecar | null,
  buildMeta: BuildMeta,
): BasePluginOptions {
  const resolved = resolvePluginSourcemapOptions({
    ...options,
    devSourcemap: buildMeta.dev ? 'sidecarServer' : 'default',
  }, sidecar);

  return {
    ...resolved,
    css: {
      ...resolved.css,
      ...buildMeta.css,
    },
  };
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
