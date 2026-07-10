import { getLocalVarName } from '../../../../atomic/var';
import { TRACE_STYLE, TRACE_VALUE } from '../../../../builder/data/debug';
import type { TokenNameFormat } from '../../../../config/types';
import { DEFAULT_CONFIG } from '../../../utils/constants';
import { getBasename } from '../../../utils/path';
import { getCallLabel, getObjectPropertyKey, isStaticStyleValue } from '../../syntax';
import type { CallArg, CallArgs } from '../../syntax/types';
import type { BabelTypes } from '../../utils/babel';

export type DebugTraceProperty = BabelTypes.ObjectProperty & {
  __styleSourcemapStyleLoc?: BabelTypes.SourceLocation['start'];
  __styleSourcemapStyleSourceUrl?: string | null;
  __styleSourcemapValueLoc?: BabelTypes.SourceLocation['start'];
  __styleSourcemapValueSourceUrl?: string | null;
};

export function buildDebugDataObject(
  t: typeof BabelTypes,
  node: BabelTypes.CallExpression,
  fileId: string,
  sourceUrlRef: BabelTypes.Expression,
  sourceContentRef: BabelTypes.Expression | null,
  tokenNameFormat: TokenNameFormat = DEFAULT_CONFIG.tokenNameFormat!,
  styleArg: CallArg = node.arguments[0],
  locOverride?: BabelTypes.SourceLocation['start'] | null,
  classNameArg: boolean = false,
) {
  const loc = locOverride ?? node.loc?.start;
  const line = loc?.line ?? 1;
  const column = (loc?.column ?? 0) + 1;
  const longLabel = getCallLabel(node.callee);
  const shortLabel = getShortLabel(longLabel);

  const properties: BabelTypes.ObjectProperty[] = [
    t.objectProperty(
      t.identifier('$$debug'),
      t.booleanLiteral(true),
    ),
    t.objectProperty(
      t.identifier('loc'),
      buildLoc(t, line, column),
    ),
    t.objectProperty(
      t.identifier('label'),
      t.arrayExpression([
        t.stringLiteral(shortLabel),
        t.stringLiteral(longLabel),
        t.stringLiteral(getBasename(fileId)),
      ]),
    ),
    t.objectProperty(
      t.identifier('fields'),
      buildFields(t, styleArg),
    ),
    t.objectProperty(
      t.identifier('vars'),
      buildVars(t, styleArg, fileId, tokenNameFormat),
    ),
  ];

  if (classNameArg) {
    properties.push(t.objectProperty(
      t.identifier('classNames'),
      buildClassNames(t, node.arguments),
    ));
  }

  properties.push(t.objectProperty(
    t.identifier('sourceUrl'),
    sourceUrlRef,
  ));

  if (sourceContentRef) {
    properties.push(t.objectProperty(
      t.identifier('code'),
      sourceContentRef,
    ));
  }

  return t.objectExpression(properties);
}

function buildClassNames(
  t: typeof BabelTypes,
  args: CallArgs,
) {
  const classNames = new Map<string, BabelTypes.SourceLocation['start']>();

  for (const arg of args) collectClassNameLoc(arg, classNames);

  const fields: BabelTypes.ObjectProperty[] = [];

  for (const [className, loc] of classNames) {
    fields.push(t.objectProperty(
      t.stringLiteral(className),
      buildLoc(t, loc.line, loc.column + 1),
    ));
  }

  return t.objectExpression(fields);
}

