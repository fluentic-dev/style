import { globalData } from '../../../../utils/global';

export function createWebpackRegistry(name: string) {
  function getRegistry() {
    return globalData(name, () => new Map<string, unknown>());
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
