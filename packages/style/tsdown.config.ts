import { fileURLToPath } from 'node:url';
import { defineConfig } from 'tsdown';

const JSX_RUNTIME_RSC_ENTRY = 'jsx/rsc/jsx_runtime.ts';
const JSX_DEV_RUNTIME_RSC_ENTRY = 'jsx/rsc/jsx_dev_runtime.ts';

export default [
  // Runtime / browser-neutral entries that do not need runtime-mode defines.
  defineConfig({
    entry: {
      'index': 'index.ts',
      'server': 'entry/rsc_dev/server.ts',
      'css': 'css/index.ts',
      'utils': 'style/utils/index.ts',
      'config/index': 'config/index.ts',
      'selector/index': 'selector/index.ts',
      'dev': 'dev/index.ts',
      'jsx/jsx-runtime': 'jsx/runtime/jsx_runtime.ts',
      'jsx/jsx-dev-runtime': 'jsx/runtime/jsx_dev_runtime.ts',
      'entry/dev': 'entry/dev/index.ts',
      'entry/dev/css': 'entry/dev/css.ts',
      'entry/dev/jsx-runtime': 'entry/dev/jsx_runtime.ts',
      'entry/dev/jsx-dev-runtime': 'entry/dev/jsx_dev_runtime.ts',
      'dev/rsc': 'runtime/rsc/index.ts',
    },
    dts: false,
    format: ['esm'],
    clean: true,
    sourcemap: true,
    platform: 'neutral',
  }),

  createRuntimeConfig({
    'entry/prod': 'entry/prod/index.ts',
    'entry/prod/css': 'entry/prod/css.ts',
    'entry/prod/runtime': 'entry/prod/runtime.ts',
    'entry/prod/extract': 'entry/prod/extract.ts',
    'entry/prod/jsx-runtime': 'entry/prod/jsx_runtime.ts',
    'entry/prod/jsx-dev-runtime': 'entry/prod/jsx_dev_runtime.ts',
    'entry/rsc-prod': 'entry/rsc_prod/index.ts',
    'entry/rsc-prod/css': 'entry/rsc_prod/css.ts',
    'entry/rsc-prod/runtime': 'entry/rsc_prod/runtime.ts',
    'entry/rsc-prod/jsx-runtime': 'entry/rsc_prod/jsx_runtime.ts',
    'entry/rsc-prod/jsx-dev-runtime': 'entry/rsc_prod/jsx_dev_runtime.ts',
  }, {
    checkSelector: false,
  }),

  createRuntimeConfig({
    'jsx/jsx-runtime.server': JSX_RUNTIME_RSC_ENTRY,
    'jsx/jsx-dev-runtime.server': JSX_DEV_RUNTIME_RSC_ENTRY,
  }, {
    checkSelector: false,
  }),

  createRuntimeConfig({
    'entry/rsc-dev': 'entry/rsc_dev/index.ts',
    'entry/rsc-dev/css': 'entry/rsc_dev/css.ts',
    'entry/rsc-dev/dev': 'entry/rsc_dev/dev.ts',
    'entry/rsc-dev/jsx-runtime': 'entry/rsc_dev/jsx_runtime.ts',
    'entry/rsc-dev/jsx-dev-runtime': 'entry/rsc_dev/jsx_dev_runtime.ts',
  }),

  // Build-tool / Node.js entries
  defineConfig({
    entry: {
      'plugin/vite/index': 'plugin/bundler/vite/index.ts',
      'plugin/webpack/index': 'plugin/bundler/webpack/index.ts',
      'plugin/webpack/loader': 'plugin/bundler/webpack/loader.ts',
      'plugin/rspack/index': 'plugin/bundler/rspack/index.ts',
      'plugin/farm/index': 'plugin/bundler/farm/index.ts',
      'plugin/parcel/index': 'plugin/bundler/parcel/index.ts',
      'plugin/parcel/transformer': 'plugin/bundler/parcel/transformer.ts',
      'plugin/parcel/resolver': 'plugin/bundler/parcel/resolver.ts',
      'plugin/parcel/runtime': 'plugin/bundler/parcel/runtime.ts',
      'plugin/parcel/optimizer': 'plugin/bundler/parcel/optimizer.ts',
      'plugin/nextjs/index': 'plugin/nextjs/index.ts',
      'plugin/nextjs/loader': 'plugin/nextjs/loader.ts',
    },
    dts: false,
    format: ['esm'],
    clean: false,
    sourcemap: true,
    platform: 'node',
  }),

  // Parcel's package manager can statically track CommonJS plugin graphs.
  defineConfig({
    entry: {
      'plugin/parcel/index': 'plugin/bundler/parcel/index.ts',
      'plugin/parcel/transformer': 'plugin/bundler/parcel/transformer.ts',
      'plugin/parcel/resolver': 'plugin/bundler/parcel/resolver.ts',
      'plugin/parcel/runtime': 'plugin/bundler/parcel/runtime.ts',
      'plugin/parcel/optimizer': 'plugin/bundler/parcel/optimizer.ts',
    },
    dts: false,
    format: ['cjs'],
    clean: false,
    sourcemap: true,
    platform: 'node',
  }),
];

function createRuntimeConfig(
  entry: Record<string, string>,
  options: {
    checkSelector?: boolean;
  } = {},
) {
  const checkSelectorAlias = options.checkSelector !== false
    ? resolveLocal('builder/data/check_selector.ts')
    : resolveLocal('builder/data/check_selector.noop.ts');

  const alias: Record<string, string> = {
    './data/check_selector': checkSelectorAlias,
  };

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
