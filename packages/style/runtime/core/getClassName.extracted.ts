import type { StyleProp } from '../types';
import { resolveStylePropRuntime } from './cache/prop';
import {
  type ClassNameProps,
  type ClassNameResult,
  createClassNameResult,
  finishClassNameResult,
  mergeResolvedClassName,
  mergeResolvedStyle,
} from './className';

export function getClassName(
  styleProp: StyleProp,
  props: ClassNameProps = {},
): ClassNameResult {
  const result = createClassNameResult(props);
  const resolved = resolveStylePropRuntime(styleProp);

  if (resolved) {
    mergeResolvedClassName(result, resolved.result.className);
    mergeResolvedStyle(result, resolved.result.style);
  }

  return finishClassNameResult(result);
}

export { type ClassNameProps, type ClassNameResult, mergeClassName, mergeStyle } from './className';
