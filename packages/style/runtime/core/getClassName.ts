import { RUNTIME_CONFIG } from '../../config/config/runtime';
import { isServerRSC } from '../env';
import { getGlobalSheet } from '../sheet/global';
import { insertStylePropRuntimeItems } from '../sheet/insert';
import { type StyleProp } from '../types';
import { type ClassNameProps, type ClassNameResult } from './className';
import { createElementMarkerClassName, splitElementMarkerStyleProp } from './elementMarker';
import { resolveClassNameRuntime } from './resolveClassNameRuntime';

export {
  //
  type ClassNameProps,
  type ClassNameResult,
  mergeClassName,
  mergeStyle,
} from './className';

export function getClassName(
  styleProp: StyleProp,
  props: ClassNameProps = {},
): ClassNameResult {
  const marker = splitElementMarkerStyleProp(styleProp);
  const resolved = resolveClassNameRuntime(marker.styleProp as StyleProp, props);

  if (resolved.items.length) {
    if (!RUNTIME_CONFIG.isExtracted && !isServerRSC()) {
      const sheet = getGlobalSheet();
      insertStylePropRuntimeItems(sheet, resolved.items);
      sheet.flush();
    }
  }

  prependClassName(resolved.result, createElementMarkerClassName(marker.debug));

  return resolved.result;
}

function prependClassName(
  result: ClassNameResult,
  className: string | null,
) {
  if (!className) return;

  result.className = result.className
    ? `${className} ${result.className}`
    : className;
}
