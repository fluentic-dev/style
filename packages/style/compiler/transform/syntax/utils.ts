import type { types } from '@babel/core';
import type { Callee } from './types';

export function getCallLabel(callee: Callee): string {
  if (callee.type === 'Identifier') return callee.name;
  if (callee.type === 'MemberExpression') {
    const key = callee.property.type === 'Identifier'
      ? callee.property.name
      : callee.property.type === 'StringLiteral'
      ? callee.property.value
      : '';

    return key ? `style.${key}` : 'style';
  }

  return 'style';
}

export function getObjectPropertyKey(node: types.ObjectProperty) {
  if (node.computed) return null;
  if (node.key.type === 'Identifier') return node.key.name;
  if (node.key.type === 'StringLiteral') return node.key.value;
  if (node.key.type === 'NumericLiteral') return String(node.key.value);
  return null;
}

export function getImportedName(spec: types.ImportSpecifier) {
  return spec.imported.type === 'Identifier'
    ? spec.imported.name
    : spec.imported.value;
}
