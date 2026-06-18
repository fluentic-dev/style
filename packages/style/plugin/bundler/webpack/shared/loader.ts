import path from 'node:path';
import type { LoaderDefinitionFunction } from 'webpack';
import type { BabelTransformSourceMap } from '../../../../compiler/transform';
import { normalizePath } from '../../../../compiler/utils/path';
import { createTransformFilter, normalizeModuleId, type PluginOptions } from '../../../utils';
import { formatError } from '../../../utils/misc';

export type WebpackLoaderOptions = PluginOptions & {
  compilerId: string;
};

export type WebpackLoaderContext = ThisParameterType<LoaderDefinitionFunction<WebpackLoaderOptions>>;

export type WebpackLoaderResult = {
  code: string;
  sourcemap: string | null;
};

export type WebpackLoaderTransformArgs<State> = {
  code: string;
  entry: State;
  filePath: string;
  inputMap: BabelTransformSourceMap;
  loaderContext: WebpackLoaderContext;
  options: WebpackLoaderOptions;
};

export type WebpackLoaderFilterArgs<State> = {
  entry: State;
  filePath: string;
  options: WebpackLoaderOptions;
};

export function createWebpackLoader<State>(args: {
  getEntry: (compilerId: string, options: WebpackLoaderOptions) => State | null | undefined;
  missingCompilerMessage: string;
  shouldTransform?: (args: WebpackLoaderFilterArgs<State>) => boolean;
  transform: (args: WebpackLoaderTransformArgs<State>) => WebpackLoaderResult | null;
}): LoaderDefinitionFunction<WebpackLoaderOptions> {
  return function(source, inputMap) {
    const callback = this.async();
    const options = this.getOptions();

    const entry = args.getEntry(options.compilerId, options);

    if (!entry) {
      callback(new Error(formatError(args.missingCompilerMessage)));
      return;
    }

    const filePath = normalizeModuleId(this.resourcePath);
    const shouldTransform = args.shouldTransform
      ? args.shouldTransform({ entry, filePath, options })
      : createTransformFilter(options)(filePath);

    if (!shouldTransform) {
      callback(null, source, inputMap);
      return;
    }

    try {
      const result = args.transform({
        code: source.toString(),
        entry,
        filePath,
        inputMap: inputMap as BabelTransformSourceMap,
        loaderContext: this,
        options,
      });

      if (!result) {
        callback(null, source, inputMap);
        return;
      }

      callback(
        null,
        result.code,
        parseWebpackSourceMap(
          result.sourcemap,
          this.rootContext,
        ),
      );
    } catch (err) {
      callback(err as Error);
    }
  };
}

type WebpackSourceMap = {
  version: number;
  sources: string[];
  names: string[];
  mappings: string;
  file: string;
  sourceRoot?: string;
  sourcesContent?: string[];
  debugId?: string;
  [key: string]: unknown;
};

function parseWebpackSourceMap(map: string | null, rootContext: string): WebpackSourceMap | null {
  if (!map) return null;
  return normalizeWebpackSourceMap(JSON.parse(map) as WebpackSourceMap, rootContext);
}

function normalizeWebpackSourceMap(map: WebpackSourceMap, rootContext: string): WebpackSourceMap {
  if (!Array.isArray(map.sources)) return map;

  const sourceRoot = typeof map.sourceRoot === 'string' ? map.sourceRoot : '';

  return {
    ...map,
    sourceRoot: isFilePathLike(sourceRoot) ? undefined : map.sourceRoot,
    sources: map.sources.map((source) => normalizeWebpackSource(source, rootContext, sourceRoot)),
  };
}

function normalizeWebpackSource(source: string, rootContext: string, sourceRoot: string) {
  if (!isFilePathLike(source) && !isFilePathLike(sourceRoot)) return source;

  const filePath = toAbsoluteFilePath(source, sourceRoot);

  if (!filePath) return source;

  const relativePath = normalizePath(path.relative(rootContext, filePath));

  return relativePath.startsWith('.') ? relativePath : `./${relativePath}`;
}

function toAbsoluteFilePath(source: string, sourceRoot: string) {
  const sourcePath = stripFileProtocol(source);
  const rootPath = stripFileProtocol(sourceRoot);

  if (path.isAbsolute(sourcePath) || path.win32.isAbsolute(sourcePath)) {
    return sourcePath;
  }

  if (rootPath && (path.isAbsolute(rootPath) || path.win32.isAbsolute(rootPath))) {
    return path.join(rootPath, sourcePath);
  }

  return null;
}

function stripFileProtocol(value: string) {
  if (!value.startsWith('file://')) return value;
  return decodeURIComponent(value.slice('file://'.length));
}

function isFilePathLike(value: string) {
  if (!value) return false;
  if (value.startsWith('file://')) return true;
  return path.isAbsolute(value) || path.win32.isAbsolute(value);
}
