import { BUILDER_TYPE_SCOPE, BUILDER_TYPE_SLOT, BUILDER_TYPE_STYLE } from '../../../../builder/data/const';
import {
  createExtractedScope,
  createExtractedSlot,
  createExtractedStyle,
  type ExtractedSlotTuple,
  type ExtractedStyleTuple,
} from '../../../../builder/extract';
import { evalOk } from '../../evaluator/evaluator';
import type { EvalSlotRef } from '../../evaluator/types';
import { getObjectPropertyKey } from '../../syntax';
import type { BabelTypes, NodePath } from '../../utils/babel';
import type { CompiledChainData, CompiledCssItem, CompiledItem } from '../chain';
import type { ExtractPluginState } from './state';

export function recordCompiledBinding(
  path: NodePath<BabelTypes.CallExpression>,
  state: ExtractPluginState,
  chain: CompiledChainData,
) {
  const value = getCompiledBindingValue(chain);
  if (value) {
    recordCompiledValueBinding(path, state, value);
  }

  if (chain.type !== 'slot' || !chain.slotId) return;

  const slotRef: EvalSlotRef = {
    ok: false,
    reason: 'slot-ref',
    filePath: state.fileId,
    slotId: chain.slotId,
  };

  const parent = path.parentPath;

  if (parent?.isVariableDeclarator() && parent.node.id.type === 'Identifier') {
    state.bindings.set(parent.node.id.name, slotRef);
    return;
  }

  if (!parent?.isObjectProperty()) return;
  if (parent.node.value !== path.node) return;

  const objectPath = parent.parentPath;
  const declaratorPath = objectPath?.parentPath;

  if (!objectPath?.isObjectExpression()) return;
  if (!declaratorPath?.isVariableDeclarator()) return;
  if (declaratorPath.node.id.type !== 'Identifier') return;

  const key = getObjectPropertyKey(parent.node);
  if (!key) return;

  const name = declaratorPath.node.id.name;
  const current = state.bindings.get(name);

  const currentValue = current?.ok && current.value && typeof current.value === 'object'
    ? current.value as Record<string, unknown>
    : {};

  state.bindings.set(name, evalOk({ ...currentValue, [key]: slotRef }));
}

function recordCompiledValueBinding(
  path: NodePath<BabelTypes.CallExpression>,
  state: ExtractPluginState,
  value: unknown,
) {
  const parent = path.parentPath;

  if (parent?.isVariableDeclarator() && parent.node.id.type === 'Identifier') {
    state.bindings.set(parent.node.id.name, evalOk(value));
    return;
  }

  if (!parent?.isObjectProperty()) return;
  if (parent.node.value !== path.node) return;

  const objectPath = parent.parentPath;
  const declaratorPath = objectPath?.parentPath;

  if (!objectPath?.isObjectExpression()) return;
  if (!declaratorPath?.isVariableDeclarator()) return;
  if (declaratorPath.node.id.type !== 'Identifier') return;

  const key = getObjectPropertyKey(parent.node);
  if (!key) return;

  const name = declaratorPath.node.id.name;
  const current = state.bindings.get(name);

  const currentValue = current?.ok && current.value && typeof current.value === 'object'
    ? current.value as Record<string, unknown>
    : {};

  state.bindings.set(name, evalOk({ ...currentValue, [key]: value }));
}

function getCompiledBindingValue(chain: CompiledChainData) {
  if (chain.type === 'style') {
    return createExtractedStyle(
      getCompiledCssItems(chain.items).map((item) => toExtractedTuple(item)) as ExtractedStyleTuple[],
    );
  }

  if (chain.type === 'slot' && chain.slotId) {
    return createExtractedSlot(
      chain.slotId,
      getCompiledCssItems(chain.items).map((item) => toExtractedTuple(item)) as ExtractedSlotTuple[],
    );
  }

  if (chain.type === 'scope') {
    return createExtractedScope(chain.items.map(toExtractedScopeItem).filter((item) => item !== null));
  }

  return null;
}

function getCompiledCssItems(items: CompiledItem[]): CompiledCssItem[] {
  const result: CompiledCssItem[] = [];

  items.forEach((item) => {
    if (Array.isArray(item)) {
      result.push(item);
    } else if (item.kind === 'style-spread') {
      result.push(...item.items);
    }
  });

  return result;
}

function toExtractedScopeItem(item: CompiledItem): Parameters<typeof createExtractedScope>[0][number] | null {
  if (!Array.isArray(item)) {
    if (item.kind === 'style-spread') return null;
    return item.kind === 'token' ? item.value : null;
  }

  return toExtractedScopeTuple(item);
}

function toExtractedTuple(item: CompiledCssItem): ExtractedStyleTuple | ExtractedSlotTuple {
  const type = typeof item[0] === 'number' ? item[0] : BUILDER_TYPE_STYLE;

  if (type === BUILDER_TYPE_STYLE) {
    return typeof item[0] === 'number'
      ? toOptionalValueTuple(String(item[1]), String(item[2]), item[3])
      : toOptionalValueTuple(String(item[0]), String(item[1]), item[2]);
  }

  if (type === BUILDER_TYPE_SLOT) {
    return toOptionalValueTuple(String(item[2]), String(item[3]), item[4]);
  }

  if (type === BUILDER_TYPE_SCOPE) {
    return toOptionalValueTuple(String(item[2]), String(item[3]), item[4]);
  }

  return toOptionalValueTuple(String(item[2]), String(item[3]), item[4]);
}

function toOptionalValueTuple(
  dedupe: string,
  className: string,
  value: CompiledCssItem[number],
): ExtractedStyleTuple {
  return value === undefined
    ? [dedupe, className]
    : [dedupe, className, value as ExtractedStyleTuple[2]];
}

function toExtractedScopeTuple(item: CompiledCssItem): Parameters<typeof createExtractedScope>[0][number] {
  const tuple: unknown[] = [
    BUILDER_TYPE_SCOPE,
    item[1],
    item[2],
    item[3],
  ];

  if (item[4] !== undefined) tuple.push(item[4]);
  if (item.hasParentSelector) tuple.push(1);

  return tuple as Parameters<typeof createExtractedScope>[0][number];
}
