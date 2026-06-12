import { runRuntime } from './playground-runtime';

self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || data.kind !== 'run') return;

  try {
    const result = runRuntime({ files: data.files, config: data.config });
    // oxlint-disable-next-line unicorn/require-post-message-target-origin
    self.postMessage({ kind: 'result', id: data.id, ...result });
  } catch (error) {
    /* oxlint-disable unicorn/require-post-message-target-origin */
    self.postMessage({
      kind: 'result',
      id: data.id,
      error: error && (error as Error).stack ? (error as Error).stack : String(error),
    });
    /* oxlint-enable unicorn/require-post-message-target-origin */
  }
});
