import type { LayerPriority } from '../../atomic/layer';
import type { DebugData } from '../../builder/data/debug';
import { DEV_CONFIG } from '../../config/config/dev';
import type { SheetRule } from '../../sheet';
import type { StylePropItem } from '../core/cache/prop';
import type { ClassNameProps, ClassNameResult } from '../core/className';
import { resolveClassNameRuntime } from '../core/resolveClassNameRuntime';
import { collectStylePropItemsSheetRulesWithThemes } from '../sheet/rules';
import type { StyleProp } from '../types';
import { ELEMENT_CSS_DATA_ATTR } from './constants';
import { addRscStyleRules } from './styleStore';

export type RscStylePayloadRule = {
  key?: string | null;
  css: string;
  priority?: LayerPriority | null;
  debug?: DebugData | null;
  debugField?: string | null;
};

export type ClassNameResultRSC = ClassNameResult & {
  [ELEMENT_CSS_DATA_ATTR]?: string;
};

export function getClassName(
  styleProp: StyleProp,
  props: ClassNameProps = {},
): ClassNameResultRSC {
  const resolved = resolveClassNameRuntime(styleProp, props);

  return DEV_CONFIG.isDev
    ? getClassNameRSC(resolved.result, resolved.items)
    : resolved.result;
}

export function getClassNameRSC(
  result: ClassNameResult,
  items: readonly StylePropItem[],
): ClassNameResultRSC {
  const rules = collectStylePropItemsSheetRulesWithThemes(items);

  if (!rules.length) return result;

  addRscStyleRules(rules);

  return {
    ...result,
    [ELEMENT_CSS_DATA_ATTR]: createRscStylePayload(rules),
  };
}

export function createRscStylePayload(rules: readonly SheetRule[]): string {
  return JSON.stringify(rules.map(createRscStylePayloadRule));
}

function createRscStylePayloadRule(rule: SheetRule): RscStylePayloadRule {
  return {
    key: rule.key,
    css: rule.css,
    priority: rule.priority,
    debug: rule.debug ? createRscDebugPayload(rule.debug, rule.debugField) : undefined,
    debugField: rule.debugField,
  };
}

function createRscDebugPayload(
  debug: DebugData,
  debugField: string | null | undefined,
): DebugData {
  const { code: _code, fields, ...payload } = debug;

  if (!debugField || !fields?.[debugField]) {
    return payload;
  }

  return {
    ...payload,
    fields: {
      [debugField]: fields[debugField],
    },
  };
}
