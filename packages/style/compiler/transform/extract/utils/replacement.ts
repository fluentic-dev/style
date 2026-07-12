import { getTokenVarName } from '../../../../atomic/token';
import {
  BUILDER_TYPE_SCOPE,
  BUILDER_TYPE_SLOT,
  BUILDER_TYPE_SLOT_OVERRIDE,
  BUILDER_TYPE_STYLE,
  ITEM_VALUE_NUMBER_PX,
  ITEM_VALUE_TYPE_AT_RULE_REF,
  ITEM_VALUE_TYPE_VARIABLE,
} from '../../../../builder/data/const';
import type { BuilderType, ExtractedItemValue } from '../../../../builder/data/state';
import { getStyleTokenId, getStyleTokenName, isStyleTokenData, type StyleTokenData } from '../../../../style/token';
import type { AtRuleRefData } from '../../../../style/valueRef';
import { DEFAULT_CONFIG } from '../../../utils/constants';
import {
  FN_CREATE_EXTRACTED_SCOPE,
  FN_CREATE_EXTRACTED_SLOT,
  FN_CREATE_EXTRACTED_STYLE,
  FN_CREATE_EXTRACTED_STYLE_MERGE,
  FN_CREATE_EXTRACTED_TOKEN,
} from '../../../utils/constants';
import type { BabelTypes } from '../../utils/babel';
import type {
  CompiledChainData,
  CompiledCssItem,
  CompiledItem,
  CompiledStyleSpreadItem,
  CompiledTokenItem,
} from '../chain';
import type { ExtractPluginState } from './state';

type BuildReplacementOptions = {
  getRuntimeToken?: (item: CompiledCssItem, valueNode: BabelTypes.Expression) => BabelTypes.Expression | null;
  getTokenOverride?: (item: CompiledTokenItem) => void;
};

export function buildReplacement(
  t: typeof BabelTypes,
  chain: CompiledChainData,
  state: ExtractPluginState,
  options: BuildReplacementOptions = {},
): BabelTypes.Expression | null {
  if (chain.type === 'style') {
    const hasSpread = chain.items.some(isCompiledStyleSpreadItem);
    state.usedHelpers.add(hasSpread ? FN_CREATE_EXTRACTED_STYLE_MERGE : FN_CREATE_EXTRACTED_STYLE);

    return t.callExpression(
      t.identifier(hasSpread ? FN_CREATE_EXTRACTED_STYLE_MERGE : FN_CREATE_EXTRACTED_STYLE),
      hasSpread
        ? buildStyleMergeArgs(t, chain, state, options)
        : [buildItemsArray(t, chain, BUILDER_TYPE_STYLE, state, options)],
    );
  }

  if (chain.type === 'slot') {
    state.usedHelpers.add(FN_CREATE_EXTRACTED_SLOT);

    return t.callExpression(
      t.identifier(FN_CREATE_EXTRACTED_SLOT),
      [
        t.stringLiteral(chain.slotId!),
        buildItemsArray(t, chain, BUILDER_TYPE_SLOT, state, options),
      ],
    );
  }

  if (chain.type === 'scope') {
    state.usedHelpers.add(FN_CREATE_EXTRACTED_SCOPE);

    return t.callExpression(
      t.identifier(FN_CREATE_EXTRACTED_SCOPE),
      [buildItemsArray(t, chain, BUILDER_TYPE_SCOPE, state, options)],
    );
  }

  return null;
}

function buildStyleMergeArgs(
  t: typeof BabelTypes,
  chain: CompiledChainData,
  state: ExtractPluginState,
  options: BuildReplacementOptions,
): BabelTypes.Expression[] {
  const args: BabelTypes.Expression[] = [];
  let chunk: CompiledItem[] = [];

  const flushChunk = () => {
    if (chunk.length === 0) return;

    args.push(buildItemsArray(
      t,
      { ...chain, items: chunk },
      BUILDER_TYPE_STYLE,
      state,
      options,
    ));
    chunk = [];
  };

  chain.items.forEach((item) => {
    if (isCompiledStyleSpreadItem(item)) {
      flushChunk();
      args.push(t.cloneNode(item.expression));
      return;
    }

    chunk.push(item);
  });

  flushChunk();

  return args;
}

