export function getFriendlySelectorName(
  selector: string,
  maxLength: number,
): string | null {
  if (!selector) return null;

  const normalized = selector.trim().toLowerCase();

  // 1. Return null early *only* for completely plain element tags (e.g., "div", "main")
  // This allows pure pseudos like ":hover" or template symbols like "..." to pass through.
  if (/^[a-z0-9]+$/.test(normalized)) {
    return null;
  }

  let name = '';

  // 2. Handle At-Rules
  if (normalized.startsWith('@media')) {
    name = 'media-' + compressQuery(normalized.slice(6));
  } else if (normalized.startsWith('@container')) {
    name = 'container-' + compressQuery(normalized.slice(10));
  } else if (normalized.startsWith('@supports')) {
    name = 'supports-' + compressQuery(normalized.slice(9));
  } else {
    // 3. Process Standard, Pseudo, Template, and Compound Selectors
    name = normalized
      // Safe placeholder substitutions before blowing away special characters
      .replace(/\$\$/g, 'args')
      .replace(/\$/g, 'arg')
      .replace(/\.\.\./g, 'merge')
      // Compress common pseudo-arguments to maximize our tight 12-char budget
      .replace(/:not\(/g, 'not-')
      .replace(/:(is|where|has)\(/g, '$1-')
      .replace(/:nth-(child|of-type)\(/g, 'nth-')
      // Standardize structural symbols and colons (handles :hover:active and ::before)
      .replace(/[.#]/g, '-')
      .replace(/[[\]()]/g, '-')
      .replace(/:+/g, '-')
      .replace(/\s+/g, '-')
      // Strip any remaining illegal characters, clean up dashes
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/[-_]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  // 4. Final safety checks
  if (!name || name === 'selector' || name.length < 2) {
    return null;
  }

  return name.slice(0, maxLength);
}

function compressQuery(query: string): string {
  return query
    .replace(/\$\$/g, 'args')
    .replace(/\(\s*min-width\s*:\s*/g, 'minw-')
    .replace(/\(\s*max-width\s*:\s*/g, 'maxw-')
    .replace(/\(\s*prefers-color-scheme\s*:\s*/g, 'scheme-')
    .replace(/\b(and|or|only|not)\b/g, '-')
    .replace(/>=/g, '-gte-')
    .replace(/<=/g, '-lte-')
    .replace(/>/g, '-gt-')
    .replace(/</g, '-lt-')
    .replace(/[():=\s]+/g, '-')
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/[-_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
