import type { SheetRule } from '../../sheet';
import type { CssProp } from '../types';
import { collectCssPropSheetRules } from '../sheet/rules';

export function getSheetRules(css: CssProp): SheetRule[] {
  return collectCssPropSheetRules(css);
}
