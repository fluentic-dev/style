import { constants } from 'node:fs';
import { access, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { type CompilerCssOptions, type CompilerOptions, createCompiler } from '../../packages/style/compiler';
import type { ImportSource } from '../../packages/style/compiler/utils/import_source';
import { LayerPlaceholder } from '../../packages/style/config';

const __dirname = dirname(fileURLToPath(import.meta.url));

const snapshotsDir = path.join(__dirname, 'data');
const requestedId = process.argv[2];

const cssOptions: CompilerCssOptions = {
  layers: ['reset', LayerPlaceholder, 'override'],
};

const generatedTsHeader = '/* eslint-disable */\n';

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

async function resolveSourcePath(snapshotDir: string) {
  const tsxPath = path.join(snapshotDir, 'source.tsx');
  const tsPath = path.join(snapshotDir, 'source.ts');

  try {
    await access(tsxPath, constants.F_OK);
    return tsxPath;
  } catch {
    await access(tsPath, constants.F_OK);
    return tsPath;
  }
}

function getCompiledExtension(sourcePath: string) {
  return sourcePath.endsWith('.tsx') ? '.tsx' : '.ts';
}

async function getPaths(itemId: string) {
  const snapshotDir = path.join(snapshotsDir, itemId);
  const sourcePath = await resolveSourcePath(snapshotDir);
  const compiledExtension = getCompiledExtension(sourcePath);

  return {
    sourcePath,
    compiledPath: path.join(snapshotDir, `compiled${compiledExtension}`),
    compiledDebugPath: path.join(snapshotDir, `compiled.debug${compiledExtension}`),
    legacyCompiledPath: path.join(snapshotDir, 'compiled.js'),
    legacyCompiledDebugPath: path.join(snapshotDir, 'compiled.debug.js'),
    cssPath: path.join(snapshotDir, 'extracted.css'),
    cssDebugPath: path.join(snapshotDir, 'extracted.debug.css'),
    snapshotDir,
  };
}

async function getSnapshotImportSources(snapshotDir: string): Promise<ImportSource[] | null> {
  const stylePath = path.join(snapshotDir, 'style.ts');
  try {
    await access(stylePath, constants.F_OK);
    const mod = await import(pathToFileURL(stylePath).href);
    if (Array.isArray(mod.snapshotImportSources)) {
      return mod.snapshotImportSources;
    }
    if (mod.style) {
      return [{ source: './style', name: 'style', styleFn: mod.style }];
    }
    return null;
  } catch {
    return null;
  }
}

async function runForId(itemId: string) {
  let paths: Awaited<ReturnType<typeof getPaths>>;
  try {
    paths = await getPaths(itemId);
  } catch {
    if (requestedId) {
      throw new Error(`Missing source.tsx for snapshot id: ${itemId}`);
    }
    return;
  }

  const {
    snapshotDir,
    sourcePath,
    compiledPath,
    compiledDebugPath,
    legacyCompiledPath,
    legacyCompiledDebugPath,
    cssPath,
    cssDebugPath,
  } = paths;
  const importSources = await getSnapshotImportSources(snapshotDir);

  let compilerOptions: CompilerOptions = {
    css: { ...cssOptions, layer: true, debugClassName: false, localClassName: false },
  };
  let debugCompilerOptions: CompilerOptions = {
    css: { ...cssOptions, layer: true, debugClassName: true, localClassName: true },
  };

  if (importSources) {
    compilerOptions = {
      css: { ...cssOptions, layer: true, debugClassName: false, localClassName: false },
      importSources,
    };
    debugCompilerOptions = {
      ...compilerOptions,
      css: { ...cssOptions, debugClassName: true, localClassName: true },
    };
  }

  const snapshotCompiler = createCompiler({
    projectDir: __dirname,
    cacheDir: path.join(snapshotDir, '.snapshot-cache'),
    runtimeMode: null,
  }, compilerOptions);
  const snapshotDebugCompiler = createCompiler({
    projectDir: __dirname,
    cacheDir: path.join(snapshotDir, '.snapshot-cache-debug'),
    runtimeMode: null,
  }, debugCompilerOptions);

  const source = await readFile(sourcePath, 'utf8');
  const result = snapshotCompiler.compileExtract({
    code: source,
    filePath: sourcePath,
    sourcemap: null,
  });
  const debugResult = snapshotDebugCompiler.compileExtract({
    code: source,
    filePath: sourcePath,
    sourcemap: null,
  });

  if (!result) {
    throw new Error(`Failed to compile: ${sourcePath}`);
  }
  if (!debugResult) {
    throw new Error(`Failed to compile debug css: ${sourcePath}`);
  }

  await mkdir(snapshotDir, { recursive: true });
  await writeFile(compiledPath, toSnapshotTs(result.code ?? ''), 'utf8');
  await writeFile(compiledDebugPath, toSnapshotTs(debugResult.code ?? ''), 'utf8');
  await writeFile(cssPath, snapshotCompiler.getExtractedCss(), 'utf8');
  await writeFile(cssDebugPath, snapshotDebugCompiler.getExtractedCss(), 'utf8');
  await rm(legacyCompiledPath, { force: true });
  await rm(legacyCompiledDebugPath, { force: true });

  console.log(`Generated snapshot ${itemId}${importSources ? ' (with custom import sources)' : ''}`);
  console.log(`- source:              ${sourcePath}`);
  console.log(`- compiled:            ${compiledPath}`);
  console.log(`- compiled.debug:      ${compiledDebugPath}`);
  console.log(`- extracted.css:       ${cssPath}`);
  console.log(`- extracted.debug.css: ${cssDebugPath}`);
}

function toSnapshotTs(code: string) {
  return `${generatedTsHeader}${code}`;
}

const ids = await resolveIds();
for (const itemId of ids) {
  await runForId(itemId);
}
