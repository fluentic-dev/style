import { isStyleTokenData } from '../../../../style/token';
import {
  FN_CREATE_EXTRACTED_VALUES,
  FN_CREATE_TOKEN,
  FN_CREATE_TOKENS,
  FN_CREATE_VALUES,
  IMPORT_PATHS,
} from '../../../utils/constants';
import {
  COMPILED_RUNTIME_VALUE,
  type CompiledRuntimeValue,
  evaluateNode,
  isCompiledTokenFactory,
} from '../../evaluator/evaluator';
import { getObjectPropertyKey } from '../../syntax/utils';
import type { BabelTypes } from '../../utils/babel';
import { buildExtractedTokenExpression } from './replacement';
import { type ExtractPluginState, getEvalScope } from './state';

export { annotateTokenDeclaration } from '../../syntax/static_ids';

export function compileTokenFactory(
  node: BabelTypes.CallExpression,
  state: ExtractPluginState,
  t: typeof BabelTypes,
): BabelTypes.Expression | null {
  if (node.callee.type !== 'Identifier') return null;
  const imp = state.imports.get(node.callee.name);
  if (!imp || !IMPORT_PATHS.includes(imp.source)) return null;
  if (![FN_CREATE_TOKEN, FN_CREATE_TOKENS, FN_CREATE_VALUES].includes(imp.name)) return null;

  const inputValue = evaluateNode(node.arguments[0] as BabelTypes.Node, getEvalScope(state));
  if (inputValue.ok && hasUnresolvedValue(inputValue.value)) {
    throw new Error(`Cannot extract ${imp.name}: factory inputs must be statically resolvable`);
  }
  const result = evaluateNode(node, getEvalScope(state));
  if (!result.ok) throw new Error(`Cannot extract ${imp.name}: ${result.reason}`);

  if (isCompiledTokenFactory(result.value)) {
    state.usedHelpers.add(FN_CREATE_EXTRACTED_VALUES);
    const expression = t.callExpression(t.identifier(FN_CREATE_EXTRACTED_VALUES), [
      t.arrayExpression([...result.value.tokens].map(([key, token]) =>
        t.arrayExpression([
          t.valueToNode(key) as BabelTypes.Expression,
          buildExtractedTokenExpression(t, token, state, false),
        ])
      )),
    ]);
    t.addComment(expression, 'leading', '#__PURE__');
    return expression;
  }

  const input = node.arguments[0] as BabelTypes.Expression;
  if (imp.name === FN_CREATE_TOKEN) return buildGroup(result.value, input);
  const raw = evaluateNode(input, getEvalScope(state));
  const array = raw.ok && Array.isArray(raw.value) ? raw.value : null;
  if (array) {
    return t.objectExpression(
      Object.entries(result.value as object).map(([key, token]) => {
        let index = array.length - 1;
        while (index >= 0 && String(array[index]) !== key) index--;
        return t.objectProperty(
          t.stringLiteral(key),
          buildGroup(token, member(input, String(index))),
          key === '__proto__',
        );
      }),
    );
  }
  return buildGroup(result.value, input);

  function buildGroup(value: unknown, source: BabelTypes.Expression): BabelTypes.Expression {
    if (isStyleTokenData(value)) {
      const expression = buildExtractedTokenExpression(t, value, state, false) as BabelTypes.CallExpression;
      if (!value.ref) expression.arguments[1] = t.cloneNode(source, true);
      t.addComment(expression, 'leading', '#__PURE__');
      return expression;
    }
    if (!value || typeof value !== 'object') throw new Error(`Invalid ${imp!.name} token group`);
    return t.objectExpression(
      Object.entries(value).map(([key, child]) =>
        t.objectProperty(t.stringLiteral(key), buildGroup(child, member(source, key)), key === '__proto__')
      ),
    );
  }
  function member(source: BabelTypes.Expression, key: string): BabelTypes.Expression {
    if (source.type === 'ObjectExpression') {
      for (let index = source.properties.length - 1; index >= 0; index--) {
        const property = source.properties[index]!;
        if (property.type !== 'ObjectProperty' || property.computed) break;
        if (getObjectPropertyKey(property) === key) return property.value as BabelTypes.Expression;
      }
    }
    if (
      source.type === 'ArrayExpression' && !source.elements.some((item) => item?.type === 'SpreadElement') &&
      source.elements[Number(key)] && t.isExpression(source.elements[Number(key)])
    ) {
      return source.elements[Number(key)] as BabelTypes.Expression;
    }
    return t.memberExpression(t.cloneNode(source, true), t.stringLiteral(key), true);
  }
}

function hasUnresolvedValue(value: unknown): boolean {
  if (!value || typeof value !== 'object' || isStyleTokenData(value)) return false;
  if ((value as CompiledRuntimeValue)[COMPILED_RUNTIME_VALUE]) return true;
  return Object.values(value).some(hasUnresolvedValue);
}
