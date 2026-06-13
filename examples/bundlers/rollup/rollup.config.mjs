import {
  esbuildReactPlugin,
  getRuntimeAwareEntry,
  getSourcemapFilePath,
  htmlAssetPlugin,
  useStylePlugin,
} from '@example/bundler-shared/bundler.mjs';
import { plugin as stylePlugin } from '@fluentic/style/plugin/rollup';
import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';
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
  plugins: [
    nodeResolve({ browser: true, extensions: ['.tsx', '.ts', '.jsx', '.js'] }),
    commonjs(),
    stylePluginEnabled && stylePlugin({
      getSourcemapFilePath,
    }),
    esbuildReactPlugin(esbuild),
    htmlAssetPlugin('Fluentic Style Rollup Sample'),
  ].filter(Boolean),
};
