import path from 'node:path';
import { createCompiler } from '../../compiler';
import type { Compiler, CompilerOptions } from '../../compiler';
import { PLUGIN_CACHE_DIR } from './constants';
import { createTransformFilter, normalizeModuleId, type TransformFilterOptions } from './filter';
import type { BundlerSourceMap } from './sourcemap';

export type PluginOptions = CompilerOptions & TransformFilterOptions & {
  cacheDir?: string;
};

export type PluginCompiler = ReturnType<typeof createPluginCompiler>;

export type PluginCompilerArgs = {
  dev: boolean;
  projectDir: string;
  cacheDir?: string;
  options?: PluginOptions;
};

export function getPluginCacheDir(projectDir: string, cacheDir?: string) {
  return cacheDir ?? path.join(projectDir, PLUGIN_CACHE_DIR);
}

export function createPluginCompiler(args: PluginCompilerArgs) {
  const dev = args.dev;
  const options = args.options ?? {};

  const projectDir = args.projectDir;
  const cacheDir = getPluginCacheDir(projectDir, args.cacheDir);

  const compiler = createCompiler(
    { projectDir, cacheDir },
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
