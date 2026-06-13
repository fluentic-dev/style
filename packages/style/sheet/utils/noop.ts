import type { StyleSheet } from '../types';

const noopSheet: StyleSheet = {
  updateLayers() {},
  insert() {},
  flush() {},
};

export function createNoopSheet() {
  return noopSheet;
}
