import type { StyleRuntimeMode } from './runtimeEntry';

const pkg = '@fluentic/style';

export const STYLE_IMPORTS = {
  Root: pkg,
  Css: pkg + '/css',
  Plugin: pkg + '/plugin',
};

export function getStyleRuntimeImportPath(mode: StyleRuntimeMode) {
  return `${pkg}/entry/${mode}`;
}

export function getStyleRuntimeCssImportPath(mode: StyleRuntimeMode) {
  return `${getStyleRuntimeImportPath(mode)}/css`;
}
