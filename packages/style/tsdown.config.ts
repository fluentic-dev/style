import { defineConfig } from 'tsdown';

export default [
  // Runtime / browser-neutral entries
  defineConfig({
    entry: {
      'index': 'index.ts',
      'server': 'server.ts',
      'config/index': 'config/index.ts',
      'config/build': 'config/build.ts',
      'dev': 'dev/index.ts',
      'runtime/dev': 'runtime/dev/index.ts',
      'runtime/rsc': 'runtime/rsc/index.ts',
      'runtime/static/index': 'runtime/static/index.ts',
      'jsx-runtime/index': 'jsx/jsx-runtime.ts',
      'jsx-runtime/server': 'jsx/jsx-runtime.server.ts',
      'jsx-dev-runtime/index': 'jsx/jsx-dev-runtime.ts',
      'jsx-dev-runtime/server': 'jsx/jsx-dev-runtime.server.ts',
      'builder/extract/index': 'builder/extract/index.ts',
      'plugin/nextjs/runtime/client': 'plugin/nextjs/runtime/client.ts',
      'plugin/nextjs/runtime/server': 'plugin/nextjs/runtime/server.ts',
    },
    dts: false,
    format: ['esm'],
    clean: true,
    sourcemap: true,
    platform: 'neutral',
  }),

  // Build-tool / Node.js entries
  defineConfig({
    entry: {
      'compiler/index': 'compiler/index.ts',
      'plugin/vite/index': 'plugin/vite/index.ts',
      'plugin/sidecar/index': 'plugin/sidecar/index.ts',
      'plugin/webpack/index': 'plugin/webpack/index.ts',
      'plugin/webpack/loader': 'plugin/webpack/loader.ts',
      'plugin/nextjs/index': 'plugin/nextjs/index.ts',
      'plugin/nextjs/loader': 'plugin/nextjs/loader.ts',
    },
    dts: false,
    deps: {
      neverBundle: [
        '@fluentic/style/config/build',
      ],
    },
    format: ['esm'],
    clean: false,
    sourcemap: true,
    platform: 'node',
  }),
];
