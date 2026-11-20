import { getRuntimeDocument, onRuntimeDocumentChange } from '../../config/document';
import type { SheetOptions, StyleSheet } from '../../sheet/types';
import { createNoopSheet } from '../../sheet/utils/noop';
import { clearGlobalData, getGlobalData, globalData, setGlobalData } from '../../utils/global';

const GLOBAL_KEY = 'runtime.sheet.global';
const state = globalData<{ document: Document | null; }>('runtime.sheet.document', () => ({
  document: getRuntimeDocument(),
}));

function resetSheet() {
  getGlobalData<StyleSheet>(GLOBAL_KEY)?.destroy?.();
  clearGlobalData(GLOBAL_KEY);
  state.document = getRuntimeDocument();
}

onRuntimeDocumentChange(resetSheet);

export function getDocumentSheet(create: (options: SheetOptions) => StyleSheet): StyleSheet {
  const document = getRuntimeDocument();
  if (state.document !== document) resetSheet();
  return globalData(GLOBAL_KEY, () => document ? create({ document }) : createNoopSheet());
}

export function setDocumentSheet(sheet: StyleSheet) {
  state.document = getRuntimeDocument();
  setGlobalData(GLOBAL_KEY, sheet);
}
