import type { ScopeTargetData } from '../../builder/data';
import type { SlotData, StyleData } from '../../builder/data';
import { RUNTIME_CONFIG } from '../../config';
import { globalData } from '../../utils/global';
import { hasOwn } from '../../utils/object';
import type { ResolvedStyleItem } from './cache/item';
import type { StyleTokenValues } from './cache/tokenValues';

export type CombinedStyleMeta<Styles = unknown> = {
  styles: Styles;
  scopes: readonly ScopeTargetData[];
  tokens: StyleTokenValues | null;
};

export type CombinedStyle<Styles = unknown> = InferData<Styles>;

export type CombinedStyleFieldGetter = (
  meta: CombinedStyleMeta,
  prop: string | symbol,
) => unknown;

type CombinedStyleTarget = CombinedStyleMeta & {
  cache: Record<PropertyKey, unknown>;
  configVersion: number;
  getField: CombinedStyleFieldGetter;
};

const targets = globalData(
  'runtime.combinedStyle.targets',
  () => new WeakMap<object, CombinedStyleTarget>(),
);

export function createCombinedStyle<Styles extends object>(
  meta: CombinedStyleMeta<Styles>,
  getField: CombinedStyleFieldGetter,
): CombinedStyle<Styles> {
  const target: CombinedStyleTarget = {
    ...meta,
    cache: Object.create(null),
    configVersion: RUNTIME_CONFIG.configVersion,
    getField,
  };

  const proxyTarget = {};

  const proxy = new Proxy(proxyTarget, handlers) as CombinedStyle<Styles>;

  targets.set(proxyTarget, target);
  targets.set(proxy, target);

  return proxy;
}

export function isCombinedStyle<Styles = unknown>(value: unknown): value is CombinedStyle<Styles> {
  return !!value && typeof value === 'object' && targets.has(value);
}

export function getCombinedStyleStyles<Styles>(style: CombinedStyle<Styles>) {
  return getTarget(style).styles as Styles;
}

export function getCombinedStyleScopes(style: CombinedStyle) {
  return getTarget(style).scopes;
}

export function getCombinedStyleTokens(style: CombinedStyle) {
  return getTarget(style).tokens;
}

const handlers: ProxyHandler<object> = {
  get(proxy, prop) {
    const target = getTarget(proxy);

    if (target.configVersion !== RUNTIME_CONFIG.configVersion) {
      target.cache = Object.create(null);
      target.configVersion = RUNTIME_CONFIG.configVersion;
    }

    if (hasOwn(target.cache, prop)) {
      return target.cache[prop];
    }

    const value = target.getField(target, prop);

    if (value && typeof value === 'object') {
      target.cache[prop] = value;
    }

    return value;
  },
};

function getTarget(value: object): CombinedStyleTarget {
  const target = targets.get(value);

  if (!target) {
    throw new Error('[fluentic-style] Expected combined style.');
  }

  return target;
}

type InferValue<Value> = Value extends StyleData | SlotData ? ResolvedStyleItem<Value>
  : Value extends object ? CombinedStyle<any>
  : Value;

type InferData<Styles> = unknown extends Styles ? {}
  : Styles extends object ? { [P in keyof Styles]: InferValue<Styles[P]>; }
  : {};
