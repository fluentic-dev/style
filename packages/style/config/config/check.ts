import { globalData } from '../../utils/global';

export type StyleCheckLevel = false | 'warn' | 'error';

export type CheckImportantOptions = {
  rawValue?: StyleCheckLevel;
  outsideSheet?: StyleCheckLevel;
};

export type StyleCheckOptions = {
  important?: CheckImportantOptions;
};

export const CHECK_CONFIG_DEFAULT: StyleCheckOptions = {};

export const CHECK_CONFIG = globalData<StyleCheckOptions>(
  'config.check',
  () => ({ ...CHECK_CONFIG_DEFAULT }),
);

export function setStyleCheckOptions(options: StyleCheckOptions) {
  CHECK_CONFIG.important = options.important
    ? { ...options.important }
    : undefined;
}
