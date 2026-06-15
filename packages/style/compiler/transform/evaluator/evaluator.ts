import type * as BabelTypes from '@babel/types';
import { TRACE_VALUE, TRACE_STYLE } from '../../../builder/data/debug';
import {
  getStyleTokenId,
  isStyleTokenData,
  type StyleTokenData,
  type StyleTokenOverride,
  TOKEN_ID,
  TOKEN_OVERRIDE,
} from '../../../style/token';
import { hashString } from '../../../utils/hash';
import { FN_CREATE_TOKEN, FN_CREATE_TOKENS, FN_CREATE_VALUES, IMPORT_PATHS } from '../../utils/constants';
import type { EvalFail, EvalModuleBindings, EvalOk, EvalResult, ImportMap, ResolveImportFn } from './types';

const STYLE_IMPORT_PATHS = new Set(IMPORT_PATHS);

export const COMPILED_RUNTIME_VALUE = Symbol();
export const COMPILED_STYLE_OBJECT_LOCATIONS = Symbol();
const COMPILED_TOKEN_FACTORY = Symbol();

export type CompiledRuntimeValue = {
  [COMPILED_RUNTIME_VALUE]?: BabelTypes.Expression;
};

export type CompiledStyleObjectLocations = Record<string, {
  filePath: string;
  line: number;
  column: number;
  trace?: typeof TRACE_STYLE | typeof TRACE_VALUE;
}>;

export type CompiledStyleObject = Record<string, unknown> & {
  [COMPILED_STYLE_OBJECT_LOCATIONS]?: CompiledStyleObjectLocations;
};

type CompiledTokenFactory = {
  [COMPILED_TOKEN_FACTORY]: true;
  tokens: Map<unknown, StyleTokenData>;
};

export function evalOk(value: unknown): EvalOk {
  return { ok: true, value };
}

export function evalFail(reason: string): EvalFail {
  return { ok: false, reason };
}

export type EvalScope = {
  bindings: EvalModuleBindings;
  imports: ImportMap;
  resolveImport: ResolveImportFn;
  filePath: string;
  styleFilePath?: string;
  styleNames?: Set<string>;
  sourcemapTrace?: 'style' | 'value';
};

export function evaluateNode(
  node: BabelTypes.Node | null | undefined,
  scope: EvalScope,
): EvalResult {
  if (!node) return evalFail('null node');

  switch (node.type) {
    case 'StringLiteral':
      return evalOk(node.value);

    case 'NumericLiteral':
      return evalOk(node.value);

    case 'BooleanLiteral':
      return evalOk(node.value);

    case 'NullLiteral':
      return evalOk(null);

    case 'TemplateLiteral':
      return evaluateTemplate(node, scope);

    case 'Identifier':
      return evaluateIdentifier(node, scope);

    case 'MemberExpression':
      return evaluateMember(node as BabelTypes.MemberExpression, scope);

    case 'ObjectExpression':
      return evaluateObject(node as BabelTypes.ObjectExpression, scope);

    case 'ArrayExpression':
      return evaluateArray(node as BabelTypes.ArrayExpression, scope);

    case 'CallExpression':
      return evaluateCall(node as BabelTypes.CallExpression, scope);

    case 'BinaryExpression':
      return evaluateBinary(node as BabelTypes.BinaryExpression, scope);

    case 'UnaryExpression':
      return evaluateUnary(node as BabelTypes.UnaryExpression, scope);

    case 'ParenthesizedExpression':
    case 'TSAsExpression':
    case 'TSNonNullExpression':
    case 'TSTypeAssertion':
      return evaluateNode((node as any).expression, scope);

    default:
      return evalFail(`Cannot statically evaluate: ${node.type}`);
  }
}

function evaluateTemplate(node: BabelTypes.TemplateLiteral, scope: EvalScope): EvalResult {
  let result = '';
  const quasis = node.quasis;
  const exprs = node.expressions;

  let i = 0;
  while (i < quasis.length) {
    result += quasis[i].value.cooked ?? quasis[i].value.raw;
    if (i < exprs.length) {
      const v = evaluateNode(exprs[i] as BabelTypes.Node, scope);
      if (!v.ok) return v;
      result += String(v.value ?? '');
    }
    i++;
  }
  return evalOk(result);
}

