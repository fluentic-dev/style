import type { ClassNameResult } from '../core/getClassName';
import type { CssPropItem } from '../core/cache/prop';
import { collectCssPropItemsSheetRules } from '../sheet/rules';
import { ELEMENT_CSS_DATA_ATTR } from './constants';
import { addRscStyleRules } from './styleStore';

export type ClassNameResultRSC = ClassNameResult & {
  [ELEMENT_CSS_DATA_ATTR]?: string;
};

export function getClassNameRSC(
  result: ClassNameResult,
  items: readonly CssPropItem[],
): ClassNameResultRSC {
  const rules = collectCssPropItemsSheetRules(items);

  if (!rules.length) return result;

  addRscStyleRules(rules);

  return {
    ...result,
    [ELEMENT_CSS_DATA_ATTR]: JSON.stringify(rules),
  };
}
