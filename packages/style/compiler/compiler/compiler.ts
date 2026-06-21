import { createCssCollector, extractCss } from '../extract';
import { createTracer, transformDebug, transformExtract } from '../transform';
import { getDebugSourceUrl } from '../transform/debug/utils/source_url';
import { rewriteImportSources } from '../transform/utils/import';
import {
  STYLE_CSS_IMPORT_PATH,
  STYLE_DEV_RSC_IMPORT_PATH,
  STYLE_IMPORT_PATH,
} from '../utils/constants';
import { clearResolverCache } from '../utils/file_resolver';
import {
  getStyleRuntimeCssImportPath,
  getStyleRuntimeDevRscImportPath,
  getStyleRuntimeImportPath,
} from '../utils/imports';
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

export enum CompilerRuntimeMode {
  Dev = 'dev',
  Prod = 'prod',
  RscDev = 'rsc-dev',
  RscProd = 'rsc-prod',
}

export type CompilerArgs = {
  projectDir: string;
  cacheDir: string;
  runtimeMode: CompilerRuntimeMode | null;
};

export type Compiler = ReturnType<typeof createCompiler>;

export type CompilerInternal = ReturnType<typeof createCompilerInternal>;

export function createCompiler(args: CompilerArgs, options: CompilerOptions) {
  const internal = createCompilerInternal(args, options);

  const tracer = createTracer(internal);
  const collector = createCssCollector();

  const compileDebug = (args: TransformDebugArgs): TransformDebugResult | null => {
    return rewriteTransformResult(
      transformDebug(internal, args, { tracer }),
      internal.runtimeMode,
    );
  };

  const compileDebugRSC = (args: TransformDebugArgs): TransformDebugRscResult | null => {
    const debugResult = rewriteTransformResult(
      transformDebug(internal, args, { tracer }),
      internal.runtimeMode,
    );
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
        layer: options.css?.layer,
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

    return rewriteTransformResult({
      ...result,
      rules: collector.getItems().slice(startIndex),
    }, internal.runtimeMode);
  };

  const getExtractedCss = () => {
    return extractCss(collector.getItems(), {
      ...options.css,
      layer: options.css?.layer,
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
  const { projectDir, cacheDir, runtimeMode } = args;

  const cache = createCompilerCache({ cacheDir });

  return {
    projectDir,
    cacheDir,
    runtimeMode,
    cache,
    options,
  };
}

function rewriteTransformResult<Result extends { code: string; }>(
  result: Result | null,
  runtimeMode: CompilerRuntimeMode | null,
) {
  if (!result || !runtimeMode) return result;

  return {
    ...result,
    code: rewriteCompilerRuntimeImports(result.code, runtimeMode),
  };
}

function rewriteCompilerRuntimeImports(code: string, runtimeMode: CompilerRuntimeMode) {
  return rewriteImportSources(
    code,
    (source) => getCompilerRuntimeImportSource(source, runtimeMode),
  );
}

function getCompilerRuntimeImportSource(source: string, runtimeMode: CompilerRuntimeMode) {
  if (source === STYLE_IMPORT_PATH) return getStyleRuntimeImportPath(runtimeMode);
  if (source === STYLE_CSS_IMPORT_PATH) return getStyleRuntimeCssImportPath(runtimeMode);
  if (runtimeMode === CompilerRuntimeMode.RscDev && source === STYLE_DEV_RSC_IMPORT_PATH) {
    return getStyleRuntimeDevRscImportPath(runtimeMode);
  }

  return null;
}
