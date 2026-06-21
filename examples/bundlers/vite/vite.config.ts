import {
  getDevSourcemap,
  getSourcemapFilePath,
  replaceHtmlEntry,
  useStylePlugin,
} from '@example/bundler-shared/bundler.mjs';
import { plugin as stylePlugin } from '@fluentic/style/plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig(({ command }) => {
  const stylePluginEnabled = useStylePlugin();

  return {
    plugins: [
      !stylePluginEnabled && {
        name: 'fluentic-runtime-entry',
        transformIndexHtml(html) {
          return replaceHtmlEntry(html, '/src/main.tsx', '/src/main.runtime.tsx');
        },
      },
      stylePluginEnabled && stylePlugin({
        devSourcemap: command === 'serve' ? getDevSourcemap() : 'sourceUrl',
        getSourcemapFilePath,
      }),
      react({
        jsxImportSource: '@fluentic/style/plugin/jsx',
      }),
    ].filter(Boolean),
  };
});
