import { CssPropPresets, plugin as stylePlugin } from '@fluentic/style/plugin/vite';
import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';

export default defineConfig({
  plugins: [
    stylePlugin({
      cssProp: CssPropPresets.Solid,
    }),
    solid(),
  ],
});
