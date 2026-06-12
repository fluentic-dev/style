import type { StyleFn } from '@fluentic/style';
import { type CompilerCssOptions, Constants, createCompiler } from '@fluentic/style/compiler';
import { constants } from 'node:fs';
import { access, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const snapshotsDir = path.join(__dirname, 'data');
const requestedId = process.argv[2];

const cssOptions: CompilerCssOptions = {
  layers: ['reset', Constants.LayerPlaceholder, 'override'],
  layer: true,
};

const compiler = createCompiler({
  css: { ...cssOptions },
});

const debugCompiler = createCompiler({
  css: { ...cssOptions, debugClassName: true },
});

async function resolveIds() {
  if (requestedId) {
    return [requestedId];
  }

  const entries = await readdir(snapshotsDir, { withFileTypes: true });
  const ids: string[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    ids.push(entry.name);
  }

  return ids.sort((a, b) => a.localeCompare(b));
}

function getPaths(itemId: string) {
  const snapshotDir = path.join(snapshotsDir, itemId);
  return {
    sourcePath: path.join(snapshotDir, 'source.tsx'),
    compiledPath: path.join(snapshotDir, 'compiled.js'),
    compiledDebugPath: path.join(snapshotDir, 'compiled.debug.js'),
    cssPath: path.join(snapshotDir, 'extracted.css'),
    cssDebugPath: path.join(snapshotDir, 'extracted.debug.css'),
    snapshotDir,
  };
}

async function getSnapshotStyleFn(snapshotDir: string): Promise<StyleFn | null> {
  const stylePath = path.join(snapshotDir, 'style.ts');
  try {
    await access(stylePath, constants.F_OK);
    const mod = await import(pathToFileURL(stylePath).href);
    return mod.style ?? null;
  } catch {
    return null;
  }
}

async function runForId(itemId: string) {
  const { snapshotDir, sourcePath, compiledPath, compiledDebugPath, cssPath, cssDebugPath } = getPaths(itemId);
  try {
    await access(sourcePath, constants.F_OK);
  } catch {
    if (requestedId) {
      throw new Error(`Missing source.tsx for snapshot id: ${itemId}`);
    }
    return;
  }

  const styleFn = await getSnapshotStyleFn(snapshotDir);

  let snapshotCompiler = compiler;
  let snapshotDebugCompiler = debugCompiler;

  if (styleFn) {
    const opts = {
      css: { ...cssOptions },
      styleFn,
      importSources: [{ source: './style', name: 'style' }],
    };
    snapshotCompiler = createCompiler(opts);
    snapshotDebugCompiler = createCompiler({ ...opts, css: { ...cssOptions, debugClassName: true } });
  }

  const source = await readFile(sourcePath, 'utf8');
  const result = snapshotCompiler.transform(source, sourcePath);
  const debugResult = snapshotDebugCompiler.transform(source, sourcePath);

  if (!result) {
    throw new Error(`Failed to compile: ${sourcePath}`);
  }
  if (!debugResult) {
    throw new Error(`Failed to compile debug css: ${sourcePath}`);
  }

  await mkdir(snapshotDir, { recursive: true });
  await writeFile(compiledPath, result.code ?? '', 'utf8');
  await writeFile(compiledDebugPath, debugResult.code ?? '', 'utf8');
  await writeFile(cssPath, result.css?.join('\n') ?? '', 'utf8');
  await writeFile(cssDebugPath, debugResult.css?.join('\n') ?? '', 'utf8');

  console.log(`Generated snapshot ${itemId}${styleFn ? ' (with transform)' : ''}`);
  console.log(`- source.tsx:          ${sourcePath}`);
  console.log(`- compiled.js:         ${compiledPath}`);
  console.log(`- compiled.debug.js:   ${compiledDebugPath}`);
  console.log(`- extracted.css:       ${cssPath}`);
  console.log(`- extracted.debug.css: ${cssDebugPath}`);
}

const ids = await resolveIds();
for (const itemId of ids) {
  await runForId(itemId);
}
