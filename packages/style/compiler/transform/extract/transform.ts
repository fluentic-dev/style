import type { CompilerInternal, TransformExtractArgs, TransformExtractResult } from '../../compiler';
import type { CompilerCssCollector } from '../../extract';
import { type Tracer } from '../evaluator';
import { babelTransform } from '../utils/babel';
import { createExtractPlugin } from './plugin';

export type TransformExtractDeps = {
  collector: CompilerCssCollector;
  mode?: 'extract' | 'collect';
  styleFilePath?: string;
  tracer: Tracer;
};

export function transformExtract(
  internal: CompilerInternal,
  args: TransformExtractArgs,
  deps: TransformExtractDeps,
): TransformExtractResult | null {
  const { collector, tracer } = deps;

  const plugin = createExtractPlugin({
    options: internal.options,
    collector: collector,
    mode: deps.mode,
    projectDir: internal.projectDir,
    styleFilePath: deps.styleFilePath,
    tracer: tracer,
  });

  const result = babelTransform({
    code: args.code,
    filePath: args.filePath,
    sourcemap: args.sourcemap,
    plugins: [plugin],
    errorLabel: '[style] compiler error',
  });

  if (!result) return null;

  return {
    code: result.code,
    rules: collector.getItems(),
    sourcemap: result.sourcemap,
  };
}
