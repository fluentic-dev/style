const pkg = '@fluentic/style';

const styleImports = {
  root: pkg,
  server: pkg + '/server',
  css: pkg + '/css',
  builderExtract: pkg + '/builder/extract',
  extractRuntime: pkg + '/runtime/extract',
  configBuild: pkg + '/config/build',
  plugin: pkg + '/plugin',
};

const styleJsxImports = {
  runtime: pkg + '/jsx-runtime',
  devRuntime: pkg + '/jsx-dev-runtime',
  runtimeCompat: pkg + '/jsx/runtime',
  devRuntimeCompat: pkg + '/jsx/dev-runtime',
};

export type StyleRuntimeMode = 'full' | 'extracted' | 'prod' | 'rsc';

export type StyleClientRuntimeMode = Exclude<StyleRuntimeMode, 'full' | 'rsc'>;

export const STYLE_IMPORT_PATH = pkg;

export const STYLE_SERVER_IMPORT_PATH = styleImports.server;
export const STYLE_CSS_IMPORT_PATH = styleImports.css;
export const STYLE_BUILDER_EXTRACT_IMPORT_PATH = styleImports.builderExtract;
export const STYLE_EXTRACT_RUNTIME_IMPORT_PATH = styleImports.extractRuntime;
export const STYLE_CONFIG_BUILD_IMPORT_PATH = styleImports.configBuild;
export const STYLE_PLUGIN_IMPORT_PATH = styleImports.plugin;

export const STYLE_JSX_RUNTIME_IMPORT_PATH = styleJsxImports.runtime;
export const STYLE_JSX_DEV_RUNTIME_IMPORT_PATH = styleJsxImports.devRuntime;
export const STYLE_JSX_RUNTIME_COMPAT_IMPORT_PATH = styleJsxImports.runtimeCompat;
export const STYLE_JSX_DEV_RUNTIME_COMPAT_IMPORT_PATH = styleJsxImports.devRuntimeCompat;

export function getStyleJsxRuntimeImportPath(mode?: StyleClientRuntimeMode) {
  return mode ? STYLE_JSX_RUNTIME_IMPORT_PATH + '/' + mode : STYLE_JSX_RUNTIME_IMPORT_PATH;
}

export function getStyleJsxDevRuntimeImportPath(mode?: StyleClientRuntimeMode) {
  return mode ? STYLE_JSX_DEV_RUNTIME_IMPORT_PATH + '/' + mode : STYLE_JSX_DEV_RUNTIME_IMPORT_PATH;
}
