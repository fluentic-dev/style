import './extracted-tokens.test';
import './core.test';
import './compiler.test';
import './package-filter.test';
import './lazy-evaluation.test';
import './persistent-cache.test';
import './tracer-metadata.test';
import './runtime.test';
import './invariants.test';
import './sheet.test';
import './ordering.test';
import './snapshot.test';
import './document.test';
import { runTests } from './setup';

await runTests();
