type FormatInfo = { [key: string]: string | null; };

type NameFormatFn<Info> = (info: Info) => string;
type NameFormat<Info> = string | NameFormatFn<Info>;

type CompiledSegment<Key extends string> = {
  optional: boolean;
  parts: CompiledPart<Key>[];
};

type CompiledPart<Key extends string> =
  | { type: 'text'; value: string; }
  | {
    type: 'token';
    key: Key;
    maxLength: number | null;
    truncate: boolean;
  };

const TOKEN_REGEX = /\(([a-zA-Z][a-zA-Z0-9]*)(?::([0-9]+)(!)?)?\)/g;
const OPTIONAL_REGEX = /\[([^[\]]*)\]/g;

const HASH_TOKEN = '$hash';

export type NameFormatter<Info extends object> = ReturnType<typeof createNameFormatter<Info>>;

export function createNameFormatter<Info extends object>(
  keys: readonly (keyof Info & string)[],
) {
  const keySet = new Set<string>(keys);
  const cache = new Map<string, NameFormatFn<Info>>();

  function getFormatFn(format: NameFormat<Info>) {
    if (typeof format === 'function') return format;

    let fn = cache.get(format);

    if (!fn) {
      fn = compileFormat(format, keySet);
      cache.set(format, fn);
    }

    return fn;
  }

  return function format(format: NameFormat<Info>, hash: string | null, info: Info) {
    const name = getFormatFn(format)(info);

    if (!hash) return name;

    if (name.includes(HASH_TOKEN)) {
      return name.replace(HASH_TOKEN, hash);
    }

    return name ? (name + '--' + hash) : hash;
  };
}

function compileFormat<Info extends object>(
  format: string,
  keySet: ReadonlySet<string>,
): NameFormatFn<Info> {
  type Key = keyof Info & string;
  const segments = compileSegments<Key>(format, keySet);

  return (info) => {
    let name = '';

    for (const segment of segments) {
      const text = formatSegment(info, segment);

      if (text === null) {
        if (!segment.optional) return '';
        continue;
      }

      name += text;
    }

    return name;
  };
}

function compileSegments<Key extends string>(
  format: string,
  keySet: ReadonlySet<string>,
) {
  const segments: CompiledSegment<Key>[] = [];
  let lastIndex = 0;

  for (const match of format.matchAll(OPTIONAL_REGEX)) {
    const index = match.index ?? 0;

    if (index > lastIndex) {
      segments.push({
        optional: false,
        parts: compileParts<Key>(format.slice(lastIndex, index), keySet),
      });
    }

    segments.push({
      optional: true,
      parts: compileParts<Key>(match[1], keySet),
    });

    lastIndex = index + match[0].length;
  }

  if (lastIndex < format.length) {
    segments.push({
      optional: false,
      parts: compileParts<Key>(format.slice(lastIndex), keySet),
    });
  }

  return segments;
}

function compileParts<Key extends string>(
  segment: string,
  keySet: ReadonlySet<string>,
) {
  const parts: CompiledPart<Key>[] = [];
  let lastIndex = 0;

  for (const match of segment.matchAll(TOKEN_REGEX)) {
    const index = match.index ?? 0;
    const key = match[1];

    if (!keySet.has(key)) continue;

    if (index > lastIndex) {
      parts.push({ type: 'text', value: segment.slice(lastIndex, index) });
    }

    parts.push({
      type: 'token',
      key: key as Key,
      maxLength: match[2] ? Number(match[2]) : null,
      truncate: Boolean(match[3]),
    });

    lastIndex = index + match[0].length;
  }

  if (lastIndex < segment.length) {
    parts.push({ type: 'text', value: segment.slice(lastIndex) });
  }

  return parts;
}

function formatSegment<Info extends object, Key extends keyof Info & string>(
  info: Info,
  segment: CompiledSegment<Key>,
) {
  let text = '';

  for (const part of segment.parts) {
    if (part.type === 'text') {
      text += part.value;
      continue;
    }

    const value = formatTokenValue(
      (info as FormatInfo)[part.key],
      part.maxLength,
      part.truncate,
    );
    if (value === null) {
      if (segment.optional) return null;
      continue;
    }

    text += value;
  }

  return text;
}

function formatTokenValue(
  value: string | null,
  maxLength: number | null,
  truncate: boolean,
) {
  if (!value) return null;
  if (!maxLength) return value;

  if (!Number.isFinite(maxLength) || maxLength < 0 || value.length <= maxLength) return value;

  return truncate ? value.slice(0, maxLength) : null;
}
