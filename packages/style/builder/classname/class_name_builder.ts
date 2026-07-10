import { DEV_CONFIG } from '../../config/config/dev';
import type { Selector } from '../../selector';
import { type ClassNameTransform, classNameValue, isClassNameValue } from '../../style';
import type { StyleValueTuple } from '../../style/types';
import { traceMarker } from '../../utils/trace';
import {
  createStyleData,
  type DebugData,
  isDebugData,
  isStyleData,
  normalizeSelectorArg,
  SELECTOR_ARG,
  SELECTOR_ARGS,
  SELECTOR_AT_RULE,
  SELECTOR_CONTAINER,
  SELECTOR_MEDIA,
  SELECTOR_MERGE,
} from '../data';
import { checkSelector } from '../data/check_selector';
import { mergeStyleData } from '../style_data';
import { createDefaultFnResult, createFns } from '../style_fns';
import type { SelectorsRecord } from '../types';
import { FnPrefixStyle, resolveCallsite } from '../utils';
import type { ClassNameBuilder, ClassNameFn, ClassNameItem, ClassNameMergeData, WeightedClassName } from './types';

type StyleRecord = Record<string, unknown>;
type FlattenedClassName<ClassName extends string> = {
  className: ClassName;
  weight: number | null;
};

export function createClassNameBuilder<
  ClassName extends string,
  Selectors extends SelectorsRecord,
>(
  selectors: Selectors,
  transform: ClassNameTransform<ClassName>,
) {
  const fns = createFns(
    selectors,
    FnPrefixStyle,
    (fns, fnName, selector) => createClassNameFn(fns, FnPrefixStyle, fnName, selector, transform),
  );

  const fn = (...params: unknown[]) => {
    const [items, debug] = splitDebug(params);
    const callsite = resolveCallsite(debug);
    const { style, debug: styleDebug } = classNameItemsToStyle(items as ClassNameItem<ClassName>[], transform, debug);

    const data = mergeStyleData(
      createStyleData(callsite),
      callsite,
      style,
      styleDebug,
      null,
      null,
    );

    return createDefaultFnResult(data, fns);
  };

  traceMarker(fn, 'className');

  return fn as unknown as ClassNameFn<ClassName, Selectors>;
}

function createClassNameFn<ClassName extends string>(
  fns: Record<string, Function>,
  fnPrefix: string,
  fnName: string,
  fnSelector: Selector,
  transform: ClassNameTransform<ClassName>,
) {
  const selector = fnSelector.selector.trim();

  fnSelector = { ...fnSelector, selector };

  if (selector.startsWith(SELECTOR_AT_RULE)) {
    return createAtRuleFn(fns, fnPrefix, fnName, fnSelector, transform);
  }

  if (selector.includes(SELECTOR_ARGS)) {
    return createArgsFn(fns, fnPrefix, fnName, fnSelector, transform);
  }

  if (selector.includes(SELECTOR_ARG)) {
    return createArgFn(fns, fnPrefix, fnName, fnSelector, transform);
  }

  if (selector !== SELECTOR_MERGE) {
    return createSimpleFn(fns, fnSelector, transform);
  }

  return createMergeFn(fns);
}

function createMergeFn(fns: Record<string, Function>) {
  return function<ClassName extends string>(
    this: ClassNameBuilder<ClassName, any>,
    ...params: unknown[]
  ) {
    const [styles, debug] = splitDebug(params);
    const callsite = resolveCallsite(debug);

    let data = this;

    for (const style of styles as ClassNameMergeData<ClassName>[]) {
      const items = Array.isArray(style) ? style : [style];

      for (const item of items) {
        data = mergeStyleData(
          data,
          callsite,
          isStyleData(item) ? item : null,
          debug ?? null,
          null,
          null,
        );
      }
    }

    return createDefaultFnResult(data, fns);
  };
}

