import { readFileSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const paths = {};
for (const [key, entry] of Object.entries(pkg.exports)) {
  if (!entry.types) continue;
  const source = entry.types.replace('./dist/types/', './').replace(/\.d\.ts$/, '.ts');
  paths[key === '.' ? pkg.name : pkg.name + key.slice(1)] = [source];
}
const config = ts.readConfigFile(resolve(root, 'tsconfig.json'), ts.sys.readFile);
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
const options = {
  ...parsed.options,
  declaration: true,
  declarationMap: false,
  emitDeclarationOnly: true,
  noEmit: false,
  noEmitOnError: true,
  rootDir: root,
  outDir: resolve(root, 'dist/types'),
  baseUrl: root,
  paths,
};
// Explicit .js paths also make declarations consumable with Node16/NodeNext resolution.
const extensions = (context) => (sourceFile) => {
  const visit = (node, parent, grandparent) => {
    if (ts.isStringLiteral(node) && node.text.startsWith('.')) {
      if (
        parent && (ts.isImportDeclaration(parent) || ts.isExportDeclaration(parent) ||
          (ts.isLiteralTypeNode(parent) && grandparent && ts.isImportTypeNode(grandparent)))
      ) {
        const resolved = ts.resolveModuleName(node.text, sourceFile.fileName, options, ts.sys).resolvedModule;
        if (resolved && !resolved.isExternalLibraryImport) {
          let specifier = node.text;
          if (/\/index\.(?:d\.)?tsx?$/.test(resolved.resolvedFileName) && !specifier.endsWith('/index')) {
            specifier += '/index';
          }
          specifier = specifier.replace(/\.tsx?$/, '').replace(/\.js$/, '') + '.js';
          return context.factory.createStringLiteral(specifier);
        }
      }
    }
    return ts.visitEachChild(node, (child) => visit(child, node, parent), context);
  };
  return ts.visitNode(sourceFile, visit);
};
function emitDeclarations(program) {
  const diagnostics = ts.getPreEmitDiagnostics(program);
  if (diagnostics.length) {
    console.error(ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCurrentDirectory: () => root,
      getCanonicalFileName: (name) => name,
      getNewLine: () => '\n',
    }));
    return false;
  }
  rmSync(options.outDir, { recursive: true, force: true });
  const result = program.emit(undefined, undefined, undefined, true, { afterDeclarations: [extensions] });
  if (result.emitSkipped || result.diagnostics.length) throw new Error('Declaration emit failed');
  console.log('Generated declarations for all public type exports.');
  return true;
}
const roots = Object.values(paths).flat().map((p) => resolve(root, p));
if (process.argv.includes('--watch')) {
  const host = ts.createWatchCompilerHost(roots, options, ts.sys);
  host.afterProgramCreate = (builder) => emitDeclarations(builder.getProgram());
  ts.createWatchProgram(host);
} else if (!emitDeclarations(ts.createProgram(roots, options))) {
  process.exit(1);
}
