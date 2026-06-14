import type { NodePath, types as BabelTypes } from '@babel/core';
import { evalOk } from '../../evaluator/evaluator';
import type { EvalSlotRef } from '../../evaluator/types';
import { getObjectPropertyKey } from '../../syntax';
import type { CompiledChainData } from '../chain';
import type { ExtractPluginState } from './state';

export function recordCompiledSlotBinding(
  path: NodePath<BabelTypes.CallExpression>,
  state: ExtractPluginState,
  chain: CompiledChainData,
) {
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
