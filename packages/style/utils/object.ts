export function clone<T>(
  data: T | null | undefined,
) {
  let cloned: Record<string, unknown> = {};

  for (let key in data) {
    cloned[key] = data[key];
  }

  return cloned as T;
}

export function merge<T>(
  data1: T | null | undefined,
  data2: T | null | undefined,
) {
  let merged: Record<string, unknown> = {};

  if (data1) {
    for (let key in data1) {
      merged[key] = data1[key];
    }
  }

  if (data2) {
    for (let key in data2) {
      merged[key] = data2[key];
    }
  }

  return merged as T;
}

export function assign(
  target: unknown,
  data: object,
) {
  for (let key in data) {
    (target as any)[key] = (data as any)[key];
  }
}

export function set(
  target: unknown,
  field: string | symbol,
  data: unknown,
) {
  (target as any)[field] = data;
}

export function get(
  target: unknown,
  field: string | symbol,
): unknown {
  return (target as any)[field] ?? null;
}

export function toArray<T>(value: T | T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : (value ? [value] : []);
}

export function isFunction(value: unknown): value is Function {
  return typeof value === 'function';
}

export function isPromiseLike<T>(value: T | Promise<T>): value is Promise<T> {
  return typeof value === 'object' && value !== null && 'then' in value;
}
