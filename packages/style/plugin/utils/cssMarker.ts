import type { PluginCompiler } from './compiler';
import { EXTRACTED_CSS_MARKER } from './constants';

export function getExtractedCss(compiler: PluginCompiler) {
  return compiler.compiler.getExtractedCss();
}

export function replaceCssMarker(text: string, css: string) {
  return text.replace(EXTRACTED_CSS_MARKER, css);
}

export function hasCssMarker(text: string) {
  return text.includes(EXTRACTED_CSS_MARKER);
}
