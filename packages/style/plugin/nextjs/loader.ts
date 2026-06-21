import fs from 'node:fs';
import path from 'node:path';
import { getDefaultSourcemapUrl, type SourcemapFilePathInfo } from '../../compiler/utils/sourcemap';
import type { BuildConfig, BuildDevConfig } from '../../config/build';
import { createWebpackLoader, type WebpackLoaderOptions } from '../bundler/webpack/shared/loader';
import {
  createFileCssCache,
  createFileCssContentHash,
  createPluginCompiler,
  EXTRACTED_CSS_MARKER,
  type FileCssCache,
} from '../utils';
import { injectModuleImport } from '../utils/injection';
import { getStyleRuntimeMode } from '../utils/runtimeEntry';
import { injectDevCssLink } from './html';
import {
  getNextCacheDir,
  getNextPrecollectCacheSubdir,
  isAppLayoutFile,
  NEXT_COMPILER_IDS,
  type NextLoaderState,
  nextRegistry,
  resolveNextCompilerOptions,
} from './utils';

type NextTurbopackLoaderOptions = WebpackLoaderOptions & {
  buildConfig: BuildConfig;
  buildDevConfig: BuildDevConfig | null;
  cacheDir: string;
  cssEntryImportPath: string;
  configHash: string;
  dev: boolean;
  devCssHref: string | null;
  isServer: boolean;
  projectDir: string;
};

const loader = createWebpackLoader<NextLoaderState>({
  missingCompilerMessage: 'Next.js compiler is not registered.',
  getEntry(compilerId, options) {
    return nextRegistry.getEntry(compilerId) ??
      getTurbopackEntry(options);
  },
  shouldTransform({ entry, filePath }) {
    return entry.filter(filePath);
  },
  transform({ code, entry, filePath, inputMap, options }) {
    if (entry.dev) {
      const isServer = getNextLoaderIsServer(entry, options);

      const result = entry.compiler.compileDebugRSC({
        code,
        filePath,
        sourcemap: inputMap ?? null,
      });

      if (!result) return null;

      if (entry.cssCache && shouldWriteFileCss(entry, isServer, options)) {
        entry.cssCache.setFileCss({
          filePath,
          contentHash: createFileCssContentHash(code),
          configHash: entry.configHash,
          rules: result.rules,
        });
      }

      return {
        code: injectNextRuntimeCode(
          result.code,
          entry,
          filePath,
        ),
        sourcemap: result.sourcemap,
      };
    }

    const result = entry.compiler.compileExtract({
      code,
      filePath,
      sourcemap: inputMap ?? null,
    });

    if (!result) return null;

    if (entry.cssCache && shouldWriteFileCss(entry, getNextLoaderIsServer(entry, options), options)) {
      entry.cssCache.setFileCss({
        filePath,
        contentHash: createFileCssContentHash(code),
        configHash: entry.configHash,
        rules: result.rules,
      });
    }

    return {
      code: injectNextRuntimeCode(
        result.code,
        entry,
        filePath,
      ),
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

  if (isAppLayoutFile(filePath)) {
    if (entry.dev) {
      nextCode = injectDevCssLink(nextCode, entry.devCssHref);
    } else {
      nextCode = injectModuleImport(nextCode, ensureCssEntryImportPath(entry.cssEntryImportPath, filePath));
    }
  }

  return nextCode;
}

function getNextLoaderIsServer(
  entry: NextLoaderState,
  options: WebpackLoaderOptions,
): boolean {
  return isTurbopackLoaderOptions(options) ? true : entry.isServer;
}

function shouldWriteFileCss(
  entry: NextLoaderState,
  isServer: boolean,
  options: WebpackLoaderOptions,
) {
  return !entry.dev || isServer || isTurbopackLoaderOptions(options);
}

function ensureCssEntryImportPath(importPath: string, importerPath: string) {
  if (!path.isAbsolute(importPath)) return importPath;

  fs.mkdirSync(path.dirname(importPath), { recursive: true });

  if (!fs.existsSync(importPath)) {
    fs.writeFileSync(importPath, EXTRACTED_CSS_MARKER, 'utf8');
  }

  return toRelativeImportPath(path.relative(path.dirname(importerPath), importPath));
}

function toRelativeImportPath(filePath: string) {
  const normalized = filePath.split(path.sep).join('/');

  return normalized.startsWith('.') ? normalized : './' + normalized;
}

function getTurbopackEntry(options: WebpackLoaderOptions): NextLoaderState | null {
  if (!isTurbopackLoaderOptions(options)) return null;

  const compilerOptions = resolveNextCompilerOptions(
    options,
    null,
    options.buildConfig,
    options.buildDevConfig,
    options.dev,
  );

  if (options.dev) {
    compilerOptions.devSourcemap = 'sidecarServer';

    compilerOptions.getSourcemapFilePath = createTurbopackFallbackSourcemapFilePath(
      options,
      compilerOptions.getSourcemapFilePath,
    );
  }

  const compiler = createPluginCompiler({
    projectDir: options.projectDir,
    cacheDir: options.cacheDir,
    dev: options.dev,
    options: compilerOptions,
    runtimeMode: getStyleRuntimeMode(options.dev, true),
  });

  const cssCache: FileCssCache = createFileCssCache({
    cacheDir: getNextCacheDir(options.projectDir, options.cacheDir),
    cacheSubdir: getNextPrecollectCacheSubdir(options.dev),
  });

  return {
    compiler: compiler.compiler,
    filter: compiler.filter,
    configHash: options.configHash,
    cssCache,
    cssEntryImportPath: options.cssEntryImportPath,
    isServer: true,
    devCssHref: options.devCssHref,
    dev: options.dev,
  };
}

function isTurbopackLoaderOptions(options: WebpackLoaderOptions): options is NextTurbopackLoaderOptions {
  return options.compilerId.includes(NEXT_COMPILER_IDS.turbopack);
}

function createTurbopackFallbackSourcemapFilePath(
  options: NextTurbopackLoaderOptions,
  getSourcemapFilePath: typeof options.getSourcemapFilePath,
): typeof options.getSourcemapFilePath {
  return (info) => {
    const defaultSourceUrl = getDefaultSourcemapUrl(info);

    const nextInfo: SourcemapFilePathInfo = {
      ...info,
      sourceUrl: defaultSourceUrl,
    };

    return getSourcemapFilePath?.(nextInfo) || defaultSourceUrl;
  };
}
