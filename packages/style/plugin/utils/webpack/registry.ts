import { globalSymbol } from '../misc';

type GlobalWithRegistry = typeof globalThis & {
  [key: symbol]: Map<string, unknown> | undefined;
};

export function createWebpackRegistry(name: string) {
  const registryKey = globalSymbol(name);

  function getRegistry() {
    const global = globalThis as GlobalWithRegistry;

    if (!global[registryKey]) {
      global[registryKey] = new Map();
    }

    return global[registryKey];
  }

  return {
    setEntry<T>(id: string, entry: T) {
      getRegistry().set(id, entry);
    },
    getEntry<T>(id: string) {
      return (getRegistry().get(id) ?? null) as T | null;
    },
  };
}
