import type { CompilerRuntimeMode } from '../compiler/compiler';
import {
  STYLE_EXTRACT_RUNTIME_IMPORT_PATH,
  STYLE_IMPORT_PATH,
  STYLE_RSC_EXTRACT_RUNTIME_IMPORT_PATH,
} from './constants';

export function getStyleRuntimeImportPath(mode: CompilerRuntimeMode) {
  return `${STYLE_IMPORT_PATH}/entry/${mode}`;
}

export function getStyleRuntimeCssImportPath(mode: CompilerRuntimeMode) {
  return `${getStyleRuntimeImportPath(mode)}/css`;
}

export function getStyleRuntimeDevRscImportPath(mode: CompilerRuntimeMode) {
  return `${getStyleRuntimeImportPath(mode)}/dev`;
}

export function getStyleExtractRuntimeImportPath(mode: CompilerRuntimeMode | null) {
  return mode === 'rsc-prod'
    ? STYLE_RSC_EXTRACT_RUNTIME_IMPORT_PATH
    : STYLE_EXTRACT_RUNTIME_IMPORT_PATH;
}
