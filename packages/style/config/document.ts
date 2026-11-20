import { globalData } from '../utils/global';

const state = globalData<{
  target: boolean | Document;
  listeners: Set<() => void>;
}>('config.document', () => ({ target: true, listeners: new Set() }));

export function getRuntimeDocument(documentOverride?: Document): Document | null {
  if (state.target === false) return null;
  if (state.target !== true) return state.target;
  if (documentOverride) return documentOverride;
  return typeof globalThis.document === 'undefined' ? null : globalThis.document;
}

export function setRuntimeDocument(target: boolean | Document) {
  if (state.target === target) return;
  state.target = target;
  state.listeners.forEach((listener) => listener());
}

export function onRuntimeDocumentChange(listener: () => void) {
  state.listeners.add(listener);
}
