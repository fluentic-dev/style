import type { types } from '@babel/core';
import {
  BUILDER_TYPE_SCOPE,
  BUILDER_TYPE_SLOT,
  BUILDER_TYPE_SLOT_OVERRIDE,
  BUILDER_TYPE_STYLE,
  ITEM_VALUE_TYPE_VARIABLE,
} from '../../../../builder/data/const';
import type { BuilderType, ExtractedItemValue } from '../../../../builder/data/state';
import { getStyleTokenId, isStyleTokenData, type StyleTokenData } from '../../../../style/token';
import {
  FN_CREATE_EXTRACTED_SCOPE,
  FN_CREATE_EXTRACTED_SLOT,
  FN_CREATE_EXTRACTED_STYLE,
  FN_CREATE_EXTRACTED_TOKEN,
} from '../../../utils/constants';
import type { CompiledChainData, CompiledChainItem } from '../chain';
import type { ExtractPluginState } from './state';

export function buildReplacement(
  t: typeof types,
  chain: CompiledChainData,
  state: ExtractPluginState,
): types.Expression | null {
  if (chain.type === 'style') {
    state.usedHelpers.add(FN_CREATE_EXTRACTED_STYLE);

    return t.callExpression(
      t.identifier(FN_CREATE_EXTRACTED_STYLE),
      [buildItemsArray(t, chain, BUILDER_TYPE_STYLE, state)],
    );
  }

  if (chain.type === 'slot') {
    state.usedHelpers.add(FN_CREATE_EXTRACTED_SLOT);

    return t.callExpression(
      t.identifier(FN_CREATE_EXTRACTED_SLOT),
      [
        t.stringLiteral(chain.slotId!),
        buildItemsArray(t, chain, BUILDER_TYPE_SLOT, state),
      ],
    );
  }

  if (chain.type === 'scope') {
    state.usedHelpers.add(FN_CREATE_EXTRACTED_SCOPE);

    return t.callExpression(
      t.identifier(FN_CREATE_EXTRACTED_SCOPE),
      [buildItemsArray(t, chain, BUILDER_TYPE_SCOPE, state)],
    );
  }

  return null;
}

function buildItemsArray(
  t: typeof types,
  chain: CompiledChainData,
  defaultType: number,
  state: ExtractPluginState,
): types.ArrayExpression {
  const emitLegacyShape = defaultType === BUILDER_TYPE_SCOPE;

  return t.arrayExpression(
    chain.items.map((item) => {
      const type = getItemType(item);
      const dedupe = getItemDedupe(item);
      const className = getItemClassName(item);
      const value = getItemValue(item);
      const slotId = getItemSlotId(item);

      const elements: types.Expression[] = emitLegacyShape
        ? [t.numericLiteral(type), t.stringLiteral(slotId ?? '')]
        : [];

      if (!emitLegacyShape && type === BUILDER_TYPE_SLOT) {
        elements.push(t.stringLiteral(dedupe));
        elements.push(t.stringLiteral(className));

        if (isItemVariableValue(value)) {
          elements.push(buildItemValue(t, value, state, item.valueNode));
        }

        return t.arrayExpression(elements);
      }

      elements.push(t.stringLiteral(dedupe));
      elements.push(t.stringLiteral(className));

      if (!emitLegacyShape && isItemVariableValue(value)) {
        elements.push(buildItemValue(t, value, state, item.valueNode));
      }

      if (emitLegacyShape && item.hasParentSelector) {
        elements.push(t.booleanLiteral(true));
      }

      return t.arrayExpression(elements);
    }),
  );
}

function isItemVariableValue(
  value: ExtractedItemValue | null | undefined,
): value is [typeof ITEM_VALUE_TYPE_VARIABLE, string, unknown] {
  return !!value && value[0] === ITEM_VALUE_TYPE_VARIABLE;
}

function getItemType(item: CompiledChainItem): BuilderType {
  return typeof item[0] === 'number' ? item[0] as BuilderType : BUILDER_TYPE_STYLE;
}

function getItemSlotId(item: CompiledChainItem): string | null {
  const type = getItemType(item);

  if (type === BUILDER_TYPE_SLOT || type === BUILDER_TYPE_SLOT_OVERRIDE || type === BUILDER_TYPE_SCOPE) {
    return item[1] as string;
  }

  return null;
}

function getItemDedupe(item: CompiledChainItem): string {
  const type = getItemType(item);

  if (type === BUILDER_TYPE_STYLE) {
    return typeof item[0] === 'number' ? item[1] as string : item[0] as string;
  }

  return item[2] as string;
}

function getItemClassName(item: CompiledChainItem): string {
  const type = getItemType(item);

  if (type === BUILDER_TYPE_STYLE) {
    return typeof item[0] === 'number' ? item[2] as string : item[1] as string;
  }

  return item[3] as string;
}

function getItemValue(item: CompiledChainItem): ExtractedItemValue | undefined {
  const type = getItemType(item);

  if (type === BUILDER_TYPE_SCOPE) return undefined;

  if (type === BUILDER_TYPE_STYLE) {
    return (typeof item[0] === 'number' ? item[3] : item[2]) as ExtractedItemValue | undefined;
  }

  return item[4] as ExtractedItemValue | undefined;
}

function buildItemValue(
  t: typeof types,
  value: [typeof ITEM_VALUE_TYPE_VARIABLE, string, unknown],
  state: ExtractPluginState,
  valueNode: types.Expression | undefined,
): types.ArrayExpression {
  return t.arrayExpression([
    t.numericLiteral(value[0]),
    t.stringLiteral(value[1]),
    buildVariableValueExpression(t, value[2], state, valueNode),
  ]);
}

function buildVariableValueExpression(
  t: typeof types,
  value: unknown,
  state: ExtractPluginState,
  valueNode: types.Expression | undefined,
): types.Expression {
  if (isStyleTokenData(value)) {
    state.usedHelpers.add(FN_CREATE_EXTRACTED_TOKEN);
    return buildExtractedTokenExpression(t, value, state);
  }

  return valueNode ? t.cloneNode(valueNode) : literalExpression(t, value);
}

function buildExtractedTokenExpression(
  t: typeof types,
  token: StyleTokenData,
  state: ExtractPluginState,
): types.Expression {
  state.usedHelpers.add(FN_CREATE_EXTRACTED_TOKEN);

  return t.callExpression(
    t.identifier(FN_CREATE_EXTRACTED_TOKEN),
    [
      t.stringLiteral(getStyleTokenId(token)),
      literalExpression(t, token.value),
      token.ref ? buildExtractedTokenExpression(t, token.ref, state) : t.nullLiteral(),
    ],
  );
}

function literalExpression(
  t: typeof types,
  value: unknown,
): types.Expression {
  if (typeof value === 'string') return t.stringLiteral(value);
  if (typeof value === 'number') return t.numericLiteral(value);
  if (typeof value === 'boolean') return t.booleanLiteral(value);
  if (value === null || value === undefined) return t.nullLiteral();

  return t.stringLiteral(String(value));
}
