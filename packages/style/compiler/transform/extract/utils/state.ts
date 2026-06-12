import type { CompilerCssCollector } from '../../../extract';
import type { ImportSourceMatcher } from '../../../utils/import_source';
import type { EvalModuleBindings, EvalScope, ImportMap, ResolveImportFn } from '../../evaluator';

export type ExtractPluginState = {
  fileId: string;
  filePath: string;
  styleFilePath: string;
  styleNames: Set<string>;
  bindings: EvalModuleBindings;
  imports: ImportMap;
  needsExtractImport: boolean;
  usedHelpers: Set<string>;
  importSourceMatcher: ImportSourceMatcher;
  resolveImport: ResolveImportFn;
  collector: CompilerCssCollector;
};

export function getEvalScope(state: ExtractPluginState): EvalScope {
  return {
    bindings: state.bindings,
    imports: state.imports,
    resolveImport: state.resolveImport,
    filePath: state.filePath,
    styleFilePath: state.styleFilePath,
    styleNames: state.styleNames,
  };
}