function evaluateIdentifier(node: BabelTypes.Identifier, scope: EvalScope): EvalResult {
  const name = node.name;

  if (name === 'undefined') return evalOk(undefined);
  if (name === 'null') return evalOk(null);
  if (name === 'true') return evalOk(true);
  if (name === 'false') return evalOk(false);

  // Check local bindings first
  if (scope.bindings.has(name)) {
    const result = scope.bindings.get(name)!;

    if (result.ok && isStyleTokenData(result.value)) {
      return evalOk(withRuntimeValue(node, result.value));
    }

    return result;
  }

  // Check imports
  const imp = scope.imports.get(name);

  if (imp) {
    const exported = scope.resolveImport(imp.source, scope.filePath);

    if (!exported) return evalFail(`Cannot resolve import: ${imp.source}`);

    if (exported.has(imp.name)) return exported.get(imp.name)!;

    return evalFail(`Export '${imp.name}' not found in ${imp.source}`);
  }

  return evalFail(`Cannot resolve identifier: ${name}`);
}

function evaluateMember(node: BabelTypes.MemberExpression, scope: EvalScope): EvalResult {
  if (node.computed) {
    const key = evaluateNode(node.property as BabelTypes.Node, scope);
    if (!key.ok) return key;

    const obj = evaluateNode(node.object, scope);
    if (!obj.ok) return obj;

    if (obj.value && typeof obj.value === 'object') {
      return evalOk((obj.value as any)[key.value as string]);
    }

    return evalFail('Cannot index non-object');
  }

  const prop = (node.property as BabelTypes.Identifier).name;
  const obj = evaluateNode(node.object, scope);
  if (!obj.ok) return obj;

  if (obj.value == null) return evalFail(`Cannot access .${prop} on null/undefined`);
  if (typeof obj.value !== 'object' && typeof obj.value !== 'string') {
    return evalFail(`Cannot access .${prop} on ${typeof obj.value}`);
  }

  return evalOk((obj.value as any)[prop]);
}

function evaluateObject(node: BabelTypes.ObjectExpression, scope: EvalScope): EvalResult {
  const result: CompiledStyleObject = {};
  const locations: CompiledStyleObjectLocations = {};
  const props = node.properties;

  let i = 0;

  while (i < props.length) {
    const prop = props[i];

    if (prop.type === 'SpreadElement') {
      const v = evaluateNode(prop.argument, scope);
      if (!v.ok) return v;

      if (v.value && typeof v.value === 'object') {
        Object.assign(result, v.value);

        const sourceLocations = (v.value as CompiledStyleObject)[COMPILED_STYLE_OBJECT_LOCATIONS];
        if (sourceLocations) {
          const trace = scope.sourcemapTrace === 'value'
            ? TRACE_VALUE
            : TRACE_STYLE;
          const spreadLoc = prop.loc?.start;

          for (const [key, loc] of Object.entries(sourceLocations)) {
            locations[key] = trace === TRACE_STYLE && spreadLoc
              ? {
                line: spreadLoc.line,
                column: spreadLoc.column + 1,
                filePath: scope.styleFilePath ?? scope.filePath,
                trace,
              }
              : {
                ...loc,
                trace,
              };
          }
        }
      }
    } else if (prop.type === 'ObjectProperty') {
      let key: string;

      if (prop.computed) {
        const k = evaluateNode(prop.key as BabelTypes.Node, scope);
        if (!k.ok) return k;

        key = String(k.value);
      } else {
        key = prop.key.type === 'Identifier'
          ? prop.key.name
          : (prop.key as BabelTypes.StringLiteral).value;
      }

      const val = evaluateNode(prop.value as BabelTypes.Node, scope);

      result[key] = val.ok
        ? val.value
        : createCompiledRuntimeValue(prop.value as BabelTypes.Expression);

      if (prop.loc?.start) {
        locations[key] = {
          line: prop.loc.start.line,
          column: prop.loc.start.column + 1,
          filePath: scope.styleFilePath ?? scope.filePath,
        };
      }
    } else {
      return evalFail(`Cannot evaluate ObjectMethod in style object`);
    }

    i++;
  }

  if (Object.keys(locations).length) {
    Object.defineProperty(result, COMPILED_STYLE_OBJECT_LOCATIONS, {
      configurable: true,
      enumerable: false,
      value: locations,
    });
  }

  return evalOk(result);
}

