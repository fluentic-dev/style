import type { StyleSheet } from '../../sheet';
import { createProdSheet } from '../../sheet/prod';
import { getDocumentSheet, setDocumentSheet } from './document';

export function getGlobalSheet(): StyleSheet {
  return getDocumentSheet(createProdSheet);
}

export function setGlobalSheet(sheet: StyleSheet): void {
  setDocumentSheet(sheet);
}
