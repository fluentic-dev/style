import type { CompilerOptions } from '../../compiler/types';
import type { CompilerCssPropOptions } from '../../cssProp';
import type { BabelCore, BabelTypes, NodePath } from '../utils/babel';
import { babelPlugin } from '../utils/babel';

type PluginState = BabelCore.PluginPass & {
  options: CompilerOptions;
  mergeId: BabelTypes.Identifier | null;
  programPath: NodePath<BabelTypes.Program> | null;
  changed: boolean;
};

type PluginArgs = {
  options: CompilerOptions;
};

export function createCssPropPlugin(args: PluginArgs) {
  return babelPlugin<PluginState>((babel) => {
    const { types: t } = babel;

    return {
      pre(this: PluginState) {
        this.options = args.options;
        this.mergeId = null;
        this.programPath = null;
        this.changed = false;
      },
      visitor: {
        Program: {
          enter(path: NodePath<BabelTypes.Program>, state: PluginState) {
            state.programPath = path;
            state.mergeId = path.scope.generateUidIdentifier('fluenticMergeJsxProps');
          },
          exit(path: NodePath<BabelTypes.Program>, state: PluginState) {
            const options = getCssPropOptions(state.options);
            if (!state.changed || !options || !state.mergeId) return;

            path.unshiftContainer(
              'body',
              t.importDeclaration([
                t.importSpecifier(state.mergeId, t.identifier('mergeJsxProps')),
              ], t.stringLiteral(options.adapter)),
            );
          },
        },

        JSXOpeningElement(path: NodePath<BabelTypes.JSXOpeningElement>, state: PluginState) {
          const keyHoistedAttributes = hoistKeyAttributes(path.node.attributes);
          if (keyHoistedAttributes) path.node.attributes = keyHoistedAttributes;

          const options = getCssPropOptions(state.options);
          if (!options || !state.mergeId) return;
          if (!isIntrinsicElement(path.node.name)) return;
          if (!hasCssAttribute(path.node.attributes)) return;

          const keyAttributes = path.node.attributes.filter(isKeyAttribute);
          const parts = path.node.attributes
            .filter((attr) => !isKeyAttribute(attr))
            .map((attr) => buildPart(t, attr));

          path.node.attributes = [
            ...keyAttributes,
            t.jsxSpreadAttribute(t.callExpression(state.mergeId, [
              t.arrayExpression(parts),
            ])),
          ];

          state.changed = true;
        },
      },
    };
  });
}

function getCssPropOptions(options: CompilerOptions): CompilerCssPropOptions | null {
  return options.cssProp || null;
}

function isIntrinsicElement(name: BabelTypes.JSXOpeningElement['name']) {
  return name.type === 'JSXIdentifier' && /^[a-z]/.test(name.name);
}

function hasCssAttribute(attrs: readonly (BabelTypes.JSXAttribute | BabelTypes.JSXSpreadAttribute)[]) {
  return attrs.some((attr) => {
    return attr.type === 'JSXAttribute' &&
      attr.name.type === 'JSXIdentifier' &&
      attr.name.name === 'css';
  });
}

function hoistKeyAttributes(
  attrs: readonly (BabelTypes.JSXAttribute | BabelTypes.JSXSpreadAttribute)[],
) {
  const keyAttributes = attrs.filter(isKeyAttribute);
  if (!keyAttributes.length) return null;

  const firstKeyIndex = attrs.findIndex(isKeyAttribute);
  const firstSpreadIndex = attrs.findIndex((attr) => attr.type === 'JSXSpreadAttribute');

  if (firstSpreadIndex < 0 || firstKeyIndex < firstSpreadIndex) return null;

  return [
    ...keyAttributes,
    ...attrs.filter((attr) => !isKeyAttribute(attr)),
  ];
}

function isKeyAttribute(
  attr: BabelTypes.JSXAttribute | BabelTypes.JSXSpreadAttribute,
) {
  return attr.type === 'JSXAttribute' &&
    attr.name.type === 'JSXIdentifier' &&
    attr.name.name === 'key';
}

function buildPart(
  t: typeof BabelTypes,
  attr: BabelTypes.JSXAttribute | BabelTypes.JSXSpreadAttribute,
) {
  if (attr.type === 'JSXSpreadAttribute') return attr.argument;

  return t.objectExpression([
    t.objectProperty(
      getObjectKey(t, attr.name),
      getAttributeValue(t, attr),
    ),
  ]);
}

function getObjectKey(
  t: typeof BabelTypes,
  name: BabelTypes.JSXAttribute['name'],
) {
  if (name.type === 'JSXIdentifier' && isValidIdentifierName(name.name)) {
    return t.identifier(name.name);
  }

  return t.stringLiteral(getAttributeName(name));
}

function getAttributeName(name: BabelTypes.JSXAttribute['name']) {
  if (name.type === 'JSXIdentifier') return name.name;
  return `${name.namespace.name}:${name.name.name}`;
}

function getAttributeValue(
  t: typeof BabelTypes,
  attr: BabelTypes.JSXAttribute,
) {
  if (!attr.value) return t.booleanLiteral(true);
  if (attr.value.type === 'StringLiteral') return t.stringLiteral(attr.value.value);
  if (attr.value.type === 'JSXExpressionContainer') {
    if (attr.value.expression.type === 'JSXEmptyExpression') return t.booleanLiteral(true);
    return attr.value.expression;
  }
  return attr.value;
}

function isValidIdentifierName(name: string) {
  return /^[$A-Z_a-z][$\w]*$/.test(name);
}
