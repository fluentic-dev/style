import type { Callee } from './types';

export function isStyleChainCall(
  callee: Callee,
  styleNames: Set<string>,
): boolean {
  if (callee.type === 'Identifier') return styleNames.has(callee.name);
  if (callee.type !== 'MemberExpression' || callee.computed) return false;

  const object = callee.object;
  if (object.type === 'Identifier') return styleNames.has(object.name);
  if (object.type === 'CallExpression') return isStyleChainCall(object.callee, styleNames);
  if (object.type === 'MemberExpression') return isStyleChainCall(object, styleNames);

  return false;
}
