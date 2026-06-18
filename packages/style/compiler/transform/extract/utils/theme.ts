import type { BabelTypes, NodePath } from '../../utils/babel';
import { getThemeRuleCss } from '../../../../atomic/theme';
import { CSS_CONFIG } from '../../../../config/config/css';
import { isStyleTokenOverrideData, type StyleTokenOverride } from '../../../../style/token';
import type { CompilerOptions } from '../../../compiler/types';
import type { CssExtractRule } from '../../../extract/types';
import { FN_CREATE_THEME, IMPORT_PATHS } from '../../../utils/constants';
import { evaluateNode } from '../../evaluator/evaluator';
import { getStableThemeClassName, getStableThemeId } from '../../syntax/static_ids';
import { type ExtractPluginState, getEvalScope } from './state';

export function compileThemeCall(
  path: NodePath<BabelTypes.CallExpression>,
  state: ExtractPluginState,
  opts: CompilerOptions,
): { id: string; className: string; rule: CssExtractRule; } | null {
  const callee = path.node.callee;
  if (callee.type !== 'Identifier') return null;

  const imp = state.imports.get(callee.name);

  if (!imp || !IMPORT_PATHS.includes(imp.source) || imp.name !== FN_CREATE_THEME) {
    return null;
  }

  const scope = getEvalScope(state);
  const tokenArg = evaluateNode(path.node.arguments[0] as BabelTypes.Node, scope);

  if (!tokenArg.ok) {
    throw path.buildCodeFrameError(`createTheme tokens must be statically analyzable: ${tokenArg.reason}`);
  }

  if (!Array.isArray(tokenArg.value)) {
    throw path.buildCodeFrameError('createTheme first argument must be a static array of token overrides.');
  }

  const debugIdArg = evaluateNode(path.node.arguments[1] as BabelTypes.Node, scope);

  if (path.node.arguments[1] && !debugIdArg.ok) {
    throw path.buildCodeFrameError(`createTheme debugId must be statically analyzable: ${debugIdArg.reason}`);
  }

  const tokens: StyleTokenOverride[] = [];

  for (let i = 0, len = tokenArg.value.length; i < len; i++) {
    const token = tokenArg.value[i];

    if (!isStyleTokenOverrideData(token)) {
      throw path.buildCodeFrameError(`createTheme token at index ${i} must be a token override, e.g. token(value).`);
    }

    tokens.push(token);
  }

  const loc = path.node.loc?.start;

  const debugId = debugIdArg.ok && debugIdArg.value !== undefined
    ? String(debugIdArg.value)
    : getStableThemeId(state.fileId, loc ? loc.line + ':' + loc.column : 'createTheme');

  const id = debugId;

  const themeNameFormat = opts.css?.themeNameFormat || CSS_CONFIG.themeNameFormat || null;

  const className = getStableThemeClassName(
    id,
    themeNameFormat,
  );

  const css = getThemeRuleCss(
    className,
    tokens,
    themeNameFormat,
  );

  return {
    id,
    className,
    rule: {
      dedupe: className,
      className,
      css,
      priority: [0, 0, 0, 0, 0, 0, 0],
    },
  };
}
