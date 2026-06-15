import { plugin as stylePlugin } from '@fluentic/style/plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => {
  const withStylePlugin = mode !== 'pure';
  const checkSelector = mode === 'plugin-no-check'
    ? false
    : mode === 'plugin-force'
    ? 'force'
    : undefined;

  return {
    plugins: [
      withStylePlugin ? stylePlugin({ checkSelector }) : null,
      react({
        jsxImportSource: '@fluentic/style',
      }),
    ],
  };
});