function evaluateArray(node: BabelTypes.ArrayExpression, scope: EvalScope): EvalResult {
  const result: unknown[] = [];
  const elements = node.elements;

  let i = 0;

  while (i < elements.length) {
    const el = elements[i];

    if (!el) {
      result.push(undefined);
    } else if (el.type === 'SpreadElement') {
      const v = evaluateNode(el.argument, scope);
      if (!v.ok) return v;

      if (Array.isArray(v.value)) {
        let j = 0;
        while (j < (v.value as unknown[]).length) {
          result.push((v.value as unknown[])[j]);
          j++;
        }
      }
    } else {
      const v = evaluateNode(el as BabelTypes.Node, scope);
      if (!v.ok) return v;

      result.push(v.value);
    }

    i++;
  }

  return evalOk(result);
}

function evaluateCall(node: BabelTypes.CallExpression, scope: EvalScope): EvalResult {
  if (node.callee.type === 'Identifier') {
    const imp = scope.imports.get(node.callee.name);

    if (imp && STYLE_IMPORT_PATHS.has(imp.source) && imp.name === FN_CREATE_TOKEN) {
      const value = evaluateNode(node.arguments[0] as BabelTypes.Node, scope);
      if (!value.ok) return value;

      const debugId = evaluateOptionalDebugId(node.arguments[1] as BabelTypes.Node, scope);
      if (!debugId.ok) return debugId;

      return evalOk(createCompiledToken(value.value, scope, node.loc?.start, node, debugId.value));
    }

    if (imp && STYLE_IMPORT_PATHS.has(imp.source) && imp.name === FN_CREATE_TOKENS) {
      const value = evaluateNode(node.arguments[0] as BabelTypes.Node, scope);
      if (!value.ok) return value;

      const debugId = evaluateOptionalDebugId(node.arguments[1] as BabelTypes.Node, scope);
      if (!debugId.ok) return debugId;

      return evalOk(createCompiledTokens(value.value, scope, node.loc?.start, node, debugId.value));
    }

    if (imp && STYLE_IMPORT_PATHS.has(imp.source) && imp.name === FN_CREATE_VALUES) {
      const hasNumberArg = node.arguments[0]?.type === 'Identifier' &&
        (node.arguments[0] as BabelTypes.Identifier).name === 'Number';

      const valuesNode = hasNumberArg ? node.arguments[1] : node.arguments[0];
      const debugNode = hasNumberArg ? node.arguments[2] : node.arguments[1];

      const values = evaluateNode(valuesNode as BabelTypes.Node, scope);
      if (!values.ok) return values;

      const debugId = evaluateOptionalDebugId(debugNode as BabelTypes.Node, scope);
      if (!debugId.ok) return debugId;

      if (!Array.isArray(values.value)) {
        return evalFail('createValues values must be an array');
      }

      return evalOk(createCompiledValues(values.value, scope, node.loc?.start, node, debugId.value, hasNumberArg));
    }
  }

  if (node.callee.type === 'Identifier') {
    const token = evaluateIdentifier(node.callee, scope);

    if (token.ok && isStyleTokenData(token.value)) {
      const value = evaluateNode(node.arguments[0] as BabelTypes.Node, scope);
      if (!value.ok) return value;

      return evalOk(createCompiledTokenOverride(token.value, value.value, node));
    }

    if (token.ok && isCompiledTokenFactory(token.value)) {
      const value = evaluateNode(node.arguments[0] as BabelTypes.Node, scope);
      if (!value.ok) return value;

      const target = token.value.tokens.get(value.value);
      if (!target) return evalFail(`createValues value not found: ${String(value.value)}`);

      if (node.arguments.length > 1) {
        const provide = evaluateNode(node.arguments[1] as BabelTypes.Node, scope);
        if (!provide.ok) return provide;

        return evalOk(createCompiledTokenOverride(target, provide.value, node));
      }

      return evalOk(withRuntimeValue(node, target));
    }
  }

  if (node.callee.type === 'MemberExpression') {
    const token = evaluateMember(node.callee, scope);

    if (token.ok && isStyleTokenData(token.value)) {
      const value = evaluateNode(node.arguments[0] as BabelTypes.Node, scope);
      if (!value.ok) return value;

      return evalOk(createCompiledTokenOverride(token.value, value.value, node));
    }
  }

  if (
    node.callee.type === 'MemberExpression' &&
    !node.callee.computed &&
    node.callee.property.type === 'Identifier' &&
    node.callee.property.name === 'priority' &&
    node.callee.object.type === 'Identifier' &&
    scope.styleNames?.has(node.callee.object.name)
  ) {
    const value = evaluateNode(node.arguments[0] as BabelTypes.Node, scope);
    if (!value.ok) return value;

    const priority = evaluateNode(node.arguments[1] as BabelTypes.Node, scope);
    if (!priority.ok) return priority;

    if (typeof priority.value !== 'number') {
      return evalFail('style.priority priority must be a number');
    }

    return evalOk([priority.value, value.value]);
  }

  if (
    node.callee.type === 'MemberExpression' &&
    !node.callee.computed &&
    node.callee.property.type === 'Identifier' &&
    (node.callee.property.name === 'raw' || node.callee.property.name === 'plain') &&
    node.callee.object.type === 'Identifier' &&
    scope.styleNames?.has(node.callee.object.name)
  ) {
    return evaluateNode(node.arguments[0] as BabelTypes.Node, scope);
  }

  return evalFail(`Cannot statically evaluate: ${node.type}`);
}

