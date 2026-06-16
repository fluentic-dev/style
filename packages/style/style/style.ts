import { createScopeBuilder, createSlotBuilder, createStyleBuilder, type SelectorsRecord } from '../builder';
import type { typeAliases } from '../builder/types/alias';
import { PrioritySelectors } from '../selector/presets';
import { symbol } from '../utils/const';
import { type } from '../utils/type';
import type { Type } from '../utils/type';
import { createStyleKeyframes } from './keyframes';
import type { StyleTransform } from './transform';
import type { CSSProperties } from './types';

const META: unique symbol = symbol('style.fn:meta');

type StyleFnMeta = {
  selectors: SelectorsRecord;
  transform: StyleTransform | null;
};

export const { style } = createStyleFn({
  style: type<CSSProperties>,
  selectors: PrioritySelectors,
});

export type StyleFn<Style = any, Selectors extends SelectorsRecord = any> = ReturnType<
  typeof createStyleFn<Style, Selectors>
>['style'];

export function createStyleFn<
  Style,
  const Selectors extends SelectorsRecord,
>(args: {
  style: Type<Style>;
  selectors: Selectors;
  transform?: StyleTransform<Style> | null;
}) {
  const { selectors, transform = null } = args;

  type Types = ReturnType<typeof typeAliases<Style, Selectors>>;

  const fnStyle = createStyleBuilder<Style, Selectors>(selectors, transform);
  const fnSlot = createSlotBuilder<Style, Selectors>(selectors, transform);
  const fnScope = createScopeBuilder<Style, Selectors>(selectors);

  const fnValue: Types['ValueFn'] = (value, weight) => {
    return [weight, value];
  };
  const fnRaw: Types['RawFn'] = (style) => style;
  const fnPlain: Types['PlainFn'] = (style) => style;
  const fnKeyframes: Types['KeyframesFn'] =
    ((frames, stableId?: string) => createStyleKeyframes(frames, transform ?? null, stableId)) as Types['KeyframesFn'];

  const style = fnStyle as unknown as Types['StyleFn'];

  style.slot = fnSlot;
  style.scope = fnScope;
  style.value = fnValue;
  style.raw = fnRaw;
  style.plain = fnPlain;
  style.keyframes = fnKeyframes;

  const meta: StyleFnMeta = {
    selectors,
    transform: transform ?? null,
  };

  Object.assign(style, { [META]: meta });

  return { style };
}

export function getStyleFnMeta(styleFn: StyleFn) {
  return (styleFn as any)[META] as StyleFnMeta;
}
