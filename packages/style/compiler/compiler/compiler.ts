import { createCssCollector, extractCss } from '../extract';
import { createTracer, transformDebug, transformExtract } from '../transform';
import { getDebugSourceUrl } from '../transform/debug/utils/source_url';
import { rewriteImportSources } from '../transform/utils/import';
import {
  STYLE_CSS_IMPORT_PATH,
  STYLE_DEV_RSC_IMPORT_PATH,
  STYLE_EXTRACT_RUNTIME_IMPORT_PATH,
  STYLE_IMPORT_PATH,
} from '../utils/constants';
import { clearResolverCache } from '../utils/file_resolver';
import {
  getStyleExtractRuntimeImportPath,
  getStyleRuntimeAdapterImportPath,
  getStyleRuntimeCssImportPath,
  getStyleRuntimeDevRscImportPath,
  getStyleRuntimeImportPath,
} from '../utils/imports';
import { createCompilerCache } from './cache';
import { CompilerRuntimeMode } from './constants';
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
      args.code,
    );
  };

  const compileDebugRSC = (args: TransformDebugArgs): TransformDebugRscResult | null => {
    const debugResult = rewriteTransformResult(
      transformDebug(internal, args, { tracer }),
      internal.runtimeMode,
      args.code,
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
    }, internal.runtimeMode, args.code);
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
  sourceCode: string,
) {
  if (!result || !runtimeMode) return result;

  return {
    ...result,
    code: rewriteCompilerRuntimeImports(result.code, runtimeMode, sourceCode),
  };
}

function rewriteCompilerRuntimeImports(
  code: string,
  runtimeMode: CompilerRuntimeMode,
  sourceCode: string,
) {
  const importRuntimeMode = getImportRuntimeMode(runtimeMode, sourceCode);

  return rewriteImportSources(
    code,
    (source) => getCompilerRuntimeImportSource(source, runtimeMode, importRuntimeMode),
  );
}

function getImportRuntimeMode(runtimeMode: CompilerRuntimeMode, sourceCode: string) {
  if (runtimeMode === CompilerRuntimeMode.RscDev && hasUseClientDirective(sourceCode)) {
    return CompilerRuntimeMode.Dev;
  }

  return runtimeMode;
}

function getCompilerRuntimeImportSource(
  source: string,
  runtimeMode: CompilerRuntimeMode,
  importRuntimeMode: CompilerRuntimeMode,
) {
  if (source === STYLE_IMPORT_PATH) return getStyleRuntimeImportPath(importRuntimeMode);
  const adapterImportPath = getStyleRuntimeAdapterImportPath(source, importRuntimeMode);
  if (adapterImportPath) return adapterImportPath;
  if (source === STYLE_CSS_IMPORT_PATH) return getStyleRuntimeCssImportPath(importRuntimeMode);
  if (source === STYLE_EXTRACT_RUNTIME_IMPORT_PATH) return getStyleExtractRuntimeImportPath(runtimeMode);
  if (runtimeMode === CompilerRuntimeMode.RscDev && source === STYLE_DEV_RSC_IMPORT_PATH) {
    return getStyleRuntimeDevRscImportPath(runtimeMode);
  }

  return null;
}

function hasUseClientDirective(code: string) {
  let index = 0;

  while (index < code.length) {
    index = skipWhitespaceAndComments(code, index);

    const quote = code[index];
    if (quote !== '"' && quote !== "'") return false;

    const end = code.indexOf(quote, index + 1);
    if (end < 0) return false;

    const directive = code.slice(index + 1, end);
    index = skipWhitespaceAndComments(code, end + 1);

    if (code[index] === ';') {
      index += 1;
    } else if (code[index] && code[index] !== '\n' && code[index] !== '\r') {
      return false;
    }

    if (directive === 'use client') return true;
  }

  return false;
}

function skipWhitespaceAndComments(code: string, index: number) {
  let next = index;

  while (next < code.length) {
    const char = code[next];

    if (char === ' ' || char === '\t' || char === '\n' || char === '\r') {
      next += 1;
      continue;
    }

    if (char === '/' && code[next + 1] === '/') {
      const lineEnd = code.indexOf('\n', next + 2);
      next = lineEnd < 0 ? code.length : lineEnd + 1;
      continue;
    }

    if (char === '/' && code[next + 1] === '*') {
      const commentEnd = code.indexOf('*/', next + 2);
      next = commentEnd < 0 ? code.length : commentEnd + 2;
      continue;
    }

    break;
  }

  return next;
}
