import { createWebpackStyleLoader } from '../utils/webpack/loader';
import { type WebpackLoaderState, webpackRegistry } from './utils';

const loader = createWebpackStyleLoader<WebpackLoaderState>({
  getEntry: webpackRegistry.getEntry,
  missingCompilerMessage: 'webpack compiler is not registered.',
  transform({ code, entry, filePath, inputMap }) {
    const result = entry.dev
      ? entry.compiler.compileDebug({
        code,
        filePath,
        sourcemap: inputMap ?? null,
      })
      : entry.compiler.compileExtract({
        code,
        filePath,
        sourcemap: inputMap ?? null,
      });

    if (!result) return null;

    return result;
  },
});

export default loader;
