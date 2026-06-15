import type { StylePropItem } from '../core/cache/prop';
import type { ClassNameResult } from '../core/className';
import { collectStylePropItemsSheetRulesWithThemes } from '../sheet/rules';
import { ELEMENT_CSS_DATA_ATTR } from './constants';
import { addRscStyleRules } from './styleStore';

export type ClassNameResultRSC = ClassNameResult & {
  [ELEMENT_CSS_DATA_ATTR]?: string;
};

export function getClassNameRSC(
  result: ClassNameResult,
  items: readonly StylePropItem[],
): ClassNameResultRSC {
  const rules = collectStylePropItemsSheetRulesWithThemes(items);

  if (!rules.length) return result;

  addRscStyleRules(rules);

  return {
    ...result,
    [ELEMENT_CSS_DATA_ATTR]: JSON.stringify(rules),
  };
}
