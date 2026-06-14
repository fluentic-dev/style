import { defineConfig } from 'tsdown';

const JSX_RUNTIME_ENTRY = 'jsx/jsx-runtime.ts';
const JSX_DEV_RUNTIME_ENTRY = 'jsx/jsx-dev-runtime.ts';
type RuntimeMode = 'full' | 'extracted' | 'prod' | 'rsc';

export default [
  // Runtime / browser-neutral entries that do not need runtime-mode defines.
  defineConfig({
    entry: {
      'index': 'index.ts',
      'server': 'server.ts',
      'config/index': 'config/index.ts',
      'config/build': 'config/build.ts',
      'dev': 'dev/index.ts',
      'runtime/rsc': 'runtime/rsc/index.ts',
      'runtime/style/index': 'runtime/style/index.ts',
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

  createRuntimeModeConfig('full', {
    'jsx-runtime/index': JSX_RUNTIME_ENTRY,
    'jsx-dev-runtime/index': JSX_DEV_RUNTIME_ENTRY,
  }),

  createRuntimeModeConfig('extracted', {
    'jsx-runtime/extracted': JSX_RUNTIME_ENTRY,
    'jsx-dev-runtime/extracted': JSX_DEV_RUNTIME_ENTRY,
  }),

  createRuntimeModeConfig('prod', {
    'jsx-runtime/prod': JSX_RUNTIME_ENTRY,
    'jsx-dev-runtime/prod': JSX_DEV_RUNTIME_ENTRY,
  }),

  createRuntimeModeConfig('rsc', {
    'jsx-runtime/server': JSX_RUNTIME_ENTRY,
    'jsx-dev-runtime/server': JSX_DEV_RUNTIME_ENTRY,
  }),

  // Build-tool / Node.js entries
  defineConfig({
    entry: {
      'compiler/index': 'compiler/index.ts',
      'plugin/vite/index': 'plugin/vite/index.ts',
      'plugin/sidecar/index': 'plugin/sidecar/index.ts',
      'plugin/rollup/index': 'plugin/rollup/index.ts',
      'plugin/webpack/index': 'plugin/webpack/index.ts',
      'plugin/webpack/loader': 'plugin/webpack/loader.ts',
      'plugin/esbuild/index': 'plugin/esbuild/index.ts',
      'plugin/rspack/index': 'plugin/rspack/index.ts',
      'plugin/rolldown/index': 'plugin/rolldown/index.ts',
      'plugin/farm/index': 'plugin/farm/index.ts',
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

function createRuntimeModeConfig(
  mode: RuntimeMode,
  entry: Record<string, string>,
) {
  return defineConfig({
    entry,
    define: {
      __FLUENTIC_RUNTIME_MODE__: JSON.stringify(mode),
    },
    dts: false,
    format: ['esm'],
    clean: false,
    sourcemap: true,
    platform: 'neutral',
  });
}
