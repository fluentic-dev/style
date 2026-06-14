import type { CompilerOptions } from '../../compiler';
import type { BabelTransformSourceMap } from '../../compiler/transform';
import {
  type GetSourcemapFilePathFn,
  normalizeSourcemapSourcePath,
  type SourcemapFilePathInfo,
} from '../../compiler/utils/sourcemap';
import type { SourcemapSidecar } from './sidecar';

export type BundlerSourceMap = BabelTransformSourceMap | undefined;
export type DevSourcemapMode = NonNullable<CompilerOptions['devSourcemap']>;

export type DefaultSourcemapUrlInput =
  | string
  | Pick<SourcemapFilePathInfo, 'absolutePath' | 'relativePath' | 'sourcePath'>;

export function parseBundlerSourceMap(map: string | null | undefined): any {
  if (!map) return null;
  return JSON.parse(map) as Exclude<BabelTransformSourceMap, string | null | undefined>;
}

export function getDefaultSourcemapUrl(input: DefaultSourcemapUrlInput) {
  const sourcePath = typeof input === 'string'
    ? input
    : input.sourcePath || input.relativePath || input.absolutePath;

  const resourcePath = normalizeSourcemapSourcePath(sourcePath);

  return `source:///${resourcePath}`;
}

export function resolveDevSourcemapMode(
  mode: CompilerOptions['devSourcemap'],
  dev: boolean,
): DevSourcemapMode {
  return mode ?? (dev ? 'sidecarServer' : 'sourceUrl');
}

export function resolvePluginSourcemapFilePath(
  getSourcemapFilePath: GetSourcemapFilePathFn | undefined,
  sourcemapSidecar: SourcemapSidecar | null,
): GetSourcemapFilePathFn {
  return (info) => {
    const defaultSourceUrl = sourcemapSidecar
      ? sourcemapSidecar.getSourceUrl(info.absolutePath, info.relativePath)
      : getDefaultSourcemapUrl(info);

    const sourcePath = getSourcemapFilePath?.({
      ...info,
      sourcePath: info.sourcePath,
      sourceUrl: defaultSourceUrl,
    });

    if (!sourcemapSidecar) return sourcePath || defaultSourceUrl;

    return sourcemapSidecar.registerSource(
      info.absolutePath,
      sourcePath || defaultSourceUrl,
    );
  };
}

export function resolvePluginSourcemapOptions<T extends CompilerOptions>(
  options: T,
  sourcemapSidecar: SourcemapSidecar | null,
): T {
  return {
    ...options,
    getSourcemapFilePath: resolvePluginSourcemapFilePath(
      options.getSourcemapFilePath,
      sourcemapSidecar,
    ),
  };
}
