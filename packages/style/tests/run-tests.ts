import './core.test';
import './compiler.test';
import './runtime.test';
import './invariants.test';
import './sheet.test';
import './snapshot.test';
import { runTests } from './setup';

await runTests();
