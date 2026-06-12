import { vite } from '@stylexjs/unplugin';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
export default defineConfig({
  plugins: [
    vite({
      include: /\.(js|jsx|ts|tsx)$/,
      useCSSLayers: true,
    }),
    react(),
  ],
});
