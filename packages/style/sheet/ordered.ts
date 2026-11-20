import { CSS_CONFIG } from '../config/config/css';
import { DEV_CONFIG } from '../config/config/dev';
import { globalData } from '../utils/global';
import {
  compareSheetGroups,
  compareSheetRules,
  sheetOrderingPreamble,
  sheetRuleGroup,
  sheetRuleLayer,
} from './ordering';
import type { SheetOptions, SheetRule, StyleSheet } from './types';
import { createStyleTag, resolveDocument } from './utils/dom';

const refreshers = globalData<Set<() => void>>('sheet.ordered.refreshers', () => new Set());
export function refreshOrderedSheets() {
  for (const refresh of refreshers) refresh();
}

type Group = { name: string; tagName?: string; rules: SheetRule[]; sheet: StyleSheet; };

/** Keep whole global sheets together; move DOM groups without rebuilding unrelated rules. */
export function createOrderedSheet(
  create: (options: SheetOptions) => StyleSheet,
  options: SheetOptions,
  dev: boolean,
): StyleSheet {
  const document = resolveDocument(options.document);
  if (!document) return create(options);
  const groups = new Map<string, Group>();
  const owners = new Map<string, SheetRule[]>();
  const direct: SheetRule[] = [];
  const seen = new Set<string>();
  let activeLayers: readonly string[] | undefined = CSS_CONFIG.layers;
  let enabled = false;
  let header: HTMLStyleElement | null = null;
  let serial = 0;
  let dirty = false;
  let mode = DEV_CONFIG.stylePriorityMode;
  const pending = new Set<Group>();
  const regular = getGroup('regular');
  const refresh = () => {
    dirty = true;
    flush();
  };
  if (dev) refreshers.add(refresh);

  function getGroup(name: string): Group {
    const previous = groups.get(name);
    if (previous) return previous;
    const tagName = name === 'regular'
      ? options.tagName
      : (options.tagName ? options.tagName + ' ' : '') + 'ordered-' + ++serial;
    const group = { name, tagName, rules: [], sheet: create({ ...options, tagName }) };
    group.sheet.updateLayers(activeLayers ?? []);
    groups.set(name, group);
    return group;
  }

  function route(rule: SheetRule): SheetRule {
    return { ...rule, layer: sheetRuleLayer(rule) };
  }

  function insert(rule: SheetRule | string) {
    const item = typeof rule === 'string' ? { css: rule } : rule;
    const groupName = sheetRuleGroup(item);
    const key = groupName + '\0' + (item.key ?? item.css);
    if (seen.has(key)) return;
    seen.add(key);
    direct.push(item);
    add(item);
  }

  function add(item: SheetRule) {
    enabled ||= !!(item.sheet || item.globalSheet);
    const group = getGroup(sheetRuleGroup(item));
    const previous = group.rules[group.rules.length - 1];
    group.rules.push(item);
    if (enabled && previous && compareSheetRules(previous, item) > 0) pending.add(group);
    if (!pending.has(group)) group.sheet.insert(route(item));
    dirty = true;
  }

  function rebuild(group: Group) {
    pending.delete(group);
    group.sheet.destroy?.();
    group.sheet = create({ ...options, tagName: group.tagName });
    group.sheet.updateLayers(activeLayers ?? []);
    group.rules.sort((a, b) => compareSheetRules(a, b));
    for (const rule of group.rules) group.sheet.insert(route(rule));
    group.sheet.flush();
    dirty = true;
  }

  function collectTags() {
    const lookup = new Map([...groups.values()].map((group) => [group.tagName ?? '', group]));
    const result = new Map<Group, HTMLStyleElement[]>();
    const head = document!.head || document!.documentElement;
    for (const node of Array.from(head.childNodes)) {
      if (typeof (node as Element).getAttribute !== 'function') continue;
      const name = (node as Element).getAttribute('data-css-sheet');
      const match = name?.match(/^(?:(.*) )?(?:layers|rules(?: .*)?)$/);
      const group = match && lookup.get(match[1] ?? '');
      if (!group) continue;
      const list = result.get(group) ?? [];
      list.push(node as HTMLStyleElement);
      result.set(group, list);
    }
    return result;
  }

  function flush() {
    if (dev && mode !== DEV_CONFIG.stylePriorityMode) {
      mode = DEV_CONFIG.stylePriorityMode;
      dirty = true;
    }
    for (const group of pending) rebuild(group);
    pending.clear();
    for (const group of groups.values()) group.sheet.flush();
    if (!enabled || !dirty) return;
    const config = { ...CSS_CONFIG, layers: activeLayers ? [...activeLayers] : undefined };
    const all = [...groups.values()].flatMap((group) => group.rules);
    const order = sheetOrderingPreamble(all, config, dev ? DEV_CONFIG.stylePriorityMode : 'layer');
    const head = document!.head || document!.documentElement;
    const groupTags = collectTags();
    if (!header) {
      header = createStyleTag(document!, (options.tagName ? options.tagName + ' ' : '') + 'ordering', options.nonce);
      const first = groupTags.get(regular)?.[0];
      if (first) head.insertBefore(header, first);
      else head.appendChild(header);
    }
    if (header.textContent !== order) header.textContent = order;
    const sorted = [...groups.values()].sort((a, b) => {
      const ar = a.rules[0] ?? { css: '' };
      const br = b.rules[0] ?? { css: '' };
      return compareSheetGroups(ar, br) || (!ar.globalSheet && !br.globalSheet
        ? Number(a.name === 'local-unlayered') - Number(b.name === 'local-unlayered')
        : 0);
    });
    let previous: Node = header;
    for (const group of sorted) {
      for (const tag of groupTags.get(group) ?? []) {
        if (previous.nextSibling !== tag) {
          const oldSheet = tag.sheet;
          const css = oldSheet ? Array.from(oldSheet.cssRules).map((rule) => rule.cssText) : [];
          head.insertBefore(tag, previous.nextSibling);
          // Moving a style element can recreate its CSSOM and discard insertRule writes.
          if (oldSheet && tag.sheet !== oldSheet && css.length && !tag.sheet?.cssRules.length) {
            for (const rule of css) tag.sheet?.insertRule(rule, tag.sheet.cssRules.length);
          }
        }
        previous = tag;
      }
    }
    dirty = false;
  }

  return {
    insert,
    flush,
    updateLayers(layers) {
      if (activeLayers?.length === layers.length && layers.every((name, index) => activeLayers![index] === name)) {
        return;
      }
      activeLayers = [...layers];
      for (const group of groups.values()) group.sheet.updateLayers(layers);
      dirty = true;
    },
    replaceRules(owner, rules) {
      const previous = owners.get(owner) ?? [];
      owners.set(owner, rules);
      enabled = true;
      const affected = new Set([...previous, ...rules].map((rule) => sheetRuleGroup(rule)));
      const all = [...direct, ...[...owners.values()].flat()];
      for (const name of affected) {
        const group = getGroup(name);
        group.rules = all.filter((rule) => sheetRuleGroup(rule) === name);
        rebuild(group);
      }
      flush();
    },
    destroy() {
      refreshers.delete(refresh);
      for (const group of groups.values()) group.sheet.destroy?.();
      if (header?.parentNode) header.parentNode.removeChild(header);
      groups.clear();
    },
  };
}
