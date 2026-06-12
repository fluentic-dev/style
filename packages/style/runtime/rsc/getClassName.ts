import { collectDevCssRules } from '../dev';
import type { ClassNameResult } from '../static';
import type { CssProp } from '../types';
import { CSS_DEV_ATTR } from './constants';
import { collectRscDevSeedCss } from './seed';

export type ClassNameResultRSC = ClassNameResult & {
  [CSS_DEV_ATTR]?: string;
};

export function getClassNameRSC(
  result: ClassNameResult,
  css: CssProp,
): ClassNameResultRSC {
  const rules = collectDevCssRules(css);

  if (!rules.length) return result;

  collectRscDevSeedCss(rules);

  return {
    ...result,
    [CSS_DEV_ATTR]: JSON.stringify(rules),
  };
}
