export type SourcemapFilePathInfo = {
  /**
   * Absolute source file path as seen by the transform pipeline.
   */
  filePath: string;

  /**
   * Alias for filePath, kept explicit for callers that prefer this name.
   */
  absolutePath: string;

  /**
   * File path relative to the plugin root/project root, normalized with forward slashes.
   */
  relativePath: string;

  /**
   * Source path normalized for protocol-style URLs. Leading "../" and "./" segments
   * are removed so callers can safely prefix values such as "webpack:///".
   */
  sourcePath: string;

  /**
   * Plugin root/project root when known.
   */
  projectDir: string;

  /**
   * Default browser-loadable source URL produced by an integration, when available.
   */
  sourceUrl?: string | null;
};

/**
 * Customize the CSS sourcemap source path/URL for a transformed source file.
 * Return a bundler-served path such as "/src/styles.ts", "webpack://...",
 * or a dev-server URL. Return null/undefined to keep the integration default.
 */
export type GetSourcemapFilePathFn = (info: SourcemapFilePathInfo) => string | null | undefined;

export function normalizeSourcemapSourcePath(filePath: string) {
  return filePath
    .replace(/\\/g, '/')
    .replace(/^(\.\.\/)+/, '')
    .replace(/^\.?\//, '')
    .replace(/\/+/g, '/');
}
