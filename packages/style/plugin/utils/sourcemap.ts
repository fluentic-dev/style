import type { CompilerOptions, DevSourcemapMode } from '../../compiler';
import type { BabelTransformSourceMap } from '../../compiler/transform';
import { getDefaultSourcemapUrl, type GetSourcemapFilePathFn } from '../../compiler/utils/sourcemap';
import type { SourcemapSidecar } from './sidecar';

export type BundlerSourceMap = BabelTransformSourceMap | undefined;

export function parseBundlerSourceMap(map: string | null | undefined): any {
  if (!map) return null;
  return JSON.parse(map) as Exclude<BabelTransformSourceMap, string | null | undefined>;
}

export function resolveDevSourcemapMode(
  mode: DevSourcemapMode,
  dev: boolean,
): DevSourcemapMode {
  return mode ?? (dev ? 'sidecarServer' : 'sourceUrl');
}

export function resolvePluginSourcemapFilePath(
  getSourcemapFilePath: GetSourcemapFilePathFn | undefined,
  sourcemapSidecar: SourcemapSidecar | null,
): GetSourcemapFilePathFn {
  return (info) => {
    const defaultSourceUrl = getDefaultSourcemapUrl(info);

    const sourcePath = getSourcemapFilePath?.({
      ...info,
      sourcePath: info.sourcePath,
      sourceUrl: defaultSourceUrl,
    });

    const resolvedSourceUrl = sourcePath || defaultSourceUrl;

    sourcemapSidecar?.registerSource(info.absolutePath, resolvedSourceUrl);

    return resolvedSourceUrl;
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
