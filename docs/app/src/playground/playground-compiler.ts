import * as Babel from '@babel/standalone';
import { type CompilerOptions } from '../../../../packages/style/compiler/compiler/types';
import { createCssCollector } from '../../../../packages/style/compiler/extract/collector';
import { extractCss } from '../../../../packages/style/compiler/extract/extract';
import type { CssExtractRule } from '../../../../packages/style/compiler/extract/types';
import { evaluateNode } from '../../../../packages/style/compiler/transform/evaluator/evaluator';
import { type EvalModuleBindings, type ImportMap } from '../../../../packages/style/compiler/transform/evaluator/types';
import { createExtractPlugin } from '../../../../packages/style/compiler/transform/extract/plugin';
import { resetStyleThemeIdCounter } from '../../../../packages/style/style/theme';
import { resetStyleTokenIdCounter } from '../../../../packages/style/style/token';

export type PlaygroundCompilerOptions = CompilerOptions & {
  layer?: boolean;
};

export type PlaygroundFile = {
  name: string;
  code: string;
};

export type CompileResult = {
  js: string;
  css: string;
  traces: CompileTrace[];
};

export type CompileTrace = {
  key: string;
  css: string;
  filePath: string;
  line: number;
  column: number;
  trace?: number;
};

type ModuleInfo = {
  bindings: EvalModuleBindings;
  imports: ImportMap;
};

const STYLE_SOURCES = new Set(['@fluentic/style', '@fluentic/style/server']);

export function compilePlayground(files: PlaygroundFile[], options: PlaygroundCompilerOptions): CompileResult {
  resetStyleTokenIdCounter();
  resetStyleThemeIdCounter();

  const fileMap = new Map(files.map((file) => [normalizeFileName(file.name), file.code]));
  const moduleCache = new Map<string, ModuleInfo | null>();
  const collector = createCssCollector();

  const resolveImport = (source: string, from: string): EvalModuleBindings | null => {
    if (!source.startsWith('.')) return null;

    const fileName = resolveVirtualFile(source, from, fileMap);
    if (!fileName) return null;

    const moduleInfo = extractModule(fileName);
    return moduleInfo?.bindings ?? null;
  };

  const extractModule = (fileName: string): ModuleInfo | null => {
    const normalized = normalizeFileName(fileName);
    if (moduleCache.has(normalized)) return moduleCache.get(normalized) ?? null;

    const code = fileMap.get(normalized);
    if (code === undefined) return null;

    const bindings = new Map() as EvalModuleBindings;
    const imports = new Map() as ImportMap;
    const styleNames = new Set<string>();
    const rawBindings: Array<{ name: string; node: Babel.types.Node; }> = [];

    moduleCache.set(normalized, { bindings, imports });

    Babel.transform(code, {
      filename: normalized,
      parserOpts: {
        plugins: ['typescript', 'jsx'],
        strictMode: false,
      },
      plugins: [
        function extractVirtualModule() {
          return {
            visitor: {
              ImportDeclaration(path: Babel.NodePath<Babel.types.ImportDeclaration>) {
                const source = path.node.source.value;
                for (const spec of path.node.specifiers) {
                  if (spec.type === 'ImportSpecifier') {
                    const imported = spec.imported.type === 'Identifier' ? spec.imported.name : spec.imported.value;
                    imports.set(spec.local.name, { source, name: imported });
                    if (STYLE_SOURCES.has(source) && imported === 'style') {
                      styleNames.add(spec.local.name);
                    }
                  } else if (spec.type === 'ImportDefaultSpecifier') {
                    imports.set(spec.local.name, { source, name: 'default' });
                  }
                }
              },
              VariableDeclarator(path: Babel.NodePath<Babel.types.VariableDeclarator>) {
                if (path.node.id.type !== 'Identifier' || !path.node.init) return;
                rawBindings.push({ name: path.node.id.name, node: path.node.init });
              },
              ExportNamedDeclaration(path: Babel.NodePath<Babel.types.ExportNamedDeclaration>) {
                const declaration = path.node.declaration;
                if (declaration?.type !== 'VariableDeclaration') return;
                for (const decl of declaration.declarations) {
                  if (decl.id.type !== 'Identifier' || !decl.init) continue;
                  rawBindings.push({ name: decl.id.name, node: decl.init });
                }
              },
            },
          };
        },
      ],
    });

    const scope = {
      bindings,
      imports,
      styleNames,
      filePath: normalized,
      sourcemapTrace: options.dev?.sourcemapMode ?? 'style',
      resolveImport,
    };

    for (const binding of rawBindings) {
      const result = evaluateNode(binding.node, scope);
      bindings.set(binding.name, result);
    }

    moduleCache.set(normalized, { bindings, imports });
    return { bindings, imports };
  };

  const plugin = createExtractPlugin({
    options,
    collector,
    projectDir: '/',
    runtimeMode: null,
    tracer: {
      resolveImport(_babel: unknown, source: string, fromFile: string) {
        return resolveImport(source, fromFile);
      },
    },
  });
  const transformed = files.map((file) => {
    const id = normalizeFileName(file.name);
    const result = Babel.transform(file.code, {
      filename: id,
      parserOpts: {
        plugins: ['typescript', 'jsx'],
        strictMode: false,
      },
      plugins: [plugin],
      sourceMaps: false,
    });

    return `// ${file.name}\n${result.code ?? ''}`;
  });

  const items = collector.getItems();

  return {
    js: transformed.join('\n\n'),
    css: extractCss(items, {
      ...options.css,
      layer: options.layer,
    }),
    traces: getCompileTraces(items),
  };
}

function getCompileTraces(items: CssExtractRule[]): CompileTrace[] {
  const traceByCss = new Map<string, CompileTrace>();
  const seen = new Set<string>();

  for (const item of items) {
    if (!item.trace) continue;

    const key = [
      item.className,
      item.trace.filePath,
      item.trace.line,
      item.trace.column,
      item.trace.trace ?? 'direct',
      item.css,
    ].join('|');

    if (seen.has(key)) continue;
    seen.add(key);

    const trace = {
      key: item.className,
      css: item.css,
      filePath: item.trace.filePath,
      line: item.trace.line,
      column: item.trace.column,
      trace: item.trace.trace,
    };

    traceByCss.set(getTraceCssIdentity(item.css), trace);
  }

  return [...traceByCss.values()];
}

function getTraceCssIdentity(css: string) {
  return css.replace(/^\.[^{:]+/, '.');
}

function normalizeFileName(fileName: string) {
  return fileName.replace(/^\.?\//, '').replace(/\\/g, '/');
}

function resolveVirtualFile(source: string, from: string, files: Map<string, string>) {
  const fromParts = normalizeFileName(from).split('/');
  fromParts.pop();

  const parts = [...fromParts, ...source.split('/')];
  const normalizedParts: string[] = [];

  for (const part of parts) {
    if (!part || part === '.') continue;
    if (part === '..') {
      normalizedParts.pop();
      continue;
    }
    normalizedParts.push(part);
  }

  const base = normalizedParts.join('/');
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    `${base}.jsx`,
    `${base}/index.ts`,
    `${base}/index.tsx`,
  ];

  return candidates.find((candidate) => files.has(candidate)) ?? null;
}
