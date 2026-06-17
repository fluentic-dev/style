import { fileURLToPath } from 'node:url';
import { defineConfig } from 'tsdown';

const JSX_RUNTIME_ENTRY = 'jsx/jsx-runtime.ts';
const JSX_DEV_RUNTIME_ENTRY = 'jsx/jsx-dev-runtime.ts';
const JSX_RUNTIME_EXTRACTED_ENTRY = 'jsx/jsx-runtime.extracted.ts';
const JSX_DEV_RUNTIME_EXTRACTED_ENTRY = 'jsx/jsx-dev-runtime.extracted.ts';
const JSX_RUNTIME_SERVER_ENTRY = 'jsx/jsx-runtime.server.ts';
const JSX_DEV_RUNTIME_SERVER_ENTRY = 'jsx/jsx-dev-runtime.server.ts';
const JSX_RUNTIME_SERVER_EXTRACTED_ENTRY = 'jsx/jsx-runtime.server-extracted.ts';
const JSX_DEV_RUNTIME_SERVER_EXTRACTED_ENTRY = 'jsx/jsx-dev-runtime.server-extracted.ts';

export default [
  // Runtime / browser-neutral entries that do not need runtime-mode defines.
  defineConfig({
    entry: {
      'index': 'index.ts',
      'server': 'server.ts',
      'css/index': 'css/index.ts',
      'config/index': 'config/index.ts',
      'config/build': 'config/build.ts',
      'dev': 'dev/index.ts',
      'runtime/rsc': 'runtime/rsc/index.ts',
      'runtime/style/index': 'runtime/style/index.ts',
      'plugin/nextjs/runtime/client': 'plugin/nextjs/runtime/client.ts',
      'plugin/nextjs/runtime/server': 'plugin/nextjs/runtime/server.ts',
    },
    dts: false,
    format: ['esm'],
    clean: true,
    sourcemap: true,
    platform: 'neutral',
  }),

  createRuntimeConfig({
    'jsx-runtime/index': JSX_RUNTIME_ENTRY,
    'jsx-dev-runtime/index': JSX_DEV_RUNTIME_ENTRY,
  }),

  createRuntimeConfig({
    'server/extracted': 'server.extracted.ts',
    'jsx-runtime/extracted': JSX_RUNTIME_EXTRACTED_ENTRY,
    'jsx-dev-runtime/extracted': JSX_DEV_RUNTIME_EXTRACTED_ENTRY,
    'jsx-runtime/server-extracted': JSX_RUNTIME_SERVER_EXTRACTED_ENTRY,
    'jsx-dev-runtime/server-extracted': JSX_DEV_RUNTIME_SERVER_EXTRACTED_ENTRY,
    'runtime/extract': 'runtime/extract/index.ts',
    'builder/extract/index': 'builder/extract/index.ts',
  }, {
    checkSelector: false,
  }),

  createRuntimeConfig({
    'jsx-runtime/prod': JSX_RUNTIME_ENTRY,
    'jsx-dev-runtime/prod': JSX_DEV_RUNTIME_ENTRY,
  }, {
    checkSelector: false,
    globalSheet: 'prod',
  }),

  createRuntimeConfig({
    'jsx-runtime/server': JSX_RUNTIME_SERVER_ENTRY,
    'jsx-dev-runtime/server': JSX_DEV_RUNTIME_SERVER_ENTRY,
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

function createRuntimeConfig(
  entry: Record<string, string>,
  options: {
    checkSelector?: boolean;
    globalSheet?: 'default' | 'prod';
  } = {},
) {
  const checkSelectorAlias = options.checkSelector !== false
    ? resolveLocal('builder/data/check_selector.ts')
    : resolveLocal('builder/data/check_selector.noop.ts');
  const alias: Record<string, string> = {
    './data/check_selector': checkSelectorAlias,
  };

  if (options.globalSheet === 'prod') {
    alias['../sheet/global'] = resolveLocal('runtime/sheet/global-prod.ts');
  }

  return defineConfig({
    entry,
    alias,
    dts: false,
    format: ['esm'],
    clean: false,
    sourcemap: true,
    platform: 'neutral',
  });
}

function resolveLocal(file: string) {
  return fileURLToPath(new URL(file, import.meta.url));
}