function createCompiledTokenOverride(
  token: StyleTokenData,
  value: unknown,
  runtimeValue: BabelTypes.Expression,
): StyleTokenOverride {
  if (isStyleTokenData(value)) {
    return withRuntimeValue(runtimeValue, {
      [TOKEN_ID]: getStyleTokenId(token),
      [TOKEN_OVERRIDE]: true,
      value: value.value,
      ref: value,
    });
  }

  return withRuntimeValue(runtimeValue, {
    [TOKEN_ID]: getStyleTokenId(token),
    [TOKEN_OVERRIDE]: true,
    value,
    ref: null,
  });
}

function createCompiledToken(
  value: unknown,
  scope: EvalScope,
  loc: { line: number; column: number; } | null | undefined,
  runtimeValue: BabelTypes.Expression,
  debugId?: string,
): StyleTokenData {
  let tokenId = debugId;

  if (!tokenId) {
    const hash = (scope.styleFilePath ?? scope.filePath) + '\n' +
      (loc ? loc.line + ':' + loc.column : String(value));

    tokenId = hashString(hash);
  }

  return withRuntimeValue(runtimeValue, {
    [TOKEN_ID]: tokenId,
    value,
    ref: null,
  });
}

function createCompiledTokens(
  value: unknown,
  scope: EvalScope,
  loc: { line: number; column: number; } | null | undefined,
  runtimeValue: BabelTypes.Expression,
  debugId?: string,
) {
  const tokenGroupId = debugId ?? createCompiledTokenGroupId(scope, loc);

  if (Array.isArray(value)) {
    const result: Record<PropertyKey, unknown> = {};

    for (let i = 0, len = value.length; i < len; i++) {
      const item = value[i];

      result[item as PropertyKey] = createCompiledToken(
        item,
        scope,
        loc,
        runtimeValue,
        getChildDebugId(tokenGroupId, String(i)),
      );
    }

    return result;
  }

  if (!value || typeof value !== 'object') {
    return {};
  }

  const result: Record<PropertyKey, unknown> = {};

  assignCompiledTokenRecord(
    result,
    value as Record<PropertyKey, unknown>,
    scope,
    loc,
    runtimeValue,
    tokenGroupId,
  );

  return result;
}

function createCompiledTokenGroupId(
  scope: EvalScope,
  loc: { line: number; column: number; } | null | undefined,
) {
  const hash = (scope.styleFilePath ?? scope.filePath) + '\n' +
    (loc ? loc.line + ':' + loc.column : 'createTokens');

  return hashString(hash);
}

