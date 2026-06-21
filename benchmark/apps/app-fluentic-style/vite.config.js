import { plugin as stylePlugin } from '@fluentic/style/plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const hoist = process.env.FLUENTIC_STYLE_HOIST !== '0';

export default defineConfig({
  plugins: [
    stylePlugin({ hoist }),
    react({
      jsxImportSource: '@fluentic/style/plugin/jsx',
    }),
  ],
});
