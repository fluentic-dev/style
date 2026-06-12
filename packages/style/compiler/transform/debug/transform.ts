import type { CompilerInternal, TransformDebugArgs, TransformDebugResult } from '../../compiler';
import { babelTransform } from '../utils/babel';
import { createDebugPlugin } from './plugin';
import { getDebugSourceUrl } from './utils/source_url';

export function transformDebug(
  internal: CompilerInternal,
  args: TransformDebugArgs,
): TransformDebugResult | null {
  const { projectDir, options } = internal;

  const sourceUrl = getDebugSourceUrl(
    args.filePath,
    args.filePath,
    projectDir,
    options,
  );

  const plugin = createDebugPlugin({
    options,
    projectDir,
    sourceUrl,
    sourceContent: options.devSourcemap === 'sourceContent' ? args.code : null,
  });

  const result = babelTransform({
    code: args.code,
    filePath: args.filePath,
    sourcemap: args.sourcemap,
    plugins: [plugin],
    retainLines: true,
  });

  if (!result) return null;

  return {
    code: result.code,
    sourcemap: result.sourcemap,
  };
}
