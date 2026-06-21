import type { CompilerRuntimeMode } from '../compiler/compiler';
import { STYLE_IMPORT_PATH } from './constants';

export function getStyleRuntimeImportPath(mode: CompilerRuntimeMode) {
  return `${STYLE_IMPORT_PATH}/entry/${mode}`;
}

export function getStyleRuntimeCssImportPath(mode: CompilerRuntimeMode) {
  return `${getStyleRuntimeImportPath(mode)}/css`;
}

export function getStyleRuntimeDevRscImportPath(mode: CompilerRuntimeMode) {
  return `${getStyleRuntimeImportPath(mode)}/dev`;
}
