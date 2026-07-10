import { plugin as fluenticStyle } from '@fluentic/style/plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { cx } from './src/style';

export default defineConfig({
  plugins: [
    fluenticStyle({
      importSources: [{
        source: /^(?:\.\.?\/)+style$/,
        name: 'cx',
        styleFn: cx,
      }],
    }),
    react({
      jsxImportSource: '@fluentic/style/plugin/jsx',
    }),
  ],
});
