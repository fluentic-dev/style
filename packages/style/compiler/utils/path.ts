export function normalizePath(value: string) {
  return value.replace(/\\/g, '/');
}

export function getRelativePath(from: string, to: string) {
  const normalizedFrom = normalizePath(from);
  const normalizedTo = normalizePath(to);
  const fromIsAbsolute = isAbsolutePath(normalizedFrom);
  const toIsAbsolute = isAbsolutePath(normalizedTo);

  if (fromIsAbsolute !== toIsAbsolute) return normalizedTo;

  const fromParts = getPathParts(normalizedFrom);
  const toParts = getPathParts(normalizedTo);

  if (fromParts[0]?.endsWith(':') && toParts[0]?.endsWith(':') && fromParts[0] !== toParts[0]) {
    return normalizedTo;
  }

  let index = 0;
  while (fromParts[index] === toParts[index]) index += 1;

  const up = fromParts.slice(index).map(() => '..');
  const down = toParts.slice(index);

  return [...up, ...down].join('/') || '.';
}

export function isAbsolutePath(value: string) {
  return value.startsWith('/') || /^[A-Za-z]:\//.test(normalizePath(value));
}

export function getBasename(filePath: string) {
  const normalized = normalizePath(filePath).replace(/\/+$/, '');
  return normalized.split('/').pop() || normalized;
}

function getPathParts(value: string) {
  return value.replace(/\/+$/, '').split('/').filter(Boolean);
}
