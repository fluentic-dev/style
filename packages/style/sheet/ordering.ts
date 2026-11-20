import { compareLayerPriority, createLayerPool, getLayerBlockCss, getLayerOrderCss } from '../atomic/layer';
import { CSS_CONFIG, CSS_CONFIG_DEFAULT, type CssConfig, isStyleLayerEnabled } from '../config/config/css';
import type { SheetRule } from './types';
import { getSheetRuleLayerPriority, getSheetRulePriority } from './utils/layer';

export type OrderedRule = Pick<
  SheetRule,
  'css' | 'priority' | 'layer' | 'important' | 'importantNative' | 'sheet' | 'globalSheet'
>;
export type OrderingConfig = Pick<CssConfig, 'layer' | 'layers' | 'layerNamespace'>;

export function sheetRuleLayer(rule: OrderedRule, config: OrderingConfig = CSS_CONFIG): SheetRule['layer'] {
  const mainEnabled = isStyleLayerEnabled(config.layer);
  let layer = rule.layer ?? 'style';
  if (layer === 'style' && !mainEnabled) layer = false;
  if (rule.sheet && rule.important && !rule.importantNative && layer !== false) {
    const name = typeof layer === 'object' ? layer.name : config.layerNamespace || 'css';
    return { name: name + '.important' };
  }
  return layer;
}

export function sheetRuleGroup(rule: OrderedRule, config: OrderingConfig = CSS_CONFIG) {
  if (rule.globalSheet) return 'global:' + rule.globalSheet.id;
  return rule.sheet && sheetRuleLayer(rule, config) === false ? 'local-unlayered' : 'regular';
}

export function compareSheetGroups(a: OrderedRule, b: OrderedRule) {
  const region = (rule: OrderedRule) => rule.globalSheet ? rule.globalSheet.order <= 0 ? 0 : 2 : 1;
  const order = region(a) - region(b);
  if (order) return order;
  if (a.globalSheet && b.globalSheet) return a.globalSheet.order - b.globalSheet.order;
  return 0;
}

export function compareSheetRules(a: OrderedRule, b: OrderedRule, config: OrderingConfig = CSS_CONFIG) {
  const layerRank = (rule: OrderedRule) => {
    const layer = sheetRuleLayer(rule, config);
    const main = config.layerNamespace || 'css';
    return layer === false ? 2 : layer === 'style' || (typeof layer === 'object' && layer.name === main) ? 0 : 1;
  };
  return layerRank(a) - layerRank(b) ||
    compareLayerPriority(getSheetRulePriority(a.priority), getSheetRulePriority(b.priority));
}

/** Stable group sort: equal global orders keep the first-discovered sheet first. */
export function orderSheetRules<T extends OrderedRule>(rules: readonly T[], config: OrderingConfig = CSS_CONFIG): T[] {
  const groups = new Map<string, T[]>();
  for (const rule of rules) {
    const key = sheetRuleGroup(rule, config);
    const group = groups.get(key) ?? [];
    group.push(rule);
    groups.set(key, group);
  }
  return [...groups.entries()].sort(([ak, a], [bk, b]) =>
    compareSheetGroups(a[0], b[0]) ||
    (!a[0].globalSheet && !b[0].globalSheet ? Number(ak === 'local-unlayered') - Number(bk === 'local-unlayered') : 0)
  ).flatMap(([, group]) => group.slice().sort((a, b) => compareSheetRules(a, b, config)));
}

/** Reserve each parent's first child for managed important declarations. */
export function sheetLayerOrder(
  names: readonly string[],
  config: OrderingConfig = CSS_CONFIG,
  reservedParents: readonly string[] = names,
) {
  const roots: string[] = [];
  const children = new Map<string, string[]>();
  const add = (name: string) => {
    const parts = name.split('.');
    if (!roots.includes(parts[0])) roots.push(parts[0]);
    for (let i = 1; i < parts.length; i++) {
      const parent = parts.slice(0, i).join('.');
      const child = parts.slice(0, i + 1).join('.');
      const list = children.get(parent) ?? [];
      if (!list.includes(child)) list.push(child);
      children.set(parent, list);
    }
    if (!name.endsWith('.important') && reservedParents.includes(name)) children.set(name, children.get(name) ?? []);
  };
  for (
    const name of [...(config.layers ?? CSS_CONFIG_DEFAULT.layers ?? []).filter((name) => name !== '$layer'), ...names]
  ) add(name);
  const rootOrder = getLayerOrderCss(
    (config.layers ?? CSS_CONFIG_DEFAULT.layers ?? []).map((name) => name === '$layer' ? name : name.split('.')[0]),
    roots,
  );
  const declarations = [rootOrder];
  for (const [parent, list] of children) {
    if (parent.endsWith('.important')) continue;
    declarations.push('@layer ' + [...new Set([parent + '.important', ...list])].join(', ') + ';');
  }
  return declarations.filter(Boolean).join('\n');
}

function layerNameForRule(
  rule: OrderedRule,
  config: OrderingConfig,
  mode: 'sort' | 'layer',
  pool: ReturnType<typeof createLayerPool>,
) {
  const layer = sheetRuleLayer(rule, config);
  return typeof layer === 'object' ? layer.name : layer === false ? null : layer === 'sheet'
    ? (config.layerNamespace || 'css') + '.sheet'
    : mode === 'layer'
    ? pool.getName(getSheetRuleLayerPriority(rule.priority, rule.important))
    : config.layerNamespace || 'css';
}

/** Build only ordering declarations; runtime flushing need not serialize rule bodies. */
export function sheetOrderingPreamble(
  rules: readonly OrderedRule[],
  config: OrderingConfig = CSS_CONFIG,
  mode: 'sort' | 'layer' = 'sort',
) {
  const pool = createLayerPool(config.layerNamespace || 'css');
  const names = new Set<string>();
  for (const rule of orderSheetRules(rules, config)) {
    const name = layerNameForRule(rule, config, mode, pool);
    if (name) names.add(name);
  }
  const priorities = pool.getNames();
  const named = [...names].filter((name) => !priorities.includes(name));
  return sheetLayerOrder([...priorities, ...named], config, named);
}

export function serializeOrderedRules(
  rules: readonly OrderedRule[],
  config: OrderingConfig = CSS_CONFIG,
  mode: 'sort' | 'layer' = 'sort',
) {
  const pool = createLayerPool(config.layerNamespace || 'css');
  const rendered = orderSheetRules(rules, config).map((rule) => {
    const name = layerNameForRule(rule, config, mode, pool);
    return name ? getLayerBlockCss(name, rule.css) : rule.css;
  });
  return [sheetOrderingPreamble(rules, config, mode), ...rendered].filter(Boolean).join('\n');
}
