import { babelPlugin, babelTransform, type BabelTypes } from './babel';

export type RewriteImportSource = (source: string) => string | null | undefined;

export function rewriteImportSources(
  code: string,
  rewriteSource: RewriteImportSource,
) {
  const result = babelTransform({
    code,
    retainLines: true,
    sourcemap: null,
    plugins: [createPlugin(rewriteSource)],
  });

  return result?.code ?? code;
}

function createPlugin(rewriteSource: RewriteImportSource) {
  const rewrite = (source: BabelTypes.StringLiteral) => {
    const nextSource = rewriteSource(source.value);

    if (nextSource && nextSource !== source.value) {
      source.value = nextSource;
    }
  };

  return babelPlugin((babel) => {
    const { types: t } = babel;

    return {
      visitor: {
        ImportDeclaration(path) {
          rewrite(path.node.source);
        },
        ExportAllDeclaration(path) {
          rewrite(path.node.source);
        },
        ExportNamedDeclaration(path) {
          if (t.isStringLiteral(path.node.source)) {
            rewrite(path.node.source);
          }
        },
      },
    };
  });
}
