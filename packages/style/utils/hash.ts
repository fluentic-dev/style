const BASE62_CHARS = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function toBase62(value: number) {
  let result = '';

  do {
    result = BASE62_CHARS[value % 62] + result;
    value = Math.floor(value / 62);
  } while (value > 0);

  return result;
}

export function hashString(str: string) {
  let hash = 0x811c9dc5;

  for (let i = 0; i < str.length; i++) {
    hash = Math.imul(hash ^ str.charCodeAt(i), 0x01000193);
  }

  return (hash >>> 0).toString(36).padEnd(7, '0');
}

export function normalizeHashLength(length: number) {
  return Number.isFinite(length) ? Math.max(1, Math.floor(length)) : 7;
}
