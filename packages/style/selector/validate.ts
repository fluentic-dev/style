import { parse, SelectorType } from 'css-what';
import type { Selector } from 'css-what';

type SelectorGroup = Selector[];
type SelectorGroups = SelectorGroup[];

export function isLocalSelector(selector: string) {
  const groups = parseSelector(selector);

  if (!groups || groups.length !== 1) return false;

  return isSelectorGroupsSelf(groups, false);
}

export function isPseudoArgSelector(selector: string) {
  const groups = parseSelector(selector);

  if (!groups || groups.length !== 1) return false;

  return isSelectorGroupsSelf(groups, true);
}

export function isTagSelector(selector: string) {
  const groups = parseSelector(selector);

  if (!groups || groups.length !== 1) return false;

  const group = groups[0];

  return group.length === 1 && group[0].type === SelectorType.Tag;
}

export function isAttrArg(value: string) {
  if (!value) return false;

  // reject already wrapped attrs: attr('data-x'), not attr('[data-x]')
  if (value.includes('[') || value.includes(']')) return false;

  // cheap sanity only
  return true;
}

export function isRawValue(value: string) {
  if (!value) return false;

  // avoid accidentally accepting whole rules
  if (value.includes('{') || value.includes('}')) return false;

  return true;
}

function parseSelector(selector: string): SelectorGroups | undefined {
  try {
    return parse(selector);
  } catch {
    return undefined;
  }
}

function isSelectorGroupsSelf(groups: SelectorGroups, allowTag: boolean) {
  for (let i = 0; i < groups.length; i++) {
    const group = groups[i];

    for (let j = 0; j < group.length; j++) {
      const token = group[j];

      if (!isAllowedSelectorType(token.type, allowTag)) {
        return false;
      }

      if (
        token.type === SelectorType.Pseudo &&
        Array.isArray(token.data) &&
        !isSelectorGroupsSelf(token.data, allowTag)
      ) {
        return false;
      }
    }
  }

  return true;
}

function isAllowedSelectorType(type: SelectorType, allowTag: boolean) {
  return (
    type === SelectorType.Attribute ||
    type === SelectorType.Pseudo ||
    type === SelectorType.PseudoElement ||
    (allowTag && type === SelectorType.Tag)
  );
}
