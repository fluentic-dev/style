import { hashString, normalizeHashLength } from '../../utils/hash';

export function getIdentifierSafeHash(value: string, startLength = 7) {
  const normalizedStartLength = normalizeHashLength(startLength);
  return getIdentifierSafeHashValue(hashString(value)).slice(0, normalizedStartLength);
}

function getIdentifierSafeHashValue(hash: string) {
  const first = hash.charCodeAt(0);

  if (first < 48 || first > 57) return hash;

  return String.fromCharCode(97 + first - 48) + hash.slice(1);
}
