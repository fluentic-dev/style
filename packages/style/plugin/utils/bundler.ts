import type { BuildMeta } from '../../config';
import {
  getStyleJsxDevRuntimeImportPath,
  getStyleJsxRuntimeImportPath,
  STYLE_JSX_DEV_RUNTIME_COMPAT_IMPORT_PATH,
  STYLE_JSX_DEV_RUNTIME_IMPORT_PATH,
  STYLE_JSX_RUNTIME_COMPAT_IMPORT_PATH,
  STYLE_JSX_RUNTIME_IMPORT_PATH,
  type StyleClientRuntimeMode,
} from '../../utils/imports';
import type { PluginCompiler, PluginOptions } from './compiler';
import { createBuildMetaSnippet, getExtractedCssMarker } from './snippet';

export const RUNTIME_MODULE_ID = 'virtual:fluentic-style';
export const CSS_MODULE_ID = `${RUNTIME_MODULE_ID}.css`;

export const RESOLVED_RUNTIME_MODULE_ID = `\0${RUNTIME_MODULE_ID}`;
export const RESOLVED_CSS_MODULE_ID = `\0${CSS_MODULE_ID}`;

export const VIRTUAL_MODULE_REQUEST_PATTERN = '^virtual:fluentic-style(?:\\.css)?$';
export const RUNTIME_IMPORT_ALIAS_PATTERN = '^@fluentic/style/jsx(?:-runtime|-dev-runtime|/runtime|/dev-runtime)$';

export const VIRTUAL_MODULE_REQUEST_RE = /^virtual:fluentic-style(?:\.css)?$/;
export const RUNTIME_IMPORT_ALIAS_RE = /^@fluentic\/style\/jsx(?:-runtime|-dev-runtime|\/runtime|\/dev-runtime)$/;

export const CSS_MARKER = getExtractedCssMarker();

export const CSS_ASSET_FILE = 'fluentic-style.css';

const JSX_RUNTIME_IMPORTS = [
  STYLE_JSX_RUNTIME_IMPORT_PATH,
  STYLE_JSX_RUNTIME_COMPAT_IMPORT_PATH,
];

const JSX_DEV_RUNTIME_IMPORTS = [
  STYLE_JSX_DEV_RUNTIME_IMPORT_PATH,
  STYLE_JSX_DEV_RUNTIME_COMPAT_IMPORT_PATH,
];

export function getBuildMeta(dev: boolean, options: PluginOptions): BuildMeta {
  return {
    dev,
    extract: !dev,
    hoist: options.hoist !== false,
    rsc: false,
    layer: options.layer,
    priorityMode: options.priorityMode,
    sourcemapTrace: options.sourcemapTrace,
    checkSelector: options.checkSelector,
    css: options.css ?? null,
  };
}

export function createRuntimeModuleSource(
  meta: BuildMeta,
  cssModuleId?: string | null,
) {
  return [
    meta.extract && cssModuleId && `import ${JSON.stringify(cssModuleId)};`,
    createBuildMetaSnippet(meta),
    '',
  ].filter(Boolean).join('\n');
}

export function createRuntimeImport() {
  return `import ${JSON.stringify(RUNTIME_MODULE_ID)};\n`;
}

export function prependRuntimeImport(code: string) {
  if (code.includes(RUNTIME_MODULE_ID)) return code;
  return createRuntimeImport() + code;
}

export function getRuntimeImportAliases(meta: BuildMeta) {
  if (meta.dev) return {};

  const mode: StyleClientRuntimeMode = meta.extract ? 'extracted' : 'prod';
  const aliases: Record<string, string> = {};

  for (const id of JSX_RUNTIME_IMPORTS) {
    aliases[id] = getStyleJsxRuntimeImportPath(mode);
  }

  for (const id of JSX_DEV_RUNTIME_IMPORTS) {
    aliases[id] = getStyleJsxDevRuntimeImportPath(mode);
  }

  return aliases;
}

export function resolveRuntimeImportAlias(
  id: string,
  meta: BuildMeta,
) {
  return getRuntimeImportAliases(meta)[id] ?? null;
}

export function isVirtualModuleRequest(id: string, moduleId: string) {
  const normalized = normalizeVirtualModuleId(id);

  return normalized === moduleId || normalized === `\0${moduleId}`;
}

export function getVirtualModuleId(id: string) {
  if (isVirtualModuleRequest(id, RUNTIME_MODULE_ID)) {
    return RESOLVED_RUNTIME_MODULE_ID;
  }

  if (isVirtualModuleRequest(id, CSS_MODULE_ID)) {
    return RESOLVED_CSS_MODULE_ID;
  }

  return null;
}

export function loadVirtualModule(
  id: string,
  meta: BuildMeta,
  cssModuleId: string | null,
) {
  if (isVirtualModuleRequest(id, RUNTIME_MODULE_ID)) {
    return createRuntimeModuleSource(meta, cssModuleId);
  }

  if (isVirtualModuleRequest(id, CSS_MODULE_ID)) {
    return CSS_MARKER;
  }

  return null;
}

export function getExtractedCss(compiler: PluginCompiler) {
  return compiler.compiler.getExtractedCss();
}

export function replaceCssMarker(text: string, css: string) {
  return text.replace(CSS_MARKER, css);
}

export function hasCssMarker(text: string) {
  return text.includes(CSS_MARKER);
}

function normalizeVirtualModuleId(id: string) {
  const base = id.split('?')[0]?.split('#')[0] ?? id;

  if (base.startsWith('/@id/__x00__')) {
    return `\0${base.slice('/@id/__x00__'.length)}`;
  }

  if (base.startsWith('/@id/')) {
    return base.slice('/@id/'.length);
  }

  return base;
}
