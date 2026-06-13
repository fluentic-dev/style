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
