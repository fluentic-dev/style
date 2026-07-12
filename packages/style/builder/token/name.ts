export function getStyleTokenNameFromId(id: string | undefined): string | null {
  if (!id) return null;

  const parts = id.split('--');
  const first = normalizeStyleTokenName(parts[0]);

  if (!first) {
    return parts.length > 1 ? normalizeStyleTokenName(parts.slice(1).join('--')) : null;
  }

  return normalizeStyleTokenName([first, ...parts.slice(1)].join('--'));
}

export function getChildStyleTokenName(
  name: string | null | undefined,
  child: string | null | undefined,
) {
  const childName = normalizeStyleTokenName(child);
  if (!childName) return normalizeStyleTokenName(name);

  const parentName = normalizeStyleTokenName(name);
  return parentName ? parentName + '--' + childName : childName;
}

export function normalizeStyleTokenName(value: string | null | undefined): string | null {
  if (!value) return null;

  value = value.trim();
  if (!value) return null;
  if (/^\d+$/.test(value)) return null;
  if (isGeneratedTokenHash(value)) return null;

  value = stripGenericTokenPrefix(value);
  if (!value) return null;

  const stableSuffix = value.match(/^(.+)-[a-z0-9]{7}$/);
  if (stableSuffix?.[1] && isGeneratedTokenHash(value.slice(-7))) return normalizeStyleTokenName(stableSuffix[1]);

  return value;
}

function isGeneratedTokenHash(value: string) {
  return /^[a-z0-9]{7}$/.test(value) && /\d/.test(value);
}

function stripGenericTokenPrefix(value: string) {
  const parts = value.split('--');

  while (parts[0] === 'token' || parts[0] === 'tokens') {
    parts.shift();
  }

  return parts.join('--');
}
