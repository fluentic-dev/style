import { globalData } from '../../utils/global';

export type DebugConfig = {
  isDebugClassNameEnabled: boolean;
  isDebugClassNameConfigured: boolean;

  maxPropertyLength: number;
  maxValueLength: number;
  maxSelectorLength: number;
  maxParentSelectorLength: number;
  maxAtRuleLength: number;
};

export const DEFAULT_DEBUG_CONFIG: DebugConfig = {
  isDebugClassNameEnabled: false,
  isDebugClassNameConfigured: false,

  maxPropertyLength: 24,
  maxValueLength: 8,
  maxSelectorLength: 8,
  maxParentSelectorLength: 8,
  maxAtRuleLength: 10,
};

export const DEBUG_CONFIG = globalData<DebugConfig>(
  'config.debug',
  () => ({ ...DEFAULT_DEBUG_CONFIG }),
);

export function setDebugClassNameEnabled(value: boolean) {
  DEBUG_CONFIG.isDebugClassNameEnabled = value;
  DEBUG_CONFIG.isDebugClassNameConfigured = true;
}

export function setDebugClassNameDefault(value: boolean) {
  if (DEBUG_CONFIG.isDebugClassNameConfigured) return;
  DEBUG_CONFIG.isDebugClassNameEnabled = value;
}

export function setBuildDebugClassName(
  value: boolean | undefined,
  fallback: boolean,
) {
  if (typeof value === 'boolean') {
    setDebugClassNameEnabled(value);
  } else {
    setDebugClassNameDefault(fallback);
  }
}
