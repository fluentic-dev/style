import type { StyleSheet } from '../../sheet';
import { createNoopSheet } from '../../sheet/utils/noop';
import { globalData, setGlobalData } from '../../utils/global';

const GLOBAL_KEY = 'runtime.sheet.global';

export function getGlobalSheet(): StyleSheet {
  return globalData(GLOBAL_KEY, () => createNoopSheet());
}

export function setGlobalSheet(sheet: StyleSheet): void {
  setGlobalData(GLOBAL_KEY, sheet);
}
