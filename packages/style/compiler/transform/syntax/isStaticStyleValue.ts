import type { types } from '@babel/core';
import { FN_STYLE_VALUE } from '../../utils/constants';

export function isStaticStyleValue(value: types.Node): boolean {
  if (
    value.type === 'StringLiteral' ||
    value.type === 'NumericLiteral' ||
    value.type === 'BooleanLiteral' ||
    value.type === 'NullLiteral'
  ) {
    return true;
  }

  if (value.type === 'TemplateLiteral') {
    return value.expressions.length === 0;
  }

  if (value.type === 'ArrayExpression') {
    const [priority, itemValue] = value.elements;

    return !!priority && priority.type === 'NumericLiteral' &&
      !!itemValue && isStaticStyleValue(itemValue);
  }

  if (
    value.type === 'CallExpression' &&
    value.callee.type === 'MemberExpression' &&
    !value.callee.computed &&
    value.callee.property.type === 'Identifier' &&
    value.callee.property.name === FN_STYLE_VALUE
  ) {
    const [itemValue, weight] = value.arguments;

    return !!itemValue && itemValue.type !== 'SpreadElement' &&
      isStaticStyleValue(itemValue) &&
      !!weight && weight.type === 'NumericLiteral';
  }

  if (value.type === 'UnaryExpression') {
    return isStaticStyleValue(value.argument);
  }

  return false;
}
