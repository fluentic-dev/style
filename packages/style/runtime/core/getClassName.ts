import { RUNTIME_CONFIG } from '../../config';
import { STYLE_RUNTIME_MODE } from '../mode';
import { getClassNameRSC } from '../rsc/getClassName';
import { getGlobalSheet } from '../sheet/global';
import { insertStylePropRuntimeItems } from '../sheet/insert';
import { type StyleProp } from '../types';
import { resolveStylePropRuntime } from './cache/prop';
import {
  type ClassNameProps,
  type ClassNameResult,
  createClassNameResult,
  finishClassNameResult,
  mergeResolvedClassName,
  mergeResolvedStyle,
} from './className';

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
  const result = createClassNameResult(props);
  const resolved = resolveStylePropRuntime(styleProp);

  if (resolved) {
    if (
      STYLE_RUNTIME_MODE === 'prod' ||
      (
        STYLE_RUNTIME_MODE === 'full' &&
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
    STYLE_RUNTIME_MODE === 'rsc' ||
    (
      STYLE_RUNTIME_MODE === 'full' &&
      RUNTIME_CONFIG.isDev &&
      RUNTIME_CONFIG.isRSC
    )
  ) {
    return getClassNameRSC(finished, resolved?.items ?? []);
  }

  return finished;
}
