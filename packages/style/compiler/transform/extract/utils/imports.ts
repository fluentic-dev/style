import type { BabelTypes, NodePath } from '../../utils/babel';
import {
  FN_BIND_SCOPE,
  FN_COMBINE_SCOPE,
  FN_COMBINE_STYLE,
  FN_CREATE_THEME,
  FN_GET_CLASS_NAME,
  FN_GET_TOKEN,
  IMPORT_PATHS,
  STYLE_EXTRACT_RUNTIME_IMPORT_PATH,
  STYLE_IMPORT_PATH,
} from '../../../utils/constants';
import { getImportedName } from '../../syntax';
import type { ExtractPluginState } from './state';

const EXTRACT_RUNTIME_IMPORT_NAMES = new Set([
  FN_BIND_SCOPE,
  FN_COMBINE_SCOPE,
  FN_COMBINE_STYLE,
  FN_GET_CLASS_NAME,
  FN_GET_TOKEN,
]);

export function pruneUnusedStyleImports(
  path: NodePath<BabelTypes.Program>,
  state: ExtractPluginState,
) {
  const usedBindings = new Set<unknown>();

  path.traverse({
    Identifier(idPath: NodePath<BabelTypes.Identifier>) {
      if (!idPath.isReferencedIdentifier()) return;

      const binding = idPath.scope.getBinding(idPath.node.name);
      if (binding) {
        usedBindings.add(binding);
      }
    },
  });

  const body = path.get('body');
  let i = 0;

  while (i < body.length) {
    const stmt = body[i];

    if (!stmt.isImportDeclaration()) {
      i++;
      continue;
    }

    const importDecl = stmt.node;
    const sourceName = importDecl.source.value;
    if (typeof sourceName !== 'string') {
      i++;
      continue;
    }

    if (!importDecl.specifiers.length) {
      i++;
      continue;
    }

    const keptSpecifiers = importDecl.specifiers.filter((spec) => {
      if (spec.type === 'ImportSpecifier') {
        const imported = getImportedName(spec);

        if (
          !state.importSourceMatcher({ source: sourceName, name: imported }) &&
          !isCompilerHandledImport(sourceName, imported)
        ) return true;

        const binding = stmt.scope.getBinding(spec.local.name);
        if (!binding) return false;

        return usedBindings.has(binding);
      }

      if (spec.type === 'ImportDefaultSpecifier') {
        if (
          !state.importSourceMatcher({ source: sourceName, name: 'default' }) &&
          !isCompilerHandledImport(sourceName, 'default')
        ) return true;

        const binding = stmt.scope.getBinding(spec.local.name);
        if (!binding) return false;

        return usedBindings.has(binding);
      }

      if (spec.type === 'ImportNamespaceSpecifier') {
        return true;
      }

      return true;
    });

    if (!keptSpecifiers.length) {
      stmt.remove();
      i++;
      continue;
    }

    if (keptSpecifiers.length !== importDecl.specifiers.length) {
      importDecl.specifiers = keptSpecifiers;
    }

    if (
      sourceName === STYLE_IMPORT_PATH &&
      keptSpecifiers.every(isExtractRuntimeImportSpecifier)
    ) {
      importDecl.source.value = STYLE_EXTRACT_RUNTIME_IMPORT_PATH;
    }

    i++;
  }
}

function isExtractRuntimeImportSpecifier(spec: BabelTypes.ImportDeclaration['specifiers'][number]) {
  if (spec.type !== 'ImportSpecifier') return false;

  const imported = getImportedName(spec);

  return EXTRACT_RUNTIME_IMPORT_NAMES.has(imported);
}

function isCompilerHandledImport(
  source: string,
  name: string,
) {
  return IMPORT_PATHS.includes(source) && name === FN_CREATE_THEME;
}
