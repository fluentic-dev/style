import { getNamedToken } from '../../../dialect';
import { classNameTransform } from '../../../style/transform';
import type { CSSProperties } from '../../../style/types';
import { TailwindSelectors } from '../selectors';
import { createTailwindExtendedStyleTransform, createTailwindStyleConfig } from '../style';
import type { TailwindScale, TailwindStyleConfig, TailwindTheme } from '../types';
import type { TailwindClassName, TailwindClassNameFor } from './types';

export function createTailwindClassNamePreset<const Theme extends TailwindTheme>(
  config: TailwindStyleConfig<Theme>,
): {
  selectors: typeof TailwindSelectors;
  transform: ReturnType<typeof createTailwindClassNameTransform<Theme>>;
} {
  return {
    selectors: TailwindSelectors,
    transform: createTailwindClassNameTransform(config),
  };
}

export function createTailwindClassNameTransform<const Theme extends TailwindTheme = TailwindTheme>(
  config: TailwindStyleConfig<Theme> = createTailwindStyleConfig({}),
) {
  const objectTransform = createTailwindExtendedStyleTransform(config);

  return classNameTransform<TailwindClassNameFor<Theme>>({
    transform(className) {
      return objectTransform.transform(classNameToStyle(className as TailwindClassName, config.theme) as any);
    },
  });
}

function classNameToStyle(className: TailwindClassName, theme: TailwindTheme): Record<string, unknown> {
  const arbitrary = parseArbitraryClassName(className);
  if (arbitrary) return arbitrary;

  switch (className) {
    case 'block':
    case 'inline-block':
    case 'inline-flex':
    case 'flex':
    case 'grid':
    case 'hidden':
    case 'relative':
    case 'absolute':
    case 'fixed':
    case 'sticky':
      return { [toCamelCase(className)]: true };
    case 'items-start':
      return { items: 'start' };
    case 'items-end':
      return { items: 'end' };
    case 'items-center':
      return { items: 'center' };
    case 'items-baseline':
      return { items: 'baseline' };
    case 'items-stretch':
      return { items: 'stretch' };
    case 'justify-start':
      return { justify: 'start' };
    case 'justify-end':
      return { justify: 'end' };
    case 'justify-center':
      return { justify: 'center' };
    case 'justify-between':
      return { justify: 'between' };
    case 'justify-around':
      return { justify: 'around' };
    case 'justify-evenly':
      return { justify: 'evenly' };
    case 'flex-row':
      return { direction: 'row' };
    case 'flex-row-reverse':
      return { direction: 'rowReverse' };
    case 'flex-col':
      return { direction: 'col' };
    case 'flex-col-reverse':
      return { direction: 'colReverse' };
    case 'flex-wrap':
      return { wrap: true };
    case 'flex-wrap-reverse':
      return { wrap: 'reverse' };
    case 'shrink-0':
      return { flexShrink: 0 };
    case 'overflow-hidden':
      return { overflow: 'hidden' };
    case 'overflow-auto':
      return { overflow: 'auto' };
    case 'overflow-x-hidden':
      return { overflowX: 'hidden' };
    case 'overflow-x-auto':
      return { overflowX: 'auto' };
    case 'overflow-y-hidden':
      return { overflowY: 'hidden' };
    case 'overflow-y-auto':
      return { overflowY: 'auto' };
    case 'cursor-pointer':
      return { cursor: 'pointer' };
    case 'outline-none':
      return { outline: 'none' };
    case 'whitespace-nowrap':
      return { whiteSpace: 'nowrap' };
    case 'min-w-0':
      return { minW: 0 };
    case 'justify-self-end':
      return { justifySelf: 'end' };
  }

  if (className.startsWith('gap-x-')) return { gapX: ref(className, 'gap-x-', theme.spacing) };
  if (className.startsWith('gap-y-')) return { gapY: ref(className, 'gap-y-', theme.spacing) };
  if (className.startsWith('gap-')) return { gap: ref(className, 'gap-', theme.spacing) };
  if (className.startsWith('mt-')) return { mt: ref(className, 'mt-', theme.spacing) };
  if (className.startsWith('mx-')) return { mx: ref(className, 'mx-', theme.spacing) };
  if (className.startsWith('my-')) return { my: ref(className, 'my-', theme.spacing) };
  if (className.startsWith('m-')) return { m: ref(className, 'm-', theme.spacing) };
  if (className.startsWith('px-')) return { px: ref(className, 'px-', theme.spacing) };
  if (className.startsWith('py-')) return { py: ref(className, 'py-', theme.spacing) };
  if (className.startsWith('pt-')) return { pt: ref(className, 'pt-', theme.spacing) };
  if (className.startsWith('pr-')) return { pr: ref(className, 'pr-', theme.spacing) };
  if (className.startsWith('pb-')) return { pb: ref(className, 'pb-', theme.spacing) };
  if (className.startsWith('pl-')) return { pl: ref(className, 'pl-', theme.spacing) };
  if (className.startsWith('p-')) return { p: ref(className, 'p-', theme.spacing) };
  if (className.startsWith('max-w-')) return { maxW: ref(className, 'max-w-', [theme.sizes, theme.spacing]) };
  if (className.startsWith('min-w-')) return { minW: ref(className, 'min-w-', [theme.sizes, theme.spacing]) };
  if (className.startsWith('min-h-')) return { minH: ref(className, 'min-h-', [theme.sizes, theme.spacing]) };
  if (className.startsWith('size-')) return { size: ref(className, 'size-', [theme.sizes, theme.spacing]) };
  if (className.startsWith('w-')) return { w: ref(className, 'w-', [theme.sizes, theme.spacing]) };
  if (className.startsWith('h-')) return { h: ref(className, 'h-', [theme.sizes, theme.spacing]) };
  if (className.startsWith('bg-')) return { bg: ref(className, 'bg-', theme.colors) };
  if (className.startsWith('text-')) return { text: ref(className, 'text-', [theme.fontSizes, theme.colors]) };
  if (className.startsWith('font-')) return { font: ref(className, 'font-', theme.fontWeights) };
  if (className.startsWith('leading-')) return { leading: ref(className, 'leading-', theme.lineHeights) };
  if (className.startsWith('rounded-')) return { rounded: ref(className, 'rounded-', theme.radii) };
  if (className.startsWith('shadow-')) return { shadow: ref(className, 'shadow-', theme.shadows) };
  if (className.startsWith('border-')) return borderStyle(className.slice('border-'.length), theme);
  if (className.startsWith('outline-')) return { outlineColor: ref(className, 'outline-', theme.colors) };

  return {};
}

