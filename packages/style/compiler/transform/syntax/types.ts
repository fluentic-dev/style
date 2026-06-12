import type { types } from '@babel/core';

export type Callee = types.Expression | types.V8IntrinsicIdentifier | types.Super;

export type CallArgs = types.CallExpression['arguments'];

export type CallArg = CallArgs[number];
