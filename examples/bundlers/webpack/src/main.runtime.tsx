import { configureBundlerRuntime } from '@example/bundler-shared/runtime';

configureBundlerRuntime(process.env.NODE_ENV !== 'production');

import('./main');
