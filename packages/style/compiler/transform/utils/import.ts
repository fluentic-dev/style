import { babelPlugin, babelTransform } from './babel';

export type RewriteImportSource = (source: string) => string | null | undefined;

export function rewriteImportSources(
  code: string,
  rewriteSource: RewriteImportSource,
  filePath = 'rewrite-import-sources.js',
) {
  const result = babelTransform({
    code,
    filePath,
    retainLines: true,
    sourcemap: null,
    plugins: [
      babelPlugin((babel) => {
        const { types: t } = babel;

        const rewrite = (source: { value: string; }) => {
          const nextSource = rewriteSource(source.value);

          if (nextSource && nextSource !== source.value) {
            source.value = nextSource;
          }
        };

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
      }),
    ],
  });

  return result?.code ?? code;
}
