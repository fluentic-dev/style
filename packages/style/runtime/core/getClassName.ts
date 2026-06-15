import { RUNTIME_CONFIG } from '../../config';
import type { StyleRuntimeMode } from '../../utils/imports';
import { getClassNameRSC } from '../rsc/getClassName';
import { getGlobalSheet } from '../sheet/global-runtime';
import { insertStylePropRuntimeItems } from '../sheet/insert';
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

declare const __FLUENTIC_RUNTIME_MODE__: StyleRuntimeMode | undefined;

const RUNTIME_MODE: StyleRuntimeMode = typeof __FLUENTIC_RUNTIME_MODE__ === 'string'
  ? __FLUENTIC_RUNTIME_MODE__
  : 'full';

export function getClassName(
  styleProp: StyleProp,
  props: ClassNameProps = {},
): ClassNameResult {
  const result = createClassNameResult(props);
  const resolved = resolveStylePropRuntime(styleProp);

  if (resolved) {
    if (
      RUNTIME_MODE === 'prod' ||
      (
        RUNTIME_MODE === 'full' &&
        !RUNTIME_CONFIG.isCssExtracted &&
        !RUNTIME_CONFIG.isRSC
      )
    ) {
      const sheet = getGlobalSheet();
      insertStylePropRuntimeItems(sheet, resolved.items);
      sheet.flush();
    }

    mergeResolvedClassName(result, resolved.result.className);
    mergeResolvedStyle(result, resolved.result.style);
  }

  const finished = finishClassNameResult(result);

  if (
    RUNTIME_MODE === 'rsc' ||
    (
      RUNTIME_MODE === 'full' &&
      RUNTIME_CONFIG.isDev &&
      RUNTIME_CONFIG.isRSC
    )
  ) {
    return getClassNameRSC(finished, resolved?.items ?? []);
  }

  return finished;
}

export { type ClassNameProps, type ClassNameResult, mergeClassName, mergeStyle } from './className';