function buildItemsArray(
  t: typeof BabelTypes,
  chain: CompiledChainData,
  defaultType: number,
  state: ExtractPluginState,
  options: BuildReplacementOptions,
): BabelTypes.ArrayExpression {
  const emitLegacyShape = defaultType === BUILDER_TYPE_SCOPE;
  const itemExpressions: BabelTypes.Expression[] = [];

  chain.items.forEach((item) => {
    if (isCompiledTokenItem(item)) {
      if (options.getTokenOverride) {
        options.getTokenOverride(item);
      } else {
        itemExpressions.push(t.cloneNode(item.valueNode));
      }
      return;
    }

    if (isCompiledStyleSpreadItem(item)) {
      return;
    }

    const type = getItemType(item);
    const dedupe = getItemDedupe(item);
    const className = getItemClassName(item);
    const value = getItemValue(item);
    const slotId = getItemSlotId(item);

    const elements: BabelTypes.Expression[] = emitLegacyShape
      ? [t.numericLiteral(type), t.stringLiteral(slotId ?? '')]
      : [];

    if (!emitLegacyShape && type === BUILDER_TYPE_SLOT) {
      elements.push(t.stringLiteral(dedupe));
      elements.push(t.stringLiteral(className));

      if (isItemMetadataValue(value)) {
        elements.push(buildItemValue(t, value, state, item, options));
      }

      itemExpressions.push(t.arrayExpression(elements));
      return;
    }

    elements.push(t.stringLiteral(dedupe));
    elements.push(t.stringLiteral(className));

    if ((!emitLegacyShape || type === BUILDER_TYPE_SCOPE) && isItemMetadataValue(value)) {
      elements.push(buildItemValue(t, value, state, item, options));
    }

    if (emitLegacyShape && item.hasParentSelector) {
      elements.push(t.numericLiteral(1));
    }

    itemExpressions.push(t.arrayExpression(elements));
  });

  return t.arrayExpression(itemExpressions);
}

function isCompiledTokenItem(
  item: CompiledItem,
): item is Extract<CompiledItem, { kind: 'token'; }> {
  return !Array.isArray(item) && item.kind === 'token';
}

function isCompiledStyleSpreadItem(
  item: CompiledItem,
): item is CompiledStyleSpreadItem {
  return !Array.isArray(item) && item.kind === 'style-spread';
}

function isItemMetadataValue(
  value: ExtractedItemValue | null | undefined,
): value is Extract<
  ExtractedItemValue,
  [typeof ITEM_VALUE_TYPE_VARIABLE, string, unknown, unknown?] | [typeof ITEM_VALUE_TYPE_AT_RULE_REF, unknown]
> {
  return !!value &&
    (
      value[0] === ITEM_VALUE_TYPE_VARIABLE ||
      value[0] === ITEM_VALUE_TYPE_AT_RULE_REF
    );
}

function getItemType(item: CompiledCssItem): BuilderType {
  return typeof item[0] === 'number' ? item[0] as BuilderType : BUILDER_TYPE_STYLE;
}

function getItemSlotId(item: CompiledCssItem): string | null {
  const type = getItemType(item);

  if (type === BUILDER_TYPE_SLOT || type === BUILDER_TYPE_SLOT_OVERRIDE || type === BUILDER_TYPE_SCOPE) {
    return item[1] as string;
  }

  return null;
}

function getItemDedupe(item: CompiledCssItem): string {
  const type = getItemType(item);

  if (type === BUILDER_TYPE_STYLE) {
    return typeof item[0] === 'number' ? item[1] as string : item[0] as string;
  }

  return item[2] as string;
}

function getItemClassName(item: CompiledCssItem): string {
  const type = getItemType(item);

  if (type === BUILDER_TYPE_STYLE) {
    return typeof item[0] === 'number' ? item[2] as string : item[1] as string;
  }

  return item[3] as string;
}

function getItemValue(item: CompiledCssItem): ExtractedItemValue | undefined {
  const type = getItemType(item);

  if (type === BUILDER_TYPE_SCOPE) {
    return isExtractedScopeParentMarker(item[4])
      ? undefined
      : item[4] as ExtractedItemValue | undefined;
  }

  if (type === BUILDER_TYPE_STYLE) {
    return (typeof item[0] === 'number' ? item[3] : item[2]) as ExtractedItemValue | undefined;
  }

  return item[4] as ExtractedItemValue | undefined;
}

