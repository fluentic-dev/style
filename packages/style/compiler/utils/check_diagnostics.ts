export type CheckDiagnostic = { level: 'warn' | 'error'; message: string; };

let observer: ((diagnostic: CheckDiagnostic) => void) | undefined;

/** Extraction is synchronous; restore the previous observer for nested compilations. */
export function observeCheckDiagnostics<T>(onDiagnostic: (diagnostic: CheckDiagnostic) => void, run: () => T): T {
  const previous = observer;
  observer = onDiagnostic;
  try {
    return run();
  } finally {
    observer = previous;
  }
}

export function recordCheckDiagnostic(diagnostic: CheckDiagnostic) {
  observer?.(diagnostic);
}
