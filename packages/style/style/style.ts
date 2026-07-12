import { createScopeBuilder, createSlotBuilder, createStyleBuilder, type SelectorsRecord } from '../builder';
import type { ClassNameFn } from '../builder/classname';
import { isStyleData } from '../builder/data';
import { mergeStyleData } from '../builder/style_data';
import { createDefaultFnResult } from '../builder/style_fns';
import type { typeAliases } from '../builder/types/alias';
import type { StableIdInput } from '../css/utils';
import { PrioritySelectors } from '../selector/presets';
import { symbol } from '../utils/symbol';
import { type } from '../utils/type';
import type { Type } from '../utils/type';
import { createStyleKeyframes } from './keyframes';
import type { ClassNameTransform, StyleTransform } from './transform';
import type { CSSProperties } from './types';

const META: unique symbol = symbol('style.fn:meta');

export type StyleFnMeta =
  | {
    mode: 'StyleObject';
    selectors: SelectorsRecord;
    transform: StyleTransform | null;
  }
  | {
    mode: 'ClassName';
    selectors: SelectorsRecord;
    transform: ClassNameTransform;
  };

export const { style } = createStyleFn({
  style: type<CSSProperties>,
  selectors: PrioritySelectors,
});

export type StyleFn<Style = any, Selectors extends SelectorsRecord = any> = ReturnType<
  typeof createStyleFn<Style, Selectors>
>['style'];

export function createStyleFn<
  Style = CSSProperties,
  const Selectors extends SelectorsRecord = typeof PrioritySelectors,
>(args: {
  style?: Type<Style>;
  selectors: Selectors;
  transform?: StyleTransform<Style> | null;
}) {
  const { selectors, transform = null } = args;

  type Types = ReturnType<typeof typeAliases<Style, Selectors>>;

  const fnStyle = createStyleBuilder<Style, Selectors>(selectors, transform);
  const fnSlot = createSlotBuilder<Style, Selectors>(selectors, transform);
  const fnScope = createScopeBuilder<Selectors>(selectors);

  const fnValue: Types['ValueFn'] = (value, weight) => {
    return [weight, value];
  };
  const fnRaw: Types['RawFn'] = (style) => style;
  const fnPlain: Types['PlainFn'] = (style) => style;
  const fnKeyframes: Types['KeyframesFn'] =
    ((frames, stableId?: StableIdInput) => createStyleKeyframes(frames, transform ?? null, stableId)) as Types[
      'KeyframesFn'
    ];
  const fnMerge: Types['MergeFn'] = ((target: unknown, ...styles: unknown[]) => {
    let result = target;

    for (let i = 0; i < styles.length; i++) {
      result = mergeStyleResult(result, styles[i]);
    }

    return result;
  }) as Types['MergeFn'];

  const style = fnStyle as unknown as Types['StyleFn'];

  style.slot = fnSlot;
  style.scope = fnScope;
  style.value = fnValue;
  style.raw = fnRaw;
  style.plain = fnPlain;
  style.keyframes = fnKeyframes;
  style.merge = fnMerge;

  const meta: StyleFnMeta = {
    mode: 'StyleObject',
    selectors,
    transform: transform ?? null,
  };

  assignStyleFnMeta(style, meta);

  return { style };
}

function mergeStyleResult(
  target: unknown,
  style: unknown,
) {
  if (isStyleData(target)) {
    return createDefaultFnResult(
      mergeStyleData(
        target,
        null,
        isStyleData(style) ? style : null,
        null,
        null,
        null,
      ),
      Object.getPrototypeOf(target),
    );
  }

  const chainMerge = (target as { merge?: unknown; } | null)?.merge;
  if (typeof chainMerge === 'function') return chainMerge.call(target, style);

  return target;
}

export type StyleFnWithMeta = StyleFn | ClassNameFn<any, any>;

export function assignStyleFnMeta<T extends object>(
  styleFn: T,
  meta: StyleFnMeta,
) {
  Object.assign(styleFn, { [META]: meta });
  return styleFn;
}

export function getStyleFnMeta(styleFn: StyleFnWithMeta) {
  return (styleFn as any)[META] as StyleFnMeta;
}
