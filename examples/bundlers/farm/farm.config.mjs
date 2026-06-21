import { getRuntimeAwareEntry, getSourcemapFilePath, useStylePlugin } from '@example/bundler-shared/bundler.mjs';
import { defineConfig } from '@farmfe/core';
import { plugin as stylePlugin } from '@fluentic/style/plugin/farm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const stylePluginEnabled = useStylePlugin();

export default defineConfig(({ mode }) => {
  const dev = mode !== 'production';

  return {
    root: rootDir,
    plugins: [
      ['@farmfe/plugin-react', {
        runtime: 'automatic',
        importSource: '@fluentic/style/plugin/jsx',
        development: dev,
      }],
      stylePluginEnabled && stylePlugin({
        dev,
        devSourcemap: dev ? 'sidecarServer' : 'sourceUrl',
        getSourcemapFilePath,
      }),
    ].filter(Boolean),
    compilation: {
      input: {
        index: './index.html',
      },
      output: {
        path: './dist',
        publicPath: '/',
      },
      resolve: {
        extensions: ['tsx', 'ts', 'jsx', 'js'],
      },
      script: {
        parser: {
          tsConfig: {
            tsx: true,
          },
        },
      },
      sourcemap: dev ? true : 'all',
      presetEnv: false,
      persistentCache: false,
      define: {
        __FARM_ENTRY__: getRuntimeAwareEntry('/src/main.tsx', '/src/main.runtime.tsx'),
      },
    },
    server: {
      host: '127.0.0.1',
      port: 4179,
    },
  };
});
