import { createStyleSheet } from '../../sheet';
import type { StyleSheet } from '../../sheet/types';

let _sheet: StyleSheet | null = null;

export function getGlobalSheet(): StyleSheet {
  if (!_sheet) _sheet = createStyleSheet();
  return _sheet;
}

export function setGlobalSheet(sheet: StyleSheet): void {
  _sheet = sheet;
}
