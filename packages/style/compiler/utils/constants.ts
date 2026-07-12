import { CSS_CONFIG_DEFAULT } from '../../config/config/css';

const pkg = '@fluentic/style';

export const STYLE_IMPORT_PATH = pkg;
export const STYLE_CSS_IMPORT_PATH = pkg + '/css';
export const STYLE_UTILS_IMPORT_PATH = pkg + '/utils';
export const STYLE_DIALECT_IMPORT_PATH = pkg + '/dialect';
export const STYLE_DEV_RSC_IMPORT_PATH = pkg + '/dev/rsc';
export const STYLE_ENTRY_PROD_EXTRACT_IMPORT_PATH = pkg + '/entry/prod/extract';
export const STYLE_EXTRACT_RUNTIME_IMPORT_PATH = pkg + '/entry/prod/runtime';
export const STYLE_RSC_EXTRACT_RUNTIME_IMPORT_PATH = pkg + '/entry/rsc-prod/runtime';

export const DEFAULT_CONFIG = {
  ...CSS_CONFIG_DEFAULT,
};

export const IMPORT_PATHS = [
  STYLE_IMPORT_PATH,
  STYLE_CSS_IMPORT_PATH,
  STYLE_DIALECT_IMPORT_PATH,
  STYLE_DEV_RSC_IMPORT_PATH,
];

export const IMPORT_EXTRACT = STYLE_ENTRY_PROD_EXTRACT_IMPORT_PATH;

export const FN_STYLE = 'style';

export const FN_STYLE_SLOT = 'slot';
export const FN_STYLE_SCOPE = 'scope';
export const FN_STYLE_VALUE = 'value';
export const FN_STYLE_RAW = 'raw';
export const FN_STYLE_PLAIN = 'plain';
export const FN_STYLE_KEYFRAMES = 'keyframes';
export const FN_STYLE_MERGE = 'merge';

export const FN_CREATE_TOKEN = 'createToken';
export const FN_CREATE_TOKENS = 'createTokens';
export const FN_CREATE_NAMED_TOKEN = 'createNamedToken';
export const FN_CREATE_NAMED_TOKENS = 'createNamedTokens';
export const FN_CREATE_VALUES = 'createValues';
export const FN_CREATE_THEME = 'createTheme';
export const FN_EXPOSE_STYLE = 'exposeStyle';

export const FN_BIND_SCOPE = 'bindScope';
export const FN_COMBINE_SCOPE = 'combineScope';
export const FN_COMBINE_STYLE = 'combineStyle';
export const FN_GET_CLASS_NAME = 'getClassName';
export const FN_GET_TOKEN = 'getToken';

export const FN_CREATE_KEYFRAMES = 'createKeyframes';
export const FN_CREATE_FONT_FACE = 'createFontFace';
export const FN_CREATE_FONT_PALETTE_VALUES = 'createFontPaletteValues';
export const FN_CREATE_POSITION_TRY = 'createPositionTry';
export const FN_CREATE_COUNTER_STYLE = 'createCounterStyle';
export const FN_CREATE_PROPERTY = 'createProperty';
export const FN_FONT_SRC = 'fontSrc';

export const FN_CREATE_EXTRACTED_STYLE = 'createExtractedStyle';
export const FN_CREATE_EXTRACTED_SLOT = 'createExtractedSlot';
export const FN_CREATE_EXTRACTED_SCOPE = 'createExtractedScope';
export const FN_CREATE_EXTRACTED_TOKEN = 'createExtractedToken';
export const FN_CREATE_EXTRACTED_THEME = 'createExtractedTheme';
export const FN_GET_EXTRACTED_STYLE_ITEMS = 'getExtractedStyleItems';
export const FN_CREATE_EXTRACTED_STYLE_MERGE = 'createExtractedStyleMerge';
export const FN_WITH_TOKENS = 'withTokens';

export const DEBUG_SOURCE_URL_VAR = '_styleDebugSourceUrl';
export const DEBUG_SOURCE_CONTENT_VAR = '_styleDebugSourceContent';