function assignCompiledTokenRecord(
  target: Record<PropertyKey, unknown>,
  value: Record<PropertyKey, unknown>,
  scope: EvalScope,
  loc: { line: number; column: number; } | null | undefined,
  runtimeValue: BabelTypes.Expression,
  debugId?: string,
) {
  for (const key of Object.keys(value)) {
    const item = value[key];
    const itemDebugId = getChildDebugId(debugId, key);

    if (item && typeof item === 'object' && !Array.isArray(item) && !isStyleTokenData(item)) {
      const child: Record<PropertyKey, unknown> = {};

      target[key] = child;

      assignCompiledTokenRecord(
        child,
        item as Record<PropertyKey, unknown>,
        scope,
        loc,
        runtimeValue,
        itemDebugId,
      );
    } else {
      target[key] = createCompiledToken(
        item,
        scope,
        loc,
        runtimeValue,
        itemDebugId,
      );
    }
  }
}

function createCompiledValues(
  values: unknown[],
  scope: EvalScope,
  loc: { line: number; column: number; } | null | undefined,
  runtimeValue: BabelTypes.Expression,
  debugId: string | undefined,
  isNumber: boolean,
): CompiledTokenFactory {
  const tokens = new Map<unknown, StyleTokenData>();

  for (let i = 0, len = values.length; i < len; i++) {
    const value = values[i];

    tokens.set(
      value,
      createCompiledToken(
        parseCompiledValue(value, isNumber),
        scope,
        loc,
        runtimeValue,
        getChildDebugId(debugId, hashString(String(value))),
      ),
    );
  }

  return { [COMPILED_TOKEN_FACTORY]: true, tokens };
}

function parseCompiledValue(value: unknown, isNumber: boolean) {
  if (!isNumber) return value;

  const number = Number(value);
  if (!Number.isFinite(number)) return value;

  return number;
}

function isCompiledTokenFactory(value: unknown): value is CompiledTokenFactory {
  return !!value && typeof value === 'object' && (value as CompiledTokenFactory)[COMPILED_TOKEN_FACTORY] === true;
}

function evaluateOptionalDebugId(
  node: BabelTypes.Node | null | undefined,
  scope: EvalScope,
): EvalResult & { value?: string; } {
  if (!node) return evalOk(undefined) as EvalResult & { value?: string; };

  const value = evaluateNode(node, scope);
  if (!value.ok) return value;

  return evalOk(value.value === undefined ? undefined : String(value.value)) as EvalResult & { value?: string; };
}

function getChildDebugId(
  debugId: string | undefined,
  child: string,
) {
  return debugId ? debugId + '--' + child : undefined;
}

function withRuntimeValue<T extends StyleTokenData | StyleTokenOverride>(
  runtimeValue: BabelTypes.Expression,
  token: T,
): T {
  return Object.assign({}, token, {
    [TOKEN_ID]: token[TOKEN_ID],
    [COMPILED_RUNTIME_VALUE]: runtimeValue,
  });
}

function createCompiledRuntimeValue(
  runtimeValue: BabelTypes.Expression,
): CompiledRuntimeValue {
  return {
    [COMPILED_RUNTIME_VALUE]: runtimeValue,
  };
}

function evaluateBinary(node: BabelTypes.BinaryExpression, scope: EvalScope): EvalResult {
  const left = evaluateNode(node.left as BabelTypes.Node, scope);
  if (!left.ok) return left;

  const right = evaluateNode(node.right as BabelTypes.Node, scope);
  if (!right.ok) return right;

  switch (node.operator) {
    case '+':
      return evalOk((left.value as any) + (right.value as any));
    case '-':
      return evalOk((left.value as number) - (right.value as number));
    case '*':
      return evalOk((left.value as number) * (right.value as number));
    case '/':
      return evalOk((left.value as number) / (right.value as number));
    case '%':
      return evalOk((left.value as number) % (right.value as number));
    default:
      return evalFail(`Unsupported binary operator: ${node.operator}`);
  }
}

function evaluateUnary(node: BabelTypes.UnaryExpression, scope: EvalScope): EvalResult {
  const arg = evaluateNode(node.argument, scope);
  if (!arg.ok) return arg;

  switch (node.operator) {
    case '-':
      return evalOk(-(arg.value as number));
    case '+':
      return evalOk(+(arg.value as number));
    case '!':
      return evalOk(!arg.value);
    default:
      return evalFail(`Unsupported unary operator: ${node.operator}`);
  }
}
