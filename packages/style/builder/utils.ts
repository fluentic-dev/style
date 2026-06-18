import { DEV_CONFIG } from '../config/config/dev';
import type { StyleObject, StyleTransform } from '../style';
import { traceCallsite } from '../utils/trace';
import { type DebugData, getDebugCallsite } from './data/debug';

export const FnPrefixStyle = 'style.';
export const FnPrefixSlot = 'slot.';
export const FnPrefixScope = 'scope.';

export function runtimeCallsite() {
  return traceCallsite();
}

export function resolveCallsite(debug: DebugData | null | undefined) {
  return debug ? getDebugCallsite(debug) : runtimeCallsite();
}

export function transformStyle<Style>(style: StyleObject<Style>, transform: StyleTransform<Style> | null) {
  return transform ? transform.transform(style) : style;
}