function createAtRuleFn<ClassName extends string>(
  fns: Record<string, Function>,
  fnPrefix: string,
  fnName: string,
  fnSelector: Selector,
  transform: ClassNameTransform<ClassName>,
) {
  const isMedia = fnSelector.selector.startsWith(SELECTOR_MEDIA) ||
    fnSelector.selector.startsWith(SELECTOR_CONTAINER);
  const hasArg = fnSelector.selector.includes(SELECTOR_ARGS);

  const [before, after] = fnSelector.selector.split(SELECTOR_ARGS);

  return function(
    this: ClassNameBuilder<ClassName, any>,
    ...params: unknown[]
  ) {
    const [withoutDebug, debug] = splitDebug(params);

    let arg: string | readonly string[];
    let items: readonly ClassNameItem<ClassName>[];
    let priority: number | null = null;

    if (hasArg) {
      if (isMedia && typeof withoutDebug[0] === 'number') {
        priority = withoutDebug[0];
        arg = withoutDebug[1] as string | readonly string[];
        items = withoutDebug.slice(2) as readonly ClassNameItem<ClassName>[];
      } else {
        arg = withoutDebug[0] as string | readonly string[];
        items = withoutDebug.slice(1) as readonly ClassNameItem<ClassName>[];
      }
    } else if (isMedia && typeof withoutDebug[0] === 'number') {
      priority = withoutDebug[0];
      arg = fnSelector.selector;
      items = withoutDebug.slice(1) as readonly ClassNameItem<ClassName>[];
    } else {
      arg = fnSelector.selector;
      items = withoutDebug as readonly ClassNameItem<ClassName>[];
    }

    const callsite = resolveCallsite(debug);
    const args = Array.isArray(arg) ? arg : [arg];
    const classNameStyle = classNameItemsToStyle(items, transform, debug);

    let data = this;

    for (const argItem of args) {
      let selector = argItem;

      if (hasArg && DEV_CONFIG.isCheckSelectorEnabled) {
        checkSelector(fnPrefix, fnName, fnSelector, selector);
      }

      selector = hasArg
        ? before + normalizeSelectorArg(selector) + after
        : selector;

      data = mergeStyleData(
        data,
        callsite,
        classNameStyle.style,
        classNameStyle.debug,
        null,
        [priority !== null ? [selector, priority] : selector],
      );
    }

    return createDefaultFnResult(data, fns);
  };
}

function createArgsFn<ClassName extends string>(
  fns: Record<string, Function>,
  fnPrefix: string,
  fnName: string,
  fnSelector: Selector,
  transform: ClassNameTransform<ClassName>,
) {
  const [before, after] = fnSelector.selector.split(SELECTOR_ARGS);
  const priority = fnSelector.priority;

  return function(
    this: ClassNameBuilder<ClassName, any>,
    arg: string | readonly string[],
    ...params: unknown[]
  ) {
    const [items, debug] = splitDebug(params);
    const callsite = resolveCallsite(debug);
    const args = Array.isArray(arg) ? arg : [arg];
    const classNameStyle = classNameItemsToStyle(items as ClassNameItem<ClassName>[], transform, debug);

    let data = this;

    for (const argItem of args) {
      if (DEV_CONFIG.isCheckSelectorEnabled) {
        checkSelector(fnPrefix, fnName, fnSelector, argItem);
      }

      const selector = before + normalizeSelectorArg(argItem) + after;

      data = mergeStyleData(
        data,
        callsite,
        classNameStyle.style,
        classNameStyle.debug,
        priority !== null ? [selector, priority] : selector,
        null,
      );
    }

    return createDefaultFnResult(data, fns);
  };
}

function createArgFn<ClassName extends string>(
  fns: Record<string, Function>,
  fnPrefix: string,
  fnName: string,
  fnSelector: Selector,
  transform: ClassNameTransform<ClassName>,
) {
  const [before, after] = fnSelector.selector.split(SELECTOR_ARG);
  const priority = fnSelector.priority;

  return function(
    this: ClassNameBuilder<ClassName, any>,
    arg: string,
    ...params: unknown[]
  ) {
    const [items, debug] = splitDebug(params);
    const callsite = resolveCallsite(debug);

    if (DEV_CONFIG.isCheckSelectorEnabled) {
      checkSelector(fnPrefix, fnName, fnSelector, arg);
    }

    const selector = before + normalizeSelectorArg(arg) + after;
    const classNameStyle = classNameItemsToStyle(items as ClassNameItem<ClassName>[], transform, debug);

    const data = mergeStyleData(
      this,
      callsite,
      classNameStyle.style,
      classNameStyle.debug,
      priority !== null ? [selector, priority] : selector,
      null,
    );

    return createDefaultFnResult(data, fns);
  };
}

