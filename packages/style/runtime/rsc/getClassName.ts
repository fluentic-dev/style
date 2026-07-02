import type { LayerPriority } from '../../atomic/layer';
import type { DebugData } from '../../builder/data/debug';
import { DEV_CONFIG } from '../../config/config/dev';
import type { SheetRule } from '../../sheet';
import type { StylePropItem } from '../core/cache/prop';
import type { ClassNameProps, ClassNameResult } from '../core/className';
import {
  createElementMarkerRuleFromDebug,
  isElementMarkerRule,
  splitElementMarkerStyleProp,
} from '../core/elementMarker';
import { resolveClassNameRuntime } from '../core/resolveClassNameRuntime';
import { collectStylePropItemsSheetRulesWithThemes } from '../sheet/rules';
import type { StyleProp } from '../types';
import { ELEMENT_CSS_DATA_ATTR } from './constants';
import { addRscStyleRules } from './styleStore';

export type RscStylePayloadRule = {
  key?: string | null;
  css: string;
  priority?: LayerPriority | null;
  callsite?: SheetRule['callsite'];
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
  const marker = splitElementMarkerStyleProp(styleProp);
  const resolved = resolveClassNameRuntime(marker.styleProp as StyleProp, props);

  return DEV_CONFIG.isDev
    ? getClassNameRSC(resolved.result, resolved.items, marker.debug)
    : resolved.result;
}

export function getClassNameRSC(
  result: ClassNameResult,
  items: readonly StylePropItem[],
  markerDebug?: ReturnType<typeof splitElementMarkerStyleProp>['debug'],
): ClassNameResultRSC {
  const rules = collectStylePropItemsSheetRulesWithThemes(items);
  const marker = createElementMarkerRuleFromDebug(markerDebug);

  if (!rules.length && !marker) return result;

  addRscStyleRules(rules);

  if (marker) {
    result.className = result.className
      ? `${marker.className} ${result.className}`
      : marker.className;
  }

  return {
    ...result,
    [ELEMENT_CSS_DATA_ATTR]: createRscStylePayload(marker ? [marker.rule, ...rules] : rules),
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
    callsite: isElementMarkerRule(rule) ? rule.callsite : undefined,
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
