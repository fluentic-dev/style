import type { SheetRule } from '../../sheet';
import { collectStylePropSheetRules } from '../sheet/rules';
import type { StyleProp } from '../types';

export function getSheetRules(styleProp: StyleProp): SheetRule[] {
  return collectStylePropSheetRules(styleProp);
}
