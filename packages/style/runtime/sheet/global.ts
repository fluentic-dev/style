import { createStyleSheet } from '../../sheet';
import type { StyleSheet } from '../../sheet';
import { globalData, setGlobalData } from '../../utils/global';

const GLOBAL_KEY = 'runtime.sheet.global';

export function getGlobalSheet(): StyleSheet {
  return globalData(GLOBAL_KEY, () => createStyleSheet());
}

export function setGlobalSheet(sheet: StyleSheet): void {
  setGlobalData(GLOBAL_KEY, sheet);
}
