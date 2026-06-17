import { createRequire } from 'node:module';
import path from 'node:path';
import type { EntryNormalized } from 'webpack';
import type { Compiler } from '../../compiler';
import { normalizePath } from '../../compiler/utils/path';
import type { BuildMeta } from '../../config';
import { PLUGIN_IMPORT_PATH } from '../utils';
import { createBuildMetaSnippet } from '../utils/snippet';
import { createWebpackRegistry } from '../utils/webpack/registry';

type WebpackStaticEntry = Exclude<EntryNormalized, () => Promise<unknown>>;
type WebpackEntryDescription = WebpackStaticEntry[string];

export type WebpackLoaderState = {
  compiler: Compiler;
  dev: boolean;
};

export const webpackRegistry = createWebpackRegistry('webpack.registry');

export function getTransformLoaderPath() {
  return createRequire(import.meta.url).resolve(PLUGIN_IMPORT_PATH + '/webpack/loader');
}

export function getStylePackageDistPath() {
  return path.resolve(path.dirname(getTransformLoaderPath()), '../..');
}

export function createWebpackRuntimeModuleSource(
  meta: BuildMeta,
  cssFilePath: string | null,
  sidecarUrl?: string | null,
) {
  return [
    meta.extract && cssFilePath && `import ${JSON.stringify(normalizePath(cssFilePath))};`,
    createBuildMetaSnippet(meta, { sidecarUrl }),
    '',
  ].filter(Boolean).join('\n');
}

export function replaceWebpackCssMarker(
  source: string,
  marker: string,
  css: string,
) {
  return source.replace(marker, css);
}

export function hasWebpackCssMarker(source: string, marker: string) {
  return source.includes(marker);
}

export function prependWebpackRuntimeEntry(
  entry: EntryNormalized,
  runtimeFilePath: string,
): EntryNormalized {
  if (typeof entry === 'function') {
    return async () => prependWebpackRuntimeStaticEntry(await entry(), runtimeFilePath);
  }

  return prependWebpackRuntimeStaticEntry(entry, runtimeFilePath);
}

function prependWebpackRuntimeStaticEntry(
  entry: WebpackStaticEntry,
  runtimeFilePath: string,
): WebpackStaticEntry {
  const result: WebpackStaticEntry = {};

  for (const [key, value] of Object.entries(entry)) {
    result[key] = prependWebpackRuntimeEntryDescription(value, runtimeFilePath);
  }

  return result;
}

function prependWebpackRuntimeEntryDescription(
  entry: WebpackEntryDescription,
  runtimeFilePath: string,
): WebpackEntryDescription {
  if (!entry.import) return entry;

  return {
    ...entry,
    import: prependEntryImport(entry.import, runtimeFilePath),
  };
}

function prependEntryImport(entryImport: string[], runtimeFilePath: string) {
  return entryImport.includes(runtimeFilePath)
    ? entryImport
    : [runtimeFilePath, ...entryImport];
}
