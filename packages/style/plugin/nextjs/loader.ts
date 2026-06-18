import fs from 'node:fs';
import path from 'node:path';
import { rewriteImportSources } from '../../compiler/transform/utils/import';
import { getDefaultSourcemapUrl, type SourcemapFilePathInfo } from '../../compiler/utils/sourcemap';
import type { BuildConfig, BuildDevConfig } from '../../config/build';
import {
  createFileCssCache,
  createFileCssConfigHash,
  createFileCssContentHash,
  createPluginCompiler,
  EXTRACTED_CSS_MARKER,
  type FileCssCache,
} from '../utils';
import { getStyleRuntimeImportPath, STYLE_IMPORTS } from '../utils/imports';
import { getStyleRuntimeMode, StyleRuntimeMode } from '../utils/runtimeEntry';
import { injectModuleImport } from '../utils/injection';
import { createWebpackLoader, type WebpackLoaderOptions } from '../bundler/webpack/shared/loader';
import { CSS_ENTRY_IMPORT_PATH } from './constants';
import { injectDevCssLink } from './html';
import {
  createNextBuildConfig,
  createNextBuildDevConfig,
  createNextConfigHash,
  getNextCacheDir,
  isAppLayoutFile,
  type NextLoaderState,
  nextRegistry,
  PRECOLLECT_CACHE_DIR,
  resolveNextCompilerOptions,
} from './utils';

type NextTurbopackLoaderOptions = WebpackLoaderOptions & {
  buildConfig?: BuildConfig;
  buildDevConfig?: BuildDevConfig | null;
  cacheDir?: string;
  cssEntryImportPath?: string;
  configHash?: string;
  dev?: boolean;
  devCssHref?: string | null;
  isServer?: boolean;
  projectDir?: string;
};

const loader = createWebpackLoader<NextLoaderState>({
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
    nextCode = entry.dev
      ? rewriteServerDevStyleImports(nextCode)
      : rewriteServerStyleImports(nextCode);
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

export function rewriteServerDevStyleImports(code: string) {
  return rewriteServerStyleImports(code, getStyleRuntimeImportPath(StyleRuntimeMode.RscDev));
}

export function rewriteServerStyleImports(
  code: string,
  importPath = getStyleRuntimeImportPath(StyleRuntimeMode.RscProd),
) {
  return rewriteImportSources(
    code,
    (source) => source === STYLE_IMPORTS.Root ? importPath : null,
    'fluentic-next-server-style-imports.js',
  );
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

function getTurbopackEntry(options: NextTurbopackLoaderOptions): NextLoaderState | null {
  if (!options.projectDir || !options.cacheDir) return null;

  const dev = options.dev ?? false;

  const buildConfig = options.buildConfig ?? createNextBuildConfig(options);
  const buildDevConfig = options.buildDevConfig ?? createNextBuildDevConfig(options);
  const compilerOptions = resolveNextCompilerOptions(
    options,
    null,
    buildConfig,
    buildDevConfig,
    dev,
  );

  if (dev) {
    compilerOptions.devSourcemap = 'sidecarServer';

    compilerOptions.getSourcemapFilePath = createTurbopackFallbackSourcemapFilePath(
      options,
      compilerOptions.getSourcemapFilePath,
    );
  }

  const compiler = createPluginCompiler({
    projectDir: options.projectDir,
    cacheDir: options.cacheDir,
    dev,
    options: compilerOptions,
    runtimeMode: getStyleRuntimeMode(dev, options.isServer ?? false),
  });

  const configHash = options.configHash ?? createFileCssConfigHash(
    createNextConfigHash(buildConfig, buildDevConfig, dev),
  );

  const cssCache: FileCssCache = createFileCssCache({
    cacheDir: getNextCacheDir(options.projectDir, options.cacheDir),
    cacheSubdir: PRECOLLECT_CACHE_DIR,
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
