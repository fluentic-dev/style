import type { BuildMeta } from '../../config';
import { BUILD_META_FN_SET, BUILD_META_IMPORT_PATH } from './constants';

export function getExtractedCssMarker() {
  return '.__fluentic_style_css_marker__{--fluentic-style:0}';
}

export function createBuildMetaSnippet(meta: BuildMeta) {
  const fn = BUILD_META_FN_SET;
  const path = BUILD_META_IMPORT_PATH;

  const code = [
    `import { ${fn} } from ${JSON.stringify(path)};`,
    `${fn}(${JSON.stringify(meta)});`,
  ];

  return code.join('\n');
}