function createSimpleFn<ClassName extends string>(
  fns: Record<string, Function>,
  fnSelector: Selector,
  transform: ClassNameTransform<ClassName>,
) {
  const selector = fnSelector.selector;
  const priority = fnSelector.priority;

  return function(
    this: ClassNameBuilder<ClassName, any>,
    ...params: unknown[]
  ) {
    const [items, debug] = splitDebug(params);
    const callsite = resolveCallsite(debug);
    const classNameStyle = classNameItemsToStyle(items as ClassNameItem<ClassName>[], transform, debug);

    const data = mergeStyleData(
      this,
      callsite,
      classNameStyle.style,
      classNameStyle.debug,
      priority !== null ? [selector, priority] : selector,
      null,
    );

    return createDefaultFnResult(data, fns);
  };
}

function classNameItemsToStyle<ClassName extends string>(
  items: readonly ClassNameItem<ClassName>[],
  transform: ClassNameTransform<ClassName>,
  debug?: DebugData,
): { style: StyleRecord | null; debug: DebugData | null; } {
  let style: StyleRecord | null = null;
  let debugFields: NonNullable<DebugData['fields']> | null = null;

  for (const item of flattenClassNameItems(items)) {
    const transformed = decorateClassNameStyle(
      transform.transform(item.className) as StyleRecord,
      item.className,
    );
    const weighted: StyleRecord = item.weight === null
      ? transformed
      : applyClassNameWeight(transformed, item.weight);

    style = style ? Object.assign({}, style, weighted) : weighted;

    const loc = debug?.classNames?.[item.className];
    if (loc) {
      const nextDebugFields: NonNullable<DebugData['fields']> = debugFields
        ? Object.assign({}, debugFields)
        : Object.assign({}, debug?.fields ?? {});
      for (const property of Object.keys(transformed)) {
        nextDebugFields[property] = loc;
      }
      debugFields = nextDebugFields;
    }
  }

  return {
    style,
    debug: debug && debugFields
      ? {
        ...debug,
        fields: debugFields,
      }
      : debug ?? null,
  };
}

function decorateClassNameStyle<ClassName extends string>(
  style: StyleRecord,
  className: ClassName,
): StyleRecord {
  const result: StyleRecord = {};

  for (const [property, value] of Object.entries(style)) {
    if (value === null || value === undefined) {
      result[property] = value;
      continue;
    }

    if (Array.isArray(value) && value.length === 2 && typeof value[0] === 'number') {
      const rawValue = (value as StyleValueTuple)[1];
      result[property] = isClassNameValue(rawValue)
        ? value
        : [(value as StyleValueTuple)[0], classNameValue(rawValue, className)];
      continue;
    }

    result[property] = isClassNameValue(value) ? value : classNameValue(value, className);
  }

  return result;
}

function flattenClassNameItems<ClassName extends string>(
  items: readonly ClassNameItem<ClassName>[],
): FlattenedClassName<ClassName>[] {
  const result: FlattenedClassName<ClassName>[] = [];

  for (const item of items) {
    collectClassNameItem(item, result);
  }

  return result;
}

function collectClassNameItem<ClassName extends string>(
  item: ClassNameItem<ClassName>,
  result: FlattenedClassName<ClassName>[],
) {
  if (!item) return;

  if (typeof item === 'string') {
    result.push({ className: item, weight: null });
    return;
  }

  if (Array.isArray(item)) {
    for (const child of item) collectClassNameItem(child, result);
    return;
  }

  if (isWeightedClassName(item)) {
    result.push(item);
  }
}

function isWeightedClassName<ClassName extends string>(
  item: unknown,
): item is WeightedClassName<ClassName> {
  if (!item || typeof item !== 'object') return false;

  const weighted = item as Partial<WeightedClassName<ClassName>>;
  return typeof weighted.className === 'string' && typeof weighted.weight === 'number';
}

function applyClassNameWeight(
  style: StyleRecord,
  weight: number,
): StyleRecord {
  const weighted: StyleRecord = {};

  for (const [property, value] of Object.entries(style)) {
    if (value === null || value === undefined) {
      weighted[property] = value;
      continue;
    }

    const rawValue = Array.isArray(value) && value.length === 2 && typeof value[0] === 'number'
      ? value[1]
      : value;

    weighted[property] = [weight, rawValue];
  }

  return weighted;
}

function splitDebug<T>(
  params: readonly T[],
): [items: T[], debug: DebugData | undefined] {
  const last = params[params.length - 1];
  if (!isDebugData(last)) return [params.slice(), undefined];

  return [params.slice(0, -1), last];
}
