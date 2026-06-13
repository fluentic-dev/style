import { getDebugValueName, type DebugValueName } from './value';

const PROPERTY_MAP: Record<string, string> = {
  'margin': 'margin',
  'margin-top': 'margin-top',
  'margin-right': 'margin-right',
  'margin-bottom': 'margin-bottom',
  'margin-left': 'margin-left',
  'margin-inline': 'margin-inline',
  'margin-inline-start': 'margin-inline-start',
  'margin-inline-end': 'margin-inline-end',
  'margin-block': 'margin-block',
  'margin-block-start': 'margin-block-start',
  'margin-block-end': 'margin-block-end',
  'padding': 'padding',
  'padding-top': 'padding-top',
  'padding-right': 'padding-right',
  'padding-bottom': 'padding-bottom',
  'padding-left': 'padding-left',
  'padding-inline': 'padding-inline',
  'padding-inline-start': 'padding-inline-start',
  'padding-inline-end': 'padding-inline-end',
  'padding-block': 'padding-block',
  'padding-block-start': 'padding-block-start',
  'padding-block-end': 'padding-block-end',
  'width': 'width',
  'height': 'height',
  'min-width': 'min-w',
  'max-width': 'max-w',
  'min-height': 'min-h',
  'max-height': 'max-h',
  'background': 'bg',
  'background-color': 'bg',
  'background-image': 'background-image',
  'color': 'color',
  'font-size': 'font-size',
  'font-weight': 'font',
  'display': 'display',
  'position': 'pos',
  'top': 't',
  'right': 'r',
  'bottom': 'b',
  'left': 'l',
  'z-index': 'z',
  'gap': 'g',
  'grid-template-columns': 'grid-cols',
  'grid-template-rows': 'grid-rows',
  'flex-direction': 'flex',
  'justify-content': 'justify',
  'align-items': 'items',
  'border': 'border',
  'border-radius': 'radius',
  'opacity': 'opacity',
};

export type DebugPropertyName = {
  property: string;
} & DebugValueName;

export function getDebugPropertyName(
  property: string,
  value: string,
  maxLength: number,
  valueMaxLength: number,
): DebugPropertyName | null {
  if (!property) return null;

  const normalized = normalizePropertyName(property);

  // 1. FAST PATH: Check the map first (O(1) lookup, incredibly fast)
  const mapped = PROPERTY_MAP[normalized];
  if (mapped !== undefined) {
    return {
      property: mapped,
      ...getDebugValueName(mapped, value, maxLength, valueMaxLength),
    };
  }

  // 2. FALLBACK PATH: For uncommon properties or CSS variables
  let name = normalized;

  // Clean up CSS variables (--my-prop -> my-prop)
  if (name.charCodeAt(0) === 45 && name.charCodeAt(1) === 45) {
    name = name.slice(2);
  }

  name = name
    // Clean up structural dividers
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/[-_]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (!name) return null;

  return {
    property: name,
    ...getDebugValueName(name, value, maxLength, valueMaxLength),
  };
}

function normalizePropertyName(property: string) {
  return property
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/_/g, '-')
    .toLowerCase();
}
