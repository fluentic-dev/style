import picomatch from 'picomatch';
import { normalizePath } from '../../compiler/utils/path';

export const DEFAULT_TRANSFORM_INCLUDE_PATTERN = '\\.[cm]?[jt]sx?$';

export const DEFAULT_TRANSFORM_INCLUDE = new RegExp(DEFAULT_TRANSFORM_INCLUDE_PATTERN);

export const DEFAULT_TRANSFORM_EXCLUDE = /node_modules/;

export type FilterPattern = string | RegExp | Array<string | RegExp>;

export type TransformFilterOptions = {
  include?: FilterPattern;
  exclude?: FilterPattern;
};

export type TransformFilter = {
  (id: string): boolean;
  clear(): void;
};

export function normalizeModuleId(id: string) {
  return id.split('?')[0]?.split('#')[0] ?? id;
}

export function createTransformFilter(options: TransformFilterOptions = {}): TransformFilter {
  const includes = normalizeMatchers(options.include);

  const excludes = normalizeMatchers(
    options.exclude ?? (options.include ? undefined : DEFAULT_TRANSFORM_EXCLUDE),
  );

  const cache = new Map<string, boolean>();

  const filter = ((id: string) => {
    const filePath = normalizeModuleId(id);
    const cached = cache.get(filePath);

    if (cached !== undefined) return cached;

    const result = shouldTransform(filePath, includes, excludes);

    cache.set(filePath, result);

    return result;
  }) as TransformFilter;

  filter.clear = () => {
    cache.clear();
  };

  return filter;
}

type FilterMatcher = (id: string) => boolean;

function normalizeMatchers(patterns?: FilterPattern) {
  if (!patterns) return [];

  const items = Array.isArray(patterns) ? patterns : [patterns];

  return items.map(createMatcher);
}

function createMatcher(pattern: string | RegExp): FilterMatcher {
  if (pattern instanceof RegExp) {
    return (id) => {
      pattern.lastIndex = 0;
      return pattern.test(id);
    };
  }

  const matcher = picomatch(normalizePath(pattern), {
    dot: true,
  });

  return (id) => matcher(normalizePath(id));
}

function shouldTransform(
  id: string,
  includes: FilterMatcher[],
  excludes: FilterMatcher[],
): boolean {
  for (const exclude of excludes) {
    if (exclude(id)) return false;
  }

  if (!includes.length) {
    return DEFAULT_TRANSFORM_INCLUDE.test(id);
  }

  for (const include of includes) {
    if (include(id)) return true;
  }

  return false;
}
