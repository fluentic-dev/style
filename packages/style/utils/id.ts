import { globalData } from './global';

export type StableId = {
  name: string | null;
  id: string;
};

export type IdCounter = { value: number; };

export function createIdCounter(name: string) {
  return globalData('idCounter.' + name, () => ({ value: 0 }));
}

export function resetIdCounter(idCounter: IdCounter) {
  idCounter.value = 0;
}

export function getId(idCounter: IdCounter, stableId: StableId | null): StableId {
  return stableId || { name: null, id: String(idCounter.value++) };
}
