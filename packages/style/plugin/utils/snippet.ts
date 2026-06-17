import type { BuildMeta } from '../../config';
import { BUILD_META_FN_SET, BUILD_META_IMPORT_PATH, SIDECAR_URL_SYMBOL_KEY_EXPORT } from './constants';

export function getExtractedCssMarker() {
  return '.__fluentic_style_css_marker__{--fluentic-style:0}';
}

export function createBuildMetaSnippet(
  meta: BuildMeta,
  options: { sidecarUrl?: string | null; } = {},
) {
  const fn = BUILD_META_FN_SET;
  const path = BUILD_META_IMPORT_PATH;

  const code = [
    options.sidecarUrl
      ? `import { ${SIDECAR_URL_SYMBOL_KEY_EXPORT}, ${fn} } from ${JSON.stringify(path)};`
      : `import { ${fn} } from ${JSON.stringify(path)};`,
    options.sidecarUrl &&
    `globalThis[Symbol.for(${SIDECAR_URL_SYMBOL_KEY_EXPORT})] = ${JSON.stringify(options.sidecarUrl)};`,
    `${fn}(${JSON.stringify(meta)});`,
  ];

  return code.join('\n');
}
