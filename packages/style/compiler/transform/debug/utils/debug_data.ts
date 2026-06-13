import type { types } from '@babel/core';
import { basename } from 'node:path';
import { getLocalVarName } from '../../../../atomic/token';
import { DEFAULT_CONFIG } from '../../../utils/constants';
import { getCallLabel, getObjectPropertyKey, isStaticStyleValue } from '../../syntax';
import type { CallArg, CallArgs } from '../../syntax/types';

export function buildDebugDataObject(
  t: typeof types,
  node: types.CallExpression,
  fileId: string,
  sourceUrlRef: types.Expression,
  sourceContentRef: types.Expression | null,
  tokenVarPrefix: string = DEFAULT_CONFIG.tokenVarPrefix,
) {
  const loc = node.loc?.start;
  const line = loc?.line ?? 1;
  const column = (loc?.column ?? 0) + 1;
  const longLabel = getCallLabel(node.callee);
  const shortLabel = getShortLabel(longLabel);

  const properties: types.ObjectProperty[] = [
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
        t.stringLiteral(basename(fileId)),
      ]),
    ),
    t.objectProperty(
      t.identifier('fields'),
      buildFields(t, node.arguments[0]),
    ),
    t.objectProperty(
      t.identifier('vars'),
      buildVars(t, node.arguments[0], fileId, tokenVarPrefix),
    ),
  ];

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
  t: typeof types,
  line: number,
  column: number,
) {
  return t.arrayExpression([
    t.numericLiteral(line),
    t.numericLiteral(column),
  ]);
}

function buildFields(
  t: typeof types,
  arg: CallArg,
) {
  if (!arg || arg.type !== 'ObjectExpression') return t.objectExpression([]);

  const fields: types.ObjectProperty[] = [];
  for (const property of arg.properties) {
    if (property.type !== 'ObjectProperty' || property.computed) continue;

    const name = getObjectPropertyKey(property);
    const loc = property.loc?.start;
    if (!name || !loc) continue;

    fields.push(t.objectProperty(
      t.stringLiteral(name),
      buildLoc(t, loc.line, loc.column + 1),
    ));
  }

  return t.objectExpression(fields);
}

function buildVars(
  t: typeof types,
  arg: CallArg | undefined,
  fileId: string,
  tokenVarPrefix: string,
) {
  if (!arg || arg.type !== 'ObjectExpression') return t.objectExpression([]);

  const fields: types.ObjectProperty[] = [];

  for (const property of arg.properties) {
    if (property.type !== 'ObjectProperty' || property.computed) continue;
    if (isStaticStyleValue(property.value)) continue;

    const name = getObjectPropertyKey(property);
    const loc = property.loc?.start;
    if (!name || !loc) continue;

    fields.push(t.objectProperty(
      t.stringLiteral(name),
      t.stringLiteral(getLocalVarName(
        fileId,
        loc.line,
        loc.column + 1,
        tokenVarPrefix,
      )),
    ));
  }

  return t.objectExpression(fields);
}
