import { createWebpackLoader } from './shared/loader';
import { type WebpackLoaderState, webpackRegistry } from './utils';

const loader = createWebpackLoader<WebpackLoaderState>({
  getEntry: webpackRegistry.getEntry,
  missingCompilerMessage: 'webpack compiler is not registered.',
  transform({ code, entry, filePath, inputMap }) {
    const result = entry.transform(code, filePath, inputMap ?? null);

    if (!result) return null;

    return {
      code: result.code,
      sourcemap: result.map,
    };
  },
});

export default loader;
