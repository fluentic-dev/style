import picomatch from 'picomatch';
import { normalizePath } from '../../compiler/utils/path';

export const DEFAULT_TRANSFORM_INCLUDE_PATTERN = '\\.[cm]?[jt]sx?$';

export const DEFAULT_TRANSFORM_INCLUDE = new RegExp(DEFAULT_TRANSFORM_INCLUDE_PATTERN);

export const DEFAULT_TRANSFORM_EXCLUDE = /node_modules/;

export type FilterPattern = string | RegExp | Array<string | RegExp>;

export type TransformFilterOptions = {
  include?: FilterPattern;
  exclude?: FilterPattern;
  /** Exact npm package names whose script files override file include/exclude rules. */
  includePackages?: string | string[];
  /** Exact npm package names excluded before all other filter rules. */
  excludePackages?: string | string[];
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
  const includePackages = createPackagePattern(options.includePackages);
  const excludePackages = createPackagePattern(options.excludePackages);

  const excludes = normalizeMatchers(
    options.exclude ?? (options.include ? undefined : DEFAULT_TRANSFORM_EXCLUDE),
  );

  const cache = new Map<string, boolean>();

  const filter = ((id: string) => {
    const filePath = normalizeModuleId(id);
    const cached = cache.get(filePath);

    if (cached !== undefined) return cached;

    const packagePath = normalizePath(filePath);
    const result = excludePackages?.test(packagePath)
      ? false
      : includePackages?.test(packagePath)
      ? DEFAULT_TRANSFORM_INCLUDE.test(filePath)
      : shouldTransform(filePath, includes, excludes);

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

/** A conservative native prefilter; the shared JS filter remains authoritative. */
export function createTransformHookFilter(options: TransformFilterOptions = {}) {
  const includePackages = createPackagePattern(options.includePackages);
  const excludePackages = createPackagePattern(options.excludePackages);
  const exclude: RegExp[] = [];
  if (excludePackages) exclude.push(excludePackages);

  if (!options.include && options.exclude === undefined) {
    // Package inclusions override the default node_modules exclusion.
    exclude.push(
      new RegExp(
        `^${includePackages ? `(?!${includePackages.source})` : ''}[^?#]*node_modules`,
      ),
    );
  }

  return {
    id: {
      // Custom globs/regexes run against normalized IDs in the shared filter.
      // Keeping the native check broad avoids changing their matching semantics.
      include: options.include ? undefined : /^[^?#]*\.[cm]?[jt]sx?(?:[?#][\s\S]*)?$/,
      exclude,
    },
  };
}

function createPackagePattern(packages?: string | string[]): RegExp | undefined {
  const names = typeof packages === 'string' ? [packages] : packages ?? [];
  if (!names.length) return undefined;

  for (const name of names) {
    if (!/^(?:@[a-zA-Z0-9_][a-zA-Z0-9._-]*\/)?[a-zA-Z0-9_][a-zA-Z0-9._-]*$/.test(name)) {
      throw new Error(
        `[fluentic-style] Invalid package name in includePackages/excludePackages: ${JSON.stringify(name)}`,
      );
    }
  }

  const separator = '[/\\\\]';
  const alternatives = names.map((name) => name.split('/').map(escapeRegExp).join(separator)).join('|');
  // Match the innermost node_modules owner, including pnpm's nested layout.
  // A package's nested dependencies must not inherit its include/exclude rule.
  return new RegExp(
    `^(?:[^?#]*${separator})?node_modules${separator}(?:${alternatives})` +
      `(?![^?#]*${separator}node_modules${separator})` +
      `(?:${separator}[^?#]*)?(?:[?#][\\s\\S]*)?$`,
  );
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
