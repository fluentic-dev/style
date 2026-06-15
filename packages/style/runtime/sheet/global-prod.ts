import { createProdSheet } from '../../sheet/prod';
import type { StyleSheet } from '../../sheet';
import { globalData, setGlobalData } from '../../utils/global';

const GLOBAL_KEY = 'runtime.sheet.global';

export function getGlobalSheet(): StyleSheet {
  return globalData(GLOBAL_KEY, () => createProdSheet());
}

export function setGlobalSheet(sheet: StyleSheet): void {
  setGlobalData(GLOBAL_KEY, sheet);
}
