import { plugin as stylePlugin } from '@fluentic/style/plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { style } from './src/style';

export default defineConfig({
  plugins: [
    stylePlugin({
      styleFn: style,
      importSources: [
        { source: './style', name: 'style' },
      ],
    }),
    react({
      jsxImportSource: '@fluentic/style',
    }),
  ],
});
