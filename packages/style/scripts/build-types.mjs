import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const paths = {};
for (const [key, entry] of Object.entries(pkg.exports)) {
  if (!entry.types) continue;
  const source = entry.types.replace('./dist/types/', './').replace(/\.d\.ts$/, '.ts');
  paths[key === '.' ? pkg.name : pkg.name + key.slice(1)] = [resolve(root, source)];
}
const config = ts.readConfigFile(resolve(root, 'tsconfig.json'), ts.sys.readFile);
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
const options = { ...parsed.options, paths };
const work = resolve(root, '.temp/types');
const staging = resolve(work, 'emit');
const output = resolve(root, 'dist/types');
const configPath = resolve(work, 'tsconfig.json');
const compiler = resolve(dirname(fileURLToPath(import.meta.resolve('typescript-native/package.json'))), 'bin/tsc');
mkdirSync(work, { recursive: true });
writeFileSync(
  configPath,
  JSON.stringify(
    {
      extends: resolve(root, 'tsconfig.json'),
      compilerOptions: {
        declaration: true,
        declarationMap: false,
        emitDeclarationOnly: true,
        noEmit: false,
        noEmitOnError: true,
        incremental: false,
        rootDir: root,
        outDir: staging,
        paths,
      },
      files: Object.values(paths).flat(),
      include: [],
      exclude: [],
    },
    null,
    2,
  ),
);

// Native tsc checks and emits. The compatibility API only parses and rewrites
// relative specifiers; it does not create a program or type-check declarations.
function finalize() {
  rmSync(output, { recursive: true, force: true });
  const printer = ts.createPrinter();
  function visitDirectory(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = resolve(dir, entry.name);
      if (entry.isDirectory()) {
        visitDirectory(path);
        continue;
      }
      if (!entry.name.endsWith('.d.ts')) continue;
      const name = relative(staging, path);
      const original = resolve(root, name.replace(/\.d\.ts$/, '.ts'));
      const source = ts.createSourceFile(original, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true);
      const transformed = ts.transform(source, [(context) => (sourceFile) => {
        const visit = (node, parent, grandparent) => {
          if (
            ts.isStringLiteral(node) && node.text.startsWith('.') && parent &&
            (ts.isImportDeclaration(parent) || ts.isExportDeclaration(parent) ||
              (ts.isLiteralTypeNode(parent) && grandparent && ts.isImportTypeNode(grandparent)))
          ) {
            const resolved = ts.resolveModuleName(node.text, original, options, ts.sys).resolvedModule;
            if (resolved && !resolved.isExternalLibraryImport) {
              let specifier = node.text;
              if (/\/index\.(?:d\.)?tsx?$/.test(resolved.resolvedFileName) && !specifier.endsWith('/index')) {
                specifier += '/index';
              }
              specifier = specifier.replace(/\.tsx?$/, '').replace(/\.js$/, '') + '.js';
              return context.factory.createStringLiteral(specifier);
            }
          }
          return ts.visitEachChild(node, (child) => visit(child, node, parent), context);
        };
        return ts.visitNode(sourceFile, visit);
      }]);
      const target = resolve(output, name);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, printer.printFile(transformed.transformed[0]));
      transformed.dispose();
    }
  }
  visitDirectory(staging);
  console.log('Generated declarations for all public type exports with native TypeScript.');
}

rmSync(staging, { recursive: true, force: true });
const args = [compiler, '-p', configPath, '--pretty', 'false'];
if (process.argv.includes('--watch')) {
  const child = spawn(process.execPath, [...args, '--watch', '--preserveWatchOutput'], {
    stdio: ['inherit', 'pipe', 'inherit'],
  });
  let pending = '';
  child.stdout.on('data', (chunk) => {
    process.stdout.write(chunk);
    pending += chunk.toString();
    const lines = pending.split('\n');
    pending = lines.pop();
    for (const line of lines) {
      if (/Found 0 errors/.test(line)) finalize();
    }
  });
  child.on('error', (error) => {
    console.error(error);
    process.exitCode = 1;
  });
  child.on('exit', (code) => {
    process.exitCode = code ?? 1;
  });
  process.on('SIGINT', () => child.kill('SIGINT'));
  process.on('SIGTERM', () => child.kill('SIGTERM'));
} else {
  const result = spawnSync(process.execPath, args, { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
  finalize();
}
