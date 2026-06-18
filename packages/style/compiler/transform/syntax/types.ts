import type { BabelTypes } from '../utils/babel';

export type Callee = BabelTypes.Expression | BabelTypes.V8IntrinsicIdentifier | BabelTypes.Super;

export type CallArgs = BabelTypes.CallExpression['arguments'];

export type CallArg = CallArgs[number];
