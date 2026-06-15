import { createCssCollector, extractCss } from '../extract';
import { createTracer, transformDebug, transformExtract } from '../transform';
import { getDebugSourceUrl } from '../transform/debug/utils/source_url';
import { clearResolverCache } from '../utils/file_resolver';
import { createCompilerCache } from './cache';
import type {
  CompilerInvalidateFileInfo,
  CompilerOptions,
  TransformDebugArgs,
  TransformDebugResult,
  TransformDebugRscResult,
  TransformExtractArgs,
  TransformExtractResult,
} from './types';

export type CompilerArgs = {
  projectDir: string;
  cacheDir: string;
};

export type Compiler = ReturnType<typeof createCompiler>;

export type CompilerInternal = ReturnType<typeof createCompilerInternal>;

export function createCompiler(args: CompilerArgs, options: CompilerOptions) {
  const internal = createCompilerInternal(args, options);

  const tracer = createTracer(internal);
  const collector = createCssCollector();

  const compileDebug = (args: TransformDebugArgs): TransformDebugResult | null => {
    return transformDebug(internal, args);
  };

  const compileDebugRSC = (args: TransformDebugArgs): TransformDebugRscResult | null => {
    const debugResult = transformDebug(internal, args);
    if (!debugResult) return null;

    const rscCollector = createCssCollector();

    const styleFilePath = getDebugSourceUrl(
      args.filePath,
      args.filePath,
      internal.projectDir,
      options,
    );

    transformExtract(internal, args, {
      collector: rscCollector,
      mode: 'collect',
      styleFilePath,
      tracer,
    });

    const rules = rscCollector.getItems();

    return {
      ...debugResult,
      css: extractCss(rules, {
        ...options.css,
        layer: options.layer,
      }),
      rules,
    };
  };

  const compileExtract = (args: TransformExtractArgs): TransformExtractResult | null => {
    const startIndex = collector.getItems().length;

    const result = transformExtract(internal, args, {
      collector,
      tracer,
    });

    if (!result) return null;

    return {
      ...result,
      rules: collector.getItems().slice(startIndex),
    };
  };

  const getExtractedCss = () => {
    return extractCss(collector.getItems(), {
      ...options.css,
      layer: options.layer,
    });
  };

  const invalidateFile = (_info: CompilerInvalidateFileInfo) => {
    internal.cache.clear();
    clearResolverCache();
  };

  return {
    compileDebug,
    compileDebugRSC,
    compileExtract,
    getExtractedCss,
    invalidateFile,
  };
}

function createCompilerInternal(args: CompilerArgs, options: CompilerOptions) {
  const { projectDir, cacheDir } = args;

  const cache = createCompilerCache({ cacheDir });

  return {
    projectDir,
    cacheDir,
    cache,
    options,
  };
}
