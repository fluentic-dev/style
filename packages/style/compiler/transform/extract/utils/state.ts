import type { types } from '@babel/core';
import type { CompilerCssCollector } from '../../../extract';
import type { ImportSourceMatcher } from '../../../utils/import_source';
import type { EvalScope } from '../../evaluator/evaluator';
import type { EvalModuleBindings, ImportMap, ResolveImportFn } from '../../evaluator/types';

export type ExtractPluginState = {
  fileId: string;
  filePath: string;
  styleFilePath: string;
  sourcemapTrace: 'style' | 'value';
  styleNames: Set<string>;
  bindings: EvalModuleBindings;
  imports: ImportMap;
  needsExtractImport: boolean;
  usedHelpers: Set<string>;
  importSourceMatcher: ImportSourceMatcher;
  resolveImport: ResolveImportFn;
  collector: CompilerCssCollector;
  hoistedDeclarations: types.Statement[];
  runtimeTokenIndex: number;
};

export function getEvalScope(state: ExtractPluginState): EvalScope {
  return {
    bindings: state.bindings,
    imports: state.imports,
    resolveImport: state.resolveImport,
    filePath: state.filePath,
    styleFilePath: state.styleFilePath,
    sourcemapTrace: state.sourcemapTrace,
    styleNames: state.styleNames,
  };
}
