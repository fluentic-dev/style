import {
  getRuntimeAwareEntry,
  getSourcemapFilePath,
  renderHtml,
  useStylePlugin,
} from '@example/bundler-shared/bundler.mjs';
import { plugin as stylePlugin } from '@fluentic/style/plugin/esbuild';
import * as esbuild from 'esbuild';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const watch = process.argv.includes('--watch');
const stylePluginEnabled = useStylePlugin();

const options = {
  entryPoints: [path.join(rootDir, getRuntimeAwareEntry('src/main.tsx', 'src/main.runtime.tsx'))],
  outfile: path.join(rootDir, 'dist/main.js'),
  bundle: true,
  format: 'esm',
  platform: 'browser',
  sourcemap: true,
  jsx: 'automatic',
  jsxImportSource: '@fluentic/style',
  loader: {
    '.ts': 'ts',
    '.tsx': 'tsx',
  },
  plugins: [
    stylePluginEnabled && stylePlugin({
      getSourcemapFilePath,
    }),
  ].filter(Boolean),
};

await fs.mkdir(path.join(rootDir, 'dist'), { recursive: true });
await fs.writeFile(
  path.join(rootDir, 'dist/index.html'),
  renderHtml({ title: 'Fluentic Style Esbuild Sample' }),
  'utf8',
);

if (watch) {
  const context = await esbuild.context(options);
  await context.watch();
  console.log('Watching esbuild sample...');
} else {
  await esbuild.build(options);
}
