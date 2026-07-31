import { CssPropPresets, plugin as stylePlugin } from '@fluentic/style/plugin/vite';
import preact from '@preact/preset-vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    stylePlugin({
      cssProp: CssPropPresets.Preact,
    }),
    preact(),
  ],
});
