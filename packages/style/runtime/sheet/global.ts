import { createStyleSheet } from '../../sheet';
import type { StyleSheet } from '../../sheet';
import { getDocumentSheet, setDocumentSheet } from './document';

export function getGlobalSheet(): StyleSheet {
  return getDocumentSheet(createStyleSheet);
}

export function setGlobalSheet(sheet: StyleSheet): void {
  setDocumentSheet(sheet);
}
