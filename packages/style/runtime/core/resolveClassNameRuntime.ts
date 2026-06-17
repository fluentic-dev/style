import { type StyleProp } from '../types';
import { resolveStylePropRuntime, type StylePropItem } from './cache/prop';
import {
  type ClassNameProps,
  type ClassNameResult,
  createClassNameResult,
  finishClassNameResult,
  mergeResolvedClassName,
  mergeResolvedStyle,
} from './className';

export type RuntimeClassNameResolution = {
  result: ClassNameResult;
  items: StylePropItem[];
};

export function resolveClassNameRuntime(
  styleProp: StyleProp,
  props: ClassNameProps = {},
): RuntimeClassNameResolution {
  const result = createClassNameResult(props);
  const resolved = resolveStylePropRuntime(styleProp);

  if (resolved) {
    mergeResolvedClassName(result, resolved.result.className);
    mergeResolvedStyle(result, resolved.result.style);
  }

  return {
    result: finishClassNameResult(result),
    items: resolved?.items ?? [],
  };
}
