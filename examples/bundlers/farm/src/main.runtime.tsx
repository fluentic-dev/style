import { configureBundlerRuntime } from '@example/bundler-shared/runtime';

configureBundlerRuntime(import.meta.env.DEV);

void import('./main');