function collectClassNameLoc(
  arg: BabelTypes.Node | null | undefined,
  classNames: Map<string, BabelTypes.SourceLocation['start']>,
) {
  if (!arg) return;

  if (arg.type === 'StringLiteral') {
    const loc = arg.loc?.start;
    if (loc) classNames.set(arg.value, loc);
    return;
  }

  if (arg.type === 'TemplateLiteral' && arg.expressions.length === 0) {
    const loc = arg.loc?.start;
    if (loc) classNames.set(arg.quasis[0]?.value.cooked ?? arg.quasis[0]?.value.raw ?? '', loc);
    return;
  }

  if (arg.type === 'ArrayExpression') {
    for (const item of arg.elements) collectClassNameLoc(item, classNames);
    return;
  }

  if (arg.type === 'ConditionalExpression') {
    collectClassNameLoc(arg.consequent, classNames);
    collectClassNameLoc(arg.alternate, classNames);
    return;
  }

  if (arg.type === 'LogicalExpression') {
    collectClassNameLoc(arg.left, classNames);
    collectClassNameLoc(arg.right, classNames);
    return;
  }

  if (
    arg.type === 'CallExpression' &&
    arg.callee.type === 'MemberExpression' &&
    arg.callee.property.type === 'Identifier' &&
    arg.callee.property.name === 'weight'
  ) {
    collectClassNameLoc(arg.arguments[0], classNames);
  }
}

function getShortLabel(label: string) {
  const parts = label.split('.');
  return parts[parts.length - 1] || label;
}

export function hasDebugArgument(args: CallArgs) {
  const last = args[args.length - 1];
  if (!last || last.type !== 'ObjectExpression') return false;

  return last.properties.some((property) => {
    if (property.type !== 'ObjectProperty') return false;

    return getObjectPropertyKey(property) === 'loc';
  });
}

function buildLoc(
  t: typeof BabelTypes,
  line: number,
  column: number,
  sourceUrl?: string | null,
) {
  const items: BabelTypes.Expression[] = [
    t.numericLiteral(line),
    t.numericLiteral(column),
  ];

  if (sourceUrl) {
    items.push(t.identifier('undefined'));
    items.push(t.stringLiteral(sourceUrl));
  }

  return t.arrayExpression(items);
}

function buildFields(
  t: typeof BabelTypes,
  arg: CallArg,
) {
  if (!arg || arg.type !== 'ObjectExpression') return t.objectExpression([]);

  const fields: BabelTypes.ObjectProperty[] = [];
  for (const property of arg.properties) {
    if (property.type !== 'ObjectProperty' || property.computed) continue;

    const name = getObjectPropertyKey(property);
    const loc = property.loc?.start;
    if (!name || !loc) continue;

    fields.push(t.objectProperty(
      t.stringLiteral(name),
      buildFieldLoc(t, property as DebugTraceProperty, loc),
    ));
  }

  return t.objectExpression(fields);
}

function buildFieldLoc(
  t: typeof BabelTypes,
  property: DebugTraceProperty,
  loc: BabelTypes.SourceLocation['start'],
) {
  const styleLoc = property.__styleSourcemapStyleLoc;
  const valueLoc = property.__styleSourcemapValueLoc;

  if (styleLoc && valueLoc) {
    return t.objectExpression([
      t.objectProperty(
        t.numericLiteral(TRACE_STYLE),
        buildLoc(t, styleLoc.line, styleLoc.column + 1, property.__styleSourcemapStyleSourceUrl),
      ),
      t.objectProperty(
        t.numericLiteral(TRACE_VALUE),
        buildLoc(t, valueLoc.line, valueLoc.column + 1, property.__styleSourcemapValueSourceUrl),
      ),
    ]);
  }

  return buildLoc(t, loc.line, loc.column + 1);
}

function buildVars(
  t: typeof BabelTypes,
  arg: CallArg | undefined,
  fileId: string,
  tokenNameFormat: TokenNameFormat,
) {
  if (!arg || arg.type !== 'ObjectExpression') return t.objectExpression([]);

  const fields: BabelTypes.ObjectProperty[] = [];

  for (const property of arg.properties) {
    if (property.type !== 'ObjectProperty' || property.computed) continue;
    if (isStaticStyleValue(property.value)) continue;

    const name = getObjectPropertyKey(property);
    const loc = property.value.loc?.start ?? property.loc?.start;
    if (!name || !loc) continue;

    fields.push(t.objectProperty(
      t.stringLiteral(name),
      t.stringLiteral(getLocalVarName(
        fileId,
        loc.line,
        loc.column + 1,
        tokenNameFormat,
      )),
    ));
  }

  return t.objectExpression(fields);
}
