export function getDebugValueName(
  value: string,
  maxLength: number,
): string | null {
  if (!value) return null;

  const normalized = value.trim().toLowerCase();

  // 1. PERFORMANCE FAST-PASS: Pure alphanumeric strings require zero string processing
  if (/^[a-z0-9]+$/.test(normalized)) {
    return normalized.slice(0, maxLength);
  }

  // 2. NOISE FILTER: Instantly dump massive string patterns or visual assets
  if (
    normalized.length > 64 ||
    normalized.charCodeAt(0) === 117 || // Fast 'u' check for url()
    normalized.startsWith('url') ||
    normalized.includes('gradient') ||
    normalized.startsWith('image') ||
    normalized.startsWith('cubic-bezier')
  ) {
    return null;
  }

  // 3. AGGRESSIVE COMPRESSION Pipeline
  const name = normalized
    // Compress units to single characters to preserve string limits
    .replace(/px/g, 'p') // 15px -> 15p
    .replace(/rem/g, 'r') // 1.5rem -> 1-5r
    .replace(/em/g, 'e') // 2em -> 2e
    .replace(/%/g, 'pct') // 100% -> 100pct
    .replace(/fr/g, 'f') // 1fr -> 1f
    // Wipe out CSS utility function names completely
    .replace(/(calc|rgba?|hsla?|var|env|fit-content)\(/g, '')
    // Turn structural delimiters, dots, and hash symbols into clean dashes
    .replace(/[.#,()"'#]/g, '-')
    .replace(/\s+/g, '-')
    // Purge unexpected illegal chars and collapse overlapping dashes
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/[-_]+/g, '-')
    .replace(/^-+|-+$/g, '');

  // 4. Final Fallback
  if (!name || name.length < 1) {
    return null;
  }

  return name.slice(0, maxLength);
}
