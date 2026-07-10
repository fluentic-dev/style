import { plugin as stylePlugin } from '@fluentic/style/plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { tw } from './src/style';

export default defineConfig({
  plugins: [
    stylePlugin({
      importSources: [{
        source: /^(?:\.\.?\/)+style$/,
        name: 'tw',
        styleFn: tw,
      }],
    }),
    react({
      jsxImportSource: '@fluentic/style/plugin/jsx',
    }),
  ],
});
