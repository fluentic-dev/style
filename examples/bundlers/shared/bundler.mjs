export function getStyleMode() {
  return process.env.FLUENTIC_STYLE_MODE === 'runtime' ? 'runtime' : 'plugin';
}

export function useStylePlugin() {
  return getStyleMode() === 'plugin';
}

export function getRuntimeAwareEntry(defaultEntry, runtimeEntry) {
  return useStylePlugin() ? defaultEntry : runtimeEntry;
}

export function replaceHtmlEntry(html, defaultEntry, runtimeEntry) {
  return html.replace(defaultEntry, getRuntimeAwareEntry(defaultEntry, runtimeEntry));
}

export function getDevSourcemap() {
  const value = process.env.SOURCEMAP;

  if (
    value === 'sourceUrl' ||
    value === 'sidecarServer' ||
    value === 'sourceContent'
  ) {
    return value;
  }

  return 'sidecarServer';
}

export function getSourcemapFilePath({ sourcePath }) {
  return 'source://@' + sourcePath;
}

export function renderHtml({
  title,
  script = './main.js',
  css = useStylePlugin() ? './fluentic-style.css' : null,
} = {}) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title ?? 'Fluentic Style Bundler Sample'}</title>
    ${css ? `<link rel="stylesheet" href="${css}" />` : ''}
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="${script}"></script>
  </body>
</html>
`;
}

export function htmlAssetPlugin(title) {
  return {
    name: 'sample-html',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'index.html',
        source: renderHtml({ title }),
      });
    },
  };
}

export function esbuildReactPlugin(esbuild) {
  return {
    name: 'sample-esbuild-react',
    async transform(code, id) {
      if (!/\.[cm]?[jt]sx?$/.test(id)) return null;

      const result = await esbuild.transform(code, {
        loader: id.endsWith('x') ? 'tsx' : 'ts',
        jsx: 'automatic',
        jsxImportSource: '@fluentic/style',
        sourcemap: true,
        sourcefile: id,
      });

      return {
        code: result.code,
        map: result.map,
      };
    },
  };
}