function ref(className: string, prefix: string, scale?: TailwindScale | (TailwindScale | undefined)[]) {
  const value = className.slice(prefix.length);
  if (value.startsWith('[') && value.endsWith(']')) return value.slice(1, -1).replace(/_/g, ' ');
  if (value === 'auto') return value;
  return scaleRef(value, scale);
}

function borderStyle(value: string, theme: TailwindTheme): Record<string, unknown> {
  if (value.startsWith('[') && value.endsWith(']')) return { border: value.slice(1, -1).replace(/_/g, ' ') };
  if (/^\d/.test(value)) return { border: value.replace(/_/g, ' ') };
  return { borderColor: scaleRef(value, theme.colors) };
}

function scaleRef(value: string, scale?: TailwindScale | (TailwindScale | undefined)[]) {
  const scales = Array.isArray(scale) ? scale : [scale];
  const path = value.replace(/-/g, '.');
  const camelPath = toCamelCase(value);
  const candidates = value === path
    ? value === camelPath ? [value] : [value, camelPath]
    : camelPath === value
    ? [value, path]
    : [value, path, camelPath];

  for (let candidateIndex = 0; candidateIndex < candidates.length; candidateIndex++) {
    const candidate = candidates[candidateIndex];
    for (let scaleIndex = 0; scaleIndex < scales.length; scaleIndex++) {
      const item = scales[scaleIndex];
      if (item && hasScalePath(item, candidate)) return `$${candidate}`;
    }
  }

  return `$${path}`;
}

function hasScalePath(scale: TailwindScale, path: string) {
  if (path in scale) return true;
  if (getNamedToken(scale, `$${path}`)) return true;

  const parts = path.split('.');
  let current: unknown = scale;

  for (let i = 0; i < parts.length; i++) {
    if (!current || typeof current !== 'object') return false;
    if (!(parts[i] in current)) return false;
    current = (current as Record<string, unknown>)[parts[i]];
  }

  return true;
}

function parseArbitraryClassName(className: string): CSSProperties | null {
  if (!className.startsWith('[') || !className.endsWith(']')) return null;

  const body = className.slice(1, -1);
  const splitAt = body.indexOf(':');
  if (splitAt < 1) return null;

  const property = toCamelCase(body.slice(0, splitAt));
  const value = body.slice(splitAt + 1).replace(/_/g, ' ');

  return {
    [property]: value,
  } as CSSProperties;
}

function toCamelCase(value: string) {
  return value.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
}
