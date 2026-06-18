import { getElementMarkerRuleCss } from '../../atomic/element';
import type { SheetCallsite, SheetRule } from '../../sheet';

export function createElementMarkerRule(
  className: string,
  callsite: SheetCallsite,
): SheetRule {
  return {
    key: `element-marker:${className}`,
    css: getElementMarkerRuleCss(className),
    callsite,
  };
}
