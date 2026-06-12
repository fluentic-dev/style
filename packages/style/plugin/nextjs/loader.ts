import fs from 'node:fs';
import path from 'node:path';
import type { BuildMeta } from '../../config';
import {
  createFileCssCache,
  createFileCssConfigHash,
  createFileCssContentHash,
  createPluginCompiler,
  type FileCssCache,
  getExtractedCssMarker,
} from '../utils';
import { injectModuleImport } from '../utils/injection';
import { createWebpackStyleLoader, type WebpackStyleLoaderOptions } from '../utils/webpack/loader';
import { CLIENT_ENTRY_IMPORT_PATH, CSS_ENTRY_IMPORT_PATH, SERVER_ENTRY_IMPORT_PATH } from './constants';
import { injectDevCssLink } from './html';
import {
  createNextBuildMeta,
  getNextCacheDir,
  isAppLayoutFile,
  type NextLoaderState,
  nextRegistry,
  PRECOLLECT_NAMESPACE,
  resolveNextCompilerOptions,
} from './utils';

type NextTurbopackLoaderOptions = WebpackStyleLoaderOptions & {
  buildMeta?: BuildMeta;
  cacheDir?: string;
  cssEntryImportPath?: string;
  configHash?: string;
  dev?: boolean;
  devCssHref?: string | null;
  isServer?: boolean;
  projectDir?: string;
};

const loader = createWebpackStyleLoader<NextLoaderState>({
  missingCompilerMessage: 'Next.js compiler is not registered.',
  getEntry(compilerId, options) {
    return nextRegistry.getEntry(compilerId) ??
      getTurbopackEntry(options as NextTurbopackLoaderOptions);
  },
  shouldTransform({ entry, filePath }) {
    return entry.filter(filePath);
  },
  transform({ code, entry, filePath, inputMap }) {
    if (entry.dev) {
      const result = entry.compiler.compileDebugRSC({
        code,
        filePath,
        sourcemap: inputMap ?? null,
      });

      if (!result) return null;

      if (entry.cssCache) {
        entry.cssCache.setFileCss({
          filePath,
          contentHash: createFileCssContentHash(code),
          configHash: entry.configHash,
          rules: result.rules,
        });
      }

      return {
        code: injectNextRuntimeCode(result.code, entry, filePath),
        sourcemap: result.sourcemap,
      };
    }

    const result = entry.compiler.compileExtract({
      code,
      filePath,
      sourcemap: inputMap ?? null,
    });

    if (!result) return null;

    if (entry.cssCache) {
      entry.cssCache.setFileCss({
        filePath,
        contentHash: createFileCssContentHash(code),
        configHash: entry.configHash,
        rules: result.rules,
      });
    }

    return {
      code: injectNextRuntimeCode(result.code, entry, filePath),
      sourcemap: result.sourcemap,
    };
  },
});

export default loader;

function injectNextRuntimeCode(
  code: string,
  entry: NextLoaderState,
  filePath: string,
) {
  let nextCode = code;

  if (entry.isServer) {
    nextCode = injectModuleImport(nextCode, SERVER_ENTRY_IMPORT_PATH);
  } else {
    nextCode = injectModuleImport(nextCode, CLIENT_ENTRY_IMPORT_PATH);
  }

  if (isAppLayoutFile(filePath)) {
    if (entry.dev) {
      nextCode = injectDevCssLink(nextCode, entry.devCssHref);
    } else {
      nextCode = injectModuleImport(nextCode, ensureCssEntryImportPath(entry.cssEntryImportPath, filePath));
    }
  }

  return nextCode;
}

function ensureCssEntryImportPath(importPath: string, importerPath: string) {
  if (!path.isAbsolute(importPath)) return importPath;

  fs.mkdirSync(path.dirname(importPath), { recursive: true });

  if (!fs.existsSync(importPath)) {
    fs.writeFileSync(importPath, getExtractedCssMarker(), 'utf8');
  }

  return toRelativeImportPath(path.relative(path.dirname(importerPath), importPath));
}

function toRelativeImportPath(filePath: string) {
  const normalized = filePath.split(path.sep).join('/');

  return normalized.startsWith('.') ? normalized : './' + normalized;
}

function getTurbopackEntry(options: NextTurbopackLoaderOptions): NextLoaderState | null {
  if (!options.projectDir || !options.cacheDir) return null;

  const dev = options.dev ?? false;

  const buildMeta = options.buildMeta ?? createNextBuildMeta(dev, options);

  const compiler = createPluginCompiler({
    projectDir: options.projectDir,
    cacheDir: options.cacheDir,
    dev,
    options: resolveNextCompilerOptions(options, null, buildMeta),
  });

  const configHash = options.configHash ?? createFileCssConfigHash(buildMeta);

  const cssCache: FileCssCache = createFileCssCache({
    cacheDir: getNextCacheDir(options.projectDir, options.cacheDir),
    namespace: PRECOLLECT_NAMESPACE,
  });

  return {
    compiler: compiler.compiler,
    filter: compiler.filter,
    configHash,
    cssCache,
    cssEntryImportPath: options.cssEntryImportPath ?? CSS_ENTRY_IMPORT_PATH,
    isServer: options.isServer ?? false,
    devCssHref: options.devCssHref ?? null,
    dev,
  };
}
