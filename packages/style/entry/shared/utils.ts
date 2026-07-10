export function readEntryDefine(
  key: string,
  readDefine: () => unknown,
  fallback: string,
) {
  let defineValue: unknown;

  try {
    defineValue = readDefine();
  } catch {
    defineValue = undefined;
  }

  if (typeof defineValue === 'string') return defineValue;

  const value = (globalThis as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : fallback;
}

export function readEntryJsonDefine<T>(
  key: string,
  readDefine: () => unknown,
  fallback: T,
): T {
  return JSON.parse(
    readEntryDefine(key, readDefine, JSON.stringify(fallback)),
  ) as T;
}
