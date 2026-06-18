import { plugin as stylePlugin } from '@fluentic/style/plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { style, sx, ui } from './src/style';

export default defineConfig({
  plugins: [
    stylePlugin({
      importSources: [{
        source: './style',
        name: 'style',
        styleFn: style,
      }, {
        source: './style',
        name: 'sx',
        styleFn: sx,
      }, {
        source: './style',
        name: 'ui',
        styleFn: ui,
      }],
    }),
    react({
      jsxImportSource: '@fluentic/style',
    }),
  ],
});
