import type { StyleTokenOverride } from '../../style/token';
import type { ScopeData, ScopeTargetData, SlotData, SlotOverrideData, StyleData } from '../data';
import { copyExtractedData } from './utils';

export type ExtractedTokenBoundData<T = ExtractedTokenBoundValue> = {
  data: T;
  tokens: readonly StyleTokenOverride[];
};

export type ExtractedTokenBoundValue =
  | StyleData
  | SlotData
  | SlotOverrideData
  | ScopeData
  | ScopeTargetData;

const tokenBoundData = new WeakMap<object, ExtractedTokenBoundData>();

export function withTokens<T extends ExtractedTokenBoundValue>(
  data: T,
  tokens: readonly StyleTokenOverride[],
): T {
  if (!tokens.length) return data;

  const bound = typeof data === 'function'
    ? createCallableTokenBoundData(data, tokens)
    : {};

  if (typeof data === 'function') {
    copyExtractedData(bound, data as unknown as Parameters<typeof copyExtractedData>[1]);
  }

  tokenBoundData.set(bound, { data, tokens });

  return bound as T;
}

export function isExtractedTokenBoundData(
  value: unknown,
): value is ExtractedTokenBoundValue {
  return !!value &&
    (typeof value === 'object' || typeof value === 'function') &&
    tokenBoundData.has(value as object);
}

export function getExtractedTokenBoundData<T extends ExtractedTokenBoundValue>(
  value: T,
): ExtractedTokenBoundData<T> {
  return tokenBoundData.get(value as object)! as ExtractedTokenBoundData<T>;
}

function createCallableTokenBoundData<T extends ExtractedTokenBoundValue>(
  data: T,
  tokens: readonly StyleTokenOverride[],
) {
  return function(this: unknown) {
    const fn = data as unknown as Function;

    return withTokens(
      fn.apply(this, arguments) as ExtractedTokenBoundValue,
      tokens,
    );
  };
}
