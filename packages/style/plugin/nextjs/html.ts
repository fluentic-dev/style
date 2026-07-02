import {
  type BabelCore,
  babelPlugin,
  babelTransform,
  type BabelTypes,
  type NodePath,
} from '../../compiler/transform/utils/babel';
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
  return babelPlugin((babel) => ({
    visitor: {
      JSXElement(path: NodePath<BabelTypes.JSXElement>) {
        if (!isHtmlJsxElement(path.node)) return;

        path.node.children.push(createDevCssLinkElement(babel, cssUrl));
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

function createDevCssLinkElement(babel: typeof BabelCore, cssUrl: string) {
  const code = `
    <link
      rel="stylesheet"
      href={${JSON.stringify(cssUrl)}}
      precedence="default"
      ${PRECOLLECT_LINK_TAG_ATTR}=""
    />
  `;

  return babel.template.expression.ast(code, {
    plugins: ['jsx'],
  }) as BabelTypes.JSXElement;
}
