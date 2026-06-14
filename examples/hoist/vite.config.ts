import { plugin as stylePlugin } from '@fluentic/style/plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    stylePlugin({ hoist: true }),
    react({
      jsxImportSource: '@fluentic/style',
    }),
  ],
});
