import path from 'node:path';
import { createCompiler } from '../../compiler';
import type { Compiler, CompilerCssOptions, CompilerOptions, CompilerRuntimeMode } from '../../compiler';
import { PLUGIN_CACHE_DIR, PLUGIN_NAME } from './constants';
import { createTransformFilter, normalizeModuleId, type TransformFilterOptions } from './filter';
import type { BundlerSourceMap } from './sourcemap';

export type PluginCssOptions = CompilerCssOptions;

export type PluginOptions = CompilerOptions & TransformFilterOptions & {
  cacheDir?: string;
};

export type PluginCompiler = ReturnType<typeof createPluginCompiler>;

export type PluginCompilerArgs = {
  dev: boolean;
  projectDir: string;
  cacheDir: string;
  options: PluginOptions;
  runtimeMode: CompilerRuntimeMode | null;
};

let nextCompilerId = 0;

export function createCompilerId(name?: string) {
  return [PLUGIN_NAME, name, String(nextCompilerId++)].filter(Boolean).join('|');
}

export function getPluginCacheDir(projectDir: string, cacheDir?: string) {
  return cacheDir ?? path.join(projectDir, PLUGIN_CACHE_DIR);
}

export function createPluginCompiler(args: PluginCompilerArgs) {
  const dev = args.dev;
  const options = args.options;

  const projectDir = args.projectDir;
  const cacheDir = args.cacheDir;

  const compiler = createCompiler(
    {
      projectDir,
      cacheDir,
      runtimeMode: args.runtimeMode,
    },
    options,
  );

  const filter = createTransformFilter(options);

  const transform = (
    code: string,
    id: string,
    sourcemap: BundlerSourceMap | null = null,
  ) => {
    const filePath = normalizeModuleId(id);

    if (!filter(filePath)) return null;

    const result = dev
      ? compiler.compileDebug({ code, filePath, sourcemap })
      : compiler.compileExtract({ code, filePath, sourcemap });

    if (!result) return null;

    return {
      code: result.code,
      map: result.sourcemap,
      rules: 'rules' in result ? result.rules : [],
    };
  };

  return {
    projectDir,
    cacheDir,
    dev,
    //
    compiler,
    filter,
    transform,
  };
}

export function invalidateFiles(
  compiler: Compiler,
  filePaths: Iterable<string>,
) {
  for (const filePath of filePaths) {
    compiler.invalidateFile({ filePath });
  }
}