function isExtractedScopeParentMarker(value: unknown) {
  return value === 1 || value === true;
}

function buildItemValue(
  t: typeof BabelTypes,
  value: ExtractedItemValue,
  state: ExtractPluginState,
  item: CompiledCssItem,
  options: BuildReplacementOptions,
): BabelTypes.ArrayExpression {
  if (value[0] === ITEM_VALUE_TYPE_AT_RULE_REF) {
    return buildAtRuleRefExpression(t, value[1], state);
  }

  if (value[0] !== ITEM_VALUE_TYPE_VARIABLE) {
    throw new Error('Unsupported extracted item value');
  }

  return t.arrayExpression([
    t.numericLiteral(value[0]),
    t.stringLiteral(value[1]),
    buildVariableValueExpression(t, value[2], state, item, options),
    ...(value[3] === ITEM_VALUE_NUMBER_PX ? [t.numericLiteral(ITEM_VALUE_NUMBER_PX)] : []),
  ]);
}

function buildAtRuleRefExpression(
  t: typeof BabelTypes,
  ref: AtRuleRefData,
  state: ExtractPluginState,
): BabelTypes.ArrayExpression {
  const props: BabelTypes.ObjectProperty[] = [
    t.objectProperty(t.identifier('key'), t.stringLiteral(ref.key)),
    t.objectProperty(t.identifier('value'), t.stringLiteral(ref.value)),
    t.objectProperty(t.identifier('css'), ref.css ? t.stringLiteral(ref.css) : t.nullLiteral()),
  ];

  if (ref.tokens?.length) {
    props.push(t.objectProperty(
      t.identifier('tokens'),
      t.arrayExpression(ref.tokens.map((token) => buildExtractedTokenExpression(t, token, state))),
    ));
  }

  return t.arrayExpression([
    t.numericLiteral(ITEM_VALUE_TYPE_AT_RULE_REF),
    t.objectExpression(props),
  ]);
}

function buildVariableValueExpression(
  t: typeof BabelTypes,
  value: unknown,
  state: ExtractPluginState,
  item: CompiledCssItem,
  options: BuildReplacementOptions,
): BabelTypes.Expression {
  if (isStyleTokenData(value)) {
    state.usedHelpers.add(FN_CREATE_EXTRACTED_TOKEN);
    return buildExtractedTokenExpression(t, value, state);
  }

  const valueNode = item.valueNode;
  const runtimeToken = valueNode ? options.getRuntimeToken?.(item, valueNode) : null;
  if (runtimeToken) return runtimeToken;

  return valueNode ? t.cloneNode(valueNode) : literalExpression(t, value);
}

function buildExtractedTokenExpression(
  t: typeof BabelTypes,
  token: StyleTokenData,
  state: ExtractPluginState,
): BabelTypes.Expression {
  state.usedHelpers.add(FN_CREATE_EXTRACTED_TOKEN);
  const tokenNameFormat = state.options.css?.tokenNameFormat ?? DEFAULT_CONFIG.tokenNameFormat ?? null;

  return t.callExpression(
    t.identifier(FN_CREATE_EXTRACTED_TOKEN),
    [
      t.stringLiteral(getStyleTokenId(token)),
      literalExpression(t, token.value),
      token.ref ? buildExtractedTokenExpression(t, token.ref, state) : t.nullLiteral(),
      getStyleTokenName(token) ? t.stringLiteral(getStyleTokenName(token)!) : t.nullLiteral(),
      t.stringLiteral(getTokenVarName(token, tokenNameFormat)),
    ],
  );
}

function literalExpression(
  t: typeof BabelTypes,
  value: unknown,
): BabelTypes.Expression {
  if (typeof value === 'string') return t.stringLiteral(value);
  if (typeof value === 'number') return t.numericLiteral(value);
  if (typeof value === 'boolean') return t.booleanLiteral(value);
  if (value === null || value === undefined) return t.nullLiteral();

  return t.stringLiteral(String(value));
}
