import { DEFAULT_RUNTIME_CONFIG as DEFAULT_CONFIG } from '../../config/default';

export { DEFAULT_CONFIG };

export const IMPORT_PATHS = [
  '@fluentic/style',
  '@fluentic/style/server',
];

export const IMPORT_EXTRACT = '@fluentic/style/builder/extract';

export const FN_STYLE = 'style';

export const FN_CREATE_THEME = 'createTheme';
export const FN_CREATE_TOKEN = 'createToken';
export const FN_CREATE_TOKENS = 'createTokens';
export const FN_CREATE_VALUES = 'createValues';

export const FN_CREATE_EXTRACTED_STYLE = 'createExtractedStyle';
export const FN_CREATE_EXTRACTED_SLOT = 'createExtractedSlot';
export const FN_CREATE_EXTRACTED_SCOPE = 'createExtractedScope';
export const FN_CREATE_EXTRACTED_TOKEN = 'createExtractedToken';
export const FN_CREATE_EXTRACTED_THEME = 'createExtractedTheme';

export const DEBUG_SOURCE_URL_VAR = '_styleDebugSourceUrl';
export const DEBUG_SOURCE_CONTENT_VAR = '_styleDebugSourceContent';
