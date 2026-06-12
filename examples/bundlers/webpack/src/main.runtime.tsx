import { configureBundlerRuntime } from '@example/bundler-shared/runtime';

declare const __FLUENTIC_RUNTIME_DEV__: boolean;

configureBundlerRuntime(__FLUENTIC_RUNTIME_DEV__);

void import('./main');
