import type { BabelTypes } from '../../utils/babel';
import type { StyleFnMeta } from '../../../../style/style';
import type { CompilerOptions } from '../../../compiler/types';
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
  styleMetas: Map<string, StyleFnMeta>;
  bindings: EvalModuleBindings;
  imports: ImportMap;
  needsExtractImport: boolean;
  usedHelpers: Set<string>;
  importSourceMatcher: ImportSourceMatcher;
  resolveImport: ResolveImportFn;
  collector: CompilerCssCollector;
  hoistedDeclarations: BabelTypes.Statement[];
  runtimeTokenIndex: number;
  options: CompilerOptions;
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
    styleMetas: state.styleMetas,
  };
}
