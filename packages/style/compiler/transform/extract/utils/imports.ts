import type { NodePath, types as BabelTypes } from '@babel/core';
import { FN_CREATE_THEME, IMPORT_PATHS } from '../../../utils/constants';
import { getImportedName } from '../../syntax';
import type { ExtractPluginState } from './state';

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

    i++;
  }
}

function isCompilerHandledImport(
  source: string,
  name: string,
) {
  return IMPORT_PATHS.includes(source) && name === FN_CREATE_THEME;
}
