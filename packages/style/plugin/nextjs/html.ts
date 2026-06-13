import type * as BabelCore from '@babel/core';
import type { NodePath, types as BabelTypes } from '@babel/core';
import { babelPlugin, babelTransform } from '../../compiler/transform/utils/babel';
import { PRECOLLECT_LINK_TAG_ATTR } from '../../runtime/rsc/constants';

export function injectDevCssLink(source: string, cssUrl: string | null) {
  if (!cssUrl || source.includes(PRECOLLECT_LINK_TAG_ATTR)) return source;

  let inserted = false;

  const result = babelTransform({
    code: source,
    filePath: 'next-app-layout.tsx',
    retainLines: true,
    plugins: [
      createDevCssLinkPlugin(cssUrl, () => {
        inserted = true;
      }),
    ],
  });

  return inserted && result ? result.code : source;
}

function createDevCssLinkPlugin(cssUrl: string, markInserted: () => void) {
  return babelPlugin(({ types: t }) => ({
    visitor: {
      JSXElement(path: NodePath<BabelTypes.JSXElement>) {
        if (!isHtmlJsxElement(path.node)) return;

        path.node.children.unshift(createDevCssLinkElement(t, cssUrl));
        markInserted();
        path.stop();
      },
    },
  }));
}

function isHtmlJsxElement(node: BabelTypes.JSXElement) {
  const name = node.openingElement.name;

  return name.type === 'JSXIdentifier' && name.name === 'html';
}

function createDevCssLinkElement(t: typeof BabelCore.types, cssUrl: string) {
  return t.jsxElement(
    t.jsxOpeningElement(
      t.jsxIdentifier('link'),
      [
        t.jsxAttribute(t.jsxIdentifier('rel'), t.stringLiteral('stylesheet')),
        t.jsxAttribute(t.jsxIdentifier('href'), t.stringLiteral(cssUrl)),
        t.jsxAttribute(t.jsxIdentifier('precedence'), t.stringLiteral('default')),
        t.jsxAttribute(t.jsxIdentifier(PRECOLLECT_LINK_TAG_ATTR), t.stringLiteral('')),
      ],
      true,
    ),
    null,
    [],
    true,
  );
}
