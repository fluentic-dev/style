import {
  createStyleToken,
  type StyleToken,
  TOKEN_ID,
  TOKEN_NAME,
  TOKEN_OVERRIDE,
  TOKEN_VAR_NAME,
} from '../style/token';

type ValueRecord = Record<PropertyKey, unknown>;

export type NamedToken<Value = unknown> = StyleToken<Value>;

export type NamedTokenRecord<T extends object> = {
  [P in keyof T]: T[P] extends object ? NamedTokenRecord<T[P]>
    : NamedToken<T[P]>;
};

type NamedTokenRoot = {
  readonly __fluenticNamedTokens: true;
  readonly namespace: string;
  readonly values: ValueRecord | undefined;
  readonly cache: Map<string, StyleToken>;
};

const ROOT = Symbol('fluentic.namedTokens.root');

export function createNamedToken<T>(id: string, value?: T): NamedToken<T> {
  const tokenId = createNamedTokenId(id);
  const token = createStyleToken(value, tokenId) as NamedToken<T>;
  token[TOKEN_VAR_NAME] = '--token-' + tokenId;
  return token;
}

export function createNamedTokens<T extends object>(
  namespace: string,
  values?: T,
): NamedTokenRecord<T> {
  return createNamedTokenProxy({
    __fluenticNamedTokens: true,
    namespace,
    values: values as ValueRecord | undefined,
    cache: new Map(),
  }, []) as NamedTokenRecord<T>;
}

export function getNamedToken<T = unknown>(
  tokens: unknown,
  ref: string,
): StyleToken<T> | undefined {
  if (!ref.startsWith('$')) return undefined;

  const root = getNamedTokenRoot(tokens);
  if (!root) return undefined;

  const path = ref.slice(1).split('.').filter(Boolean);
  if (!path.length) return undefined;
  if (!hasNamedTokenPath(root, path)) return undefined;

  return getNamedTokenAtPath(root, path) as StyleToken<T>;
}

export function createNamedTokenId(id: string) {
  return id.split('.').map(encodeNamedTokenSegment).join('-');
}

// Escape separators and the escape marker itself so distinct paths cannot collide.
function encodeNamedTokenSegment(segment: string) {
  return segment.replace(/[^a-zA-Z0-9]/gu, (char) => '_' + char.codePointAt(0)!.toString(16) + '_');
}

function createNamedTokenProxy(
  root: NamedTokenRoot,
  path: string[],
): unknown {
  return new Proxy(noop, {
    get(_target, property) {
      if (property === ROOT) return root;
      if (property === 'then') return undefined;
      if (property === Symbol.toStringTag) return 'NamedTokens';
      if (
        property === TOKEN_ID ||
        property === TOKEN_NAME ||
        property === TOKEN_VAR_NAME ||
        property === TOKEN_OVERRIDE ||
        property === 'value' ||
        property === 'ref'
      ) {
        if (!path.length) return undefined;
        const token = getNamedTokenAtPath(root, path);
        return token[property as keyof typeof token];
      }
      if (typeof property === 'symbol') return undefined;

      return createNamedTokenProxy(root, path.concat(String(property)));
    },
    apply(_target, _thisArg, args) {
      if (!path.length) return undefined;
      const token = getNamedTokenAtPath(root, path);
      return token.apply(undefined, args as Parameters<typeof token>);
    },
  });
}

function getNamedTokenAtPath(
  root: NamedTokenRoot,
  path: string[],
) {
  const key = JSON.stringify(path);
  const cached = root.cache.get(key);
  if (cached) return cached;

  const value = getValueAtPath(root.values, path);
  const id = root.namespace.split('.').concat(path).map(encodeNamedTokenSegment).join('-');
  const token = createStyleToken(value, id);
  token[TOKEN_VAR_NAME] = '--token-' + id;
  root.cache.set(key, token);
  return token;
}

function hasNamedTokenPath(
  root: NamedTokenRoot,
  path: string[],
) {
  if (!root.values) return true;

  let current: unknown = root.values;

  for (let i = 0; i < path.length; i++) {
    if (!current || typeof current !== 'object') return false;
    if (!(path[i] in current)) return false;
    current = (current as ValueRecord)[path[i]];
  }

  return true;
}

function getNamedTokenRoot(tokens: unknown): NamedTokenRoot | undefined {
  if (!tokens || (typeof tokens !== 'object' && typeof tokens !== 'function')) return undefined;

  return (tokens as { [ROOT]?: NamedTokenRoot; })[ROOT];
}

function getValueAtPath(
  values: ValueRecord | undefined,
  path: string[],
) {
  let current: unknown = values;

  for (let i = 0; i < path.length; i++) {
    if (!current || typeof current !== 'object') return undefined;
    current = (current as ValueRecord)[path[i]];
  }

  return current;
}

function noop() {}
