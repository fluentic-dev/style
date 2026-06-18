export function getDebugSelectorName(
  selector: string,
): string | null {
  if (!selector) return null;

  const normalized = selector.trim().toLowerCase();

  // Return null early *only* for completely plain element tags (e.g., "div", "main")
  if (/^[a-z0-9]+$/.test(normalized)) {
    return null;
  }

  const name = normalized
    // Safe placeholder substitutions before blowing away special characters
    .replace(/\$\$/g, 'args')
    .replace(/\$/g, 'arg')
    .replace(/\.\.\./g, 'merge')
    // Compress common pseudo-arguments before classNameFormat applies any length policy.
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

  return validateName(name);
}

export function getDebugAtRuleName(
  selector: string | string[],
): string | null {
  if (!selector || (Array.isArray(selector) && selector.length === 0)) return null;

  // Link stacked/nested array features together cleanly using a single dash
  const name = Array.isArray(selector)
    ? selector.map(parseAtRule).filter(Boolean).join('-')
    : parseAtRule(selector);

  const cleanName = name.replace(/[-_]+/g, '-').replace(/^-+|-+$/g, '');
  return validateName(cleanName);
}

function compressQuery(query: string): string {
  return query
    .trim()
    .toLowerCase()
    // 1. Convert feature names directly to clean, recognizable short tokens
    .replace(/prefers-color-scheme\s*:\s*dark/g, 'dark')
    .replace(/prefers-color-scheme\s*:\s*light/g, 'light')
    .replace(/min-width\s*:\s*/g, 'min-')
    .replace(/max-width\s*:\s*/g, 'max-')
    .replace(/min-height\s*:\s*/g, 'minh-')
    .replace(/max-height\s*:\s*/g, 'maxh-')
    .replace(/inline-size/g, 'inline')
    // 2. Clear out noise words
    .replace(/\b(and|or|only|not)\b/g, '')
    // 3. Handle mathematical range syntax cleanly (e.g., width >= 400px -> width-gte-400px)
    .replace(/>=/g, '-gte-')
    .replace(/<=/g, '-lte-')
    .replace(/>/g, '-gt-')
    .replace(/</g, '-lt-')
    // 4. Flatten layout syntax and clean dashes
    .replace(/[():=\s]+/g, '-')
    .replace(/[-_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function validateName(name: string): string | null {
  if (!name || name === 'selector' || name.length < 2) return null;
  return name;
}

function parseAtRule(rule: string): string {
  const normalized = rule.trim().toLowerCase();

  // Strip away structural keywords completely for a clean variant prefix
  if (normalized.startsWith('@media')) return compressQuery(normalized.slice(6));
  if (normalized.startsWith('@container')) return compressQuery(normalized.slice(10));
  if (normalized.startsWith('@supports')) return compressQuery(normalized.slice(9));

  return compressQuery(normalized);
}
