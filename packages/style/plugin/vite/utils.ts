import type { BuildMeta } from '../../config/build';
import { createBuildMetaSnippet } from '../utils/snippet';

export function createRuntimeModuleSource(
  meta: BuildMeta,
  cssModuleId: string,
) {
  const code = [
    meta.extract && `import ${JSON.stringify(cssModuleId)};`,
    createBuildMetaSnippet(meta),
    '',
  ];

  return code.filter(Boolean).join('\n');
}

export function isVirtualModuleRequest(id: string, moduleId: string) {
  const normalized = normalizeViteModuleId(id);

  return normalized === moduleId || normalized === `\0${moduleId}`;
}

export function hasVirtualCssMarker(text: string, marker: string) {
  return text.includes(marker);
}

export function replaceVirtualCssMarker(
  text: string,
  marker: string,
  css: string,
) {
  return text.replace(marker, css);
}

export function normalizeViteModuleId(id: string) {
  const base = id.split('?')[0]?.split('#')[0] ?? id;

  if (base.startsWith('/@id/__x00__')) {
    return `\0${base.slice('/@id/__x00__'.length)}`;
  }

  if (base.startsWith('/@id/')) {
    return base.slice('/@id/'.length);
  }

  if (base.startsWith('/@fs/')) {
    return base.slice('/@fs'.length);
  }

  return base;
}
