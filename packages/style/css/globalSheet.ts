import { type DebugData, isDebugData, type SelectorData, type SelectorOverrideData } from '../builder/data';
import { BUILDER_CALLSITE } from '../builder/data';
import { CSS_CONFIG, CSS_CONFIG_DEFAULT } from '../config/config/css';
import { collectStylePropSheetRules, getGlobalSheet } from '../runtime/sheet';
import { hashString } from '../utils/hash';
import { buildSheet } from './sheet';

export type CreateGlobalSheetOptions = { layer?: boolean | string; order?: number; };
export type GlobalSheetItem<Style = unknown> =
  | false
  | null
  | undefined
  | SelectorData<Style>
  | SelectorOverrideData<Style>
  | readonly GlobalSheetItem<Style>[];

export function createGlobalSheet<Style = unknown>(items?: GlobalSheetItem<Style>): void;
export function createGlobalSheet<Style = unknown>(
  options: CreateGlobalSheetOptions,
  items: GlobalSheetItem<Style>,
): void;
export function createGlobalSheet<Style = unknown>(
  optionsOrItems?: CreateGlobalSheetOptions | GlobalSheetItem<Style>,
  items?: GlobalSheetItem<Style> | DebugData,
  debug?: DebugData,
): void {
  const rules = buildGlobalSheetRules(optionsOrItems, items, debug, arguments.length >= 2 && !isDebugData(items));
  const sheet = getGlobalSheet();
  sheet.updateLayers(CSS_CONFIG.layers ?? CSS_CONFIG_DEFAULT.layers ?? []);
  for (const rule of rules) sheet.insert(rule);
  sheet.flush();
}

export function buildGlobalSheetRules<Style>(
  optionsOrItems?: CreateGlobalSheetOptions | GlobalSheetItem<Style>,
  items?: GlobalSheetItem<Style> | DebugData,
  debug?: DebugData,
  hasOptions = arguments.length >= 2 && !isDebugData(items),
) {
  const options = hasOptions ? optionsOrItems as CreateGlobalSheetOptions : {};
  if (
    !options || typeof options !== 'object' || Object.keys(options).some((key) => key !== 'layer' && key !== 'order')
  ) {
    throw new Error('createGlobalSheet only supports layer and order options');
  }
  if (options.order !== undefined && !Number.isFinite(options.order)) {
    throw new Error('createGlobalSheet order must be a finite number');
  }
  const data = buildSheet(
    { layer: options.layer },
    hasOptions ? items as GlobalSheetItem<Style> : optionsOrItems as GlobalSheetItem<Style>,
    isDebugData(items) ? items : debug,
    true,
  );
  const rules = collectStylePropSheetRules(data);
  // Only injected debug locations reliably identify a callsite in bundled code.
  const site = (isDebugData(items) || debug) ? data[BUILDER_CALLSITE] : null;
  const id = hashString(
    JSON.stringify(site ? [site.filePath, site.line, site.column] : [options, rules.map((rule) => rule.css)]),
  );
  const globals = [];
  for (const rule of rules) {
    globals.push({ ...rule, key: id + ':' + rule.key, globalSheet: { id, order: options.order ?? 0 } });
  }
  return globals;
}
