import { EXTRACTED_CSS_MARKER } from './constants';

export const RUNTIME_MODULE_ID = 'virtual:fluentic-style';
export const CSS_MODULE_ID = `${RUNTIME_MODULE_ID}.css`;

export const RESOLVED_RUNTIME_MODULE_ID = `\0${RUNTIME_MODULE_ID}`;
export const RESOLVED_CSS_MODULE_ID = `\0${CSS_MODULE_ID}`;

export const VIRTUAL_MODULE_REQUEST_PATTERN = `^${escapeRegex(RUNTIME_MODULE_ID)}(?:\\.css)?$`;
export const VIRTUAL_MODULE_REQUEST_REGEX = new RegExp(VIRTUAL_MODULE_REQUEST_PATTERN);

export function createRuntimeModuleSource(
  extract: boolean,
  cssModuleId?: string | null,
) {
  return [
    extract && cssModuleId && `import ${JSON.stringify(cssModuleId)};`,
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
  extract: boolean,
  cssModuleId: string | null,
) {
  if (isVirtualModuleRequest(id, RUNTIME_MODULE_ID)) {
    return createRuntimeModuleSource(extract, cssModuleId);
  }

  if (isVirtualModuleRequest(id, CSS_MODULE_ID)) {
    return EXTRACTED_CSS_MARKER;
  }

  return null;
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

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
