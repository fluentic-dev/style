import type { StyleRuntimeMode } from '../utils/imports';

declare const __FLUENTIC_RUNTIME_MODE__: StyleRuntimeMode | undefined;

export const STYLE_RUNTIME_MODE: StyleRuntimeMode = typeof __FLUENTIC_RUNTIME_MODE__ === 'string'
  ? __FLUENTIC_RUNTIME_MODE__
  : 'full';
