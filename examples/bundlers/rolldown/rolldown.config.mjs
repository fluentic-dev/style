import {
  esbuildReactPlugin,
  getRuntimeAwareEntry,
  getSourcemapFilePath,
  htmlAssetPlugin,
  useStylePlugin,
} from '@example/bundler-shared/bundler.mjs';
import { plugin as stylePlugin } from '@fluentic/style/plugin/rolldown';
import * as esbuild from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const stylePluginEnabled = useStylePlugin();

export default {
  input: path.join(rootDir, getRuntimeAwareEntry('src/main.tsx', 'src/main.runtime.tsx')),
  output: {
    dir: path.join(rootDir, 'dist'),
    format: 'esm',
    sourcemap: true,
    entryFileNames: 'main.js',
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.jsx', '.js'],
  },
  plugins: [
    stylePluginEnabled && stylePlugin({
      getSourcemapFilePath,
    }),
    esbuildReactPlugin(esbuild),
    htmlAssetPlugin('Fluentic Style Rolldown Sample'),
  ].filter(Boolean),
};
