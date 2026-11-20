import type { DebugData, SelectorData, SelectorOverrideData } from '../builder/data';
import { CSS_CONFIG, CSS_CONFIG_DEFAULT } from '../config/config/css';
import { collectStylePropSheetRules, getGlobalSheet } from '../runtime/sheet';
import { buildSheet } from './sheet';

export type CreateGlobalSheetOptions = { layer?: boolean | string; };
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
  items?: GlobalSheetItem<Style>,
  debug?: DebugData,
): void {
  const hasOptions = arguments.length >= 2;
  const options = hasOptions ? optionsOrItems as CreateGlobalSheetOptions : {};
  if (!options || typeof options !== 'object' || Object.keys(options).some((key) => key !== 'layer')) {
    throw new Error('createGlobalSheet only supports the layer option');
  }
  const data = buildSheet(options, hasOptions ? items : optionsOrItems as GlobalSheetItem<Style>, debug, true);
  const rules = collectStylePropSheetRules(data);
  const sheet = getGlobalSheet();
  sheet.updateLayers(CSS_CONFIG.layers ?? CSS_CONFIG_DEFAULT.layers ?? []);
  for (const rule of rules) sheet.insert(rule);
  sheet.flush();
}
