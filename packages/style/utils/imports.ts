const pkg = '@fluentic/style';

const styleImports = {
  root: pkg,
  server: pkg + '/server',
  serverExtracted: pkg + '/server/extracted',
  css: pkg + '/css',
  builderExtract: pkg + '/builder/extract',
  extractRuntime: pkg + '/runtime/extract',
  configBuild: pkg + '/config/build',
  plugin: pkg + '/plugin',
};

const styleJsxImports = {
  runtime: pkg + '/jsx-runtime',
  devRuntime: pkg + '/jsx-dev-runtime',
  serverRuntime: pkg + '/jsx-runtime/server',
  serverDevRuntime: pkg + '/jsx-dev-runtime/server',
  runtimeCompat: pkg + '/jsx/runtime',
  devRuntimeCompat: pkg + '/jsx/dev-runtime',
  serverRuntimeCompat: pkg + '/jsx/runtime/server',
  serverDevRuntimeCompat: pkg + '/jsx/dev-runtime/server',
};

export type StyleClientRuntimeMode = 'extracted' | 'prod';

export const STYLE_IMPORT_PATH = pkg;

export const STYLE_SERVER_IMPORT_PATH = styleImports.server;
export const STYLE_SERVER_EXTRACTED_IMPORT_PATH = styleImports.serverExtracted;
export const STYLE_CSS_IMPORT_PATH = styleImports.css;
export const STYLE_BUILDER_EXTRACT_IMPORT_PATH = styleImports.builderExtract;
export const STYLE_EXTRACT_RUNTIME_IMPORT_PATH = styleImports.extractRuntime;
export const STYLE_CONFIG_BUILD_IMPORT_PATH = styleImports.configBuild;
export const STYLE_PLUGIN_IMPORT_PATH = styleImports.plugin;

export const STYLE_JSX_RUNTIME_IMPORT_PATH = styleJsxImports.runtime;
export const STYLE_JSX_DEV_RUNTIME_IMPORT_PATH = styleJsxImports.devRuntime;
export const STYLE_JSX_SERVER_RUNTIME_IMPORT_PATH = styleJsxImports.serverRuntime;
export const STYLE_JSX_SERVER_DEV_RUNTIME_IMPORT_PATH = styleJsxImports.serverDevRuntime;
export const STYLE_JSX_RUNTIME_COMPAT_IMPORT_PATH = styleJsxImports.runtimeCompat;
export const STYLE_JSX_DEV_RUNTIME_COMPAT_IMPORT_PATH = styleJsxImports.devRuntimeCompat;
export const STYLE_JSX_SERVER_RUNTIME_COMPAT_IMPORT_PATH = styleJsxImports.serverRuntimeCompat;
export const STYLE_JSX_SERVER_DEV_RUNTIME_COMPAT_IMPORT_PATH = styleJsxImports.serverDevRuntimeCompat;

export function getStyleJsxRuntimeImportPath(mode?: StyleClientRuntimeMode) {
  return mode ? STYLE_JSX_RUNTIME_IMPORT_PATH + '/' + mode : STYLE_JSX_RUNTIME_IMPORT_PATH;
}

export function getStyleJsxDevRuntimeImportPath(mode?: StyleClientRuntimeMode) {
  return mode ? STYLE_JSX_DEV_RUNTIME_IMPORT_PATH + '/' + mode : STYLE_JSX_DEV_RUNTIME_IMPORT_PATH;
}

export function getStyleJsxServerRuntimeImportPath(mode?: StyleClientRuntimeMode) {
  return mode === 'extracted'
    ? STYLE_JSX_SERVER_RUNTIME_IMPORT_PATH + '/extracted'
    : STYLE_JSX_SERVER_RUNTIME_IMPORT_PATH;
}

export function getStyleJsxServerDevRuntimeImportPath(mode?: StyleClientRuntimeMode) {
  return mode === 'extracted'
    ? STYLE_JSX_SERVER_DEV_RUNTIME_IMPORT_PATH + '/extracted'
    : STYLE_JSX_SERVER_DEV_RUNTIME_IMPORT_PATH;
}
