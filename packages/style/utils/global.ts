import { symbol } from './const';

type Global<T> = typeof globalThis & Record<symbol, T | undefined>;

export function getGlobalData<T>(key: string) {
  return (globalThis as Global<T>)[symbol(key)];
}

export function globalData<T>(key: string, data: () => T) {
  return (globalThis as Global<T>)[symbol(key)] ??= data();
}

export function setGlobalData<T>(key: string, data: T) {
  (globalThis as Global<T>)[symbol(key)] = data;
}

export function clearGlobalData(key: string) {
  delete (globalThis as Global<unknown>)[symbol(key)];
}
