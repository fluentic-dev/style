import { symbol } from './const';

type Global<T> = typeof globalThis & Record<symbol, T | undefined>;

export function getGlobalData<T>(key: string) {
  return (globalThis as Global<T>)[symbol(key)];
}

export function globalData<T>(key: string, data: () => T) {
  const id = symbol(key);
  const root = globalThis as Global<T>;

  if (root[id] === undefined) {
    assign(root, id, data());
  }

  return root[id]!;
}

export function setGlobalData<T>(key: string, data: T) {
  const id = symbol(key);
  const root = globalThis as Global<T>;

  if (root[id] === undefined) {
    assign(root, id, data);
  } else {
    root[id] = data;
  }
}

export function clearGlobalData(key: string) {
  delete (globalThis as Global<unknown>)[symbol(key)];
}

function assign(target: object, id: symbol, value: unknown) {
  Object.defineProperty(target, id, {
    value,
    configurable: true,
    enumerable: false,
    writable: true,
  });
}
