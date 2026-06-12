import { RUNTIME_CONFIG } from '../config';

export function enableDevUtils() {
  const name = RUNTIME_CONFIG.devUtils;
  if (!name) return;

  const target = getDevUtilsTarget();
  if (!target) return;

  target[name] = getUtils();

  logCssDevUtilsEnabled(name);
}

function getDevUtilsTarget(): Record<string, unknown> {
  return typeof globalThis.window === 'undefined'
    ? globalThis
    : globalThis.window as {};
}

function getUtils() {
  return {
    getConfig() {
      return RUNTIME_CONFIG;
    },

    traceSourcemap() {
      traceSourcemap();

      return logTraceStart();
    },
  };
}

async function traceSourcemap() {
  const trace = await import('./trace');

  const result = await trace.traceDevSourcemaps();

  logTraceCompleted(result);

  return result;
}

function logTraceStart() {
  const items = [
    'O_o [ tracing... ]',
    '(-_-) [ mapping... ]',
    '(^_-) [ decoding... ]',
    'p(^_^)q [ hunting... ]',
    'B-) [ analyzing... ]',
  ];

  const index = Math.floor(Math.random() * items.length);

  return items[index];
}

function logTraceCompleted(result: {
  tags: number;
  rules: number;
  remapped: number;
  unresolved: number;
}) {
  console.log(
    '\x1b[32m✔\x1b[0m \x1b[1m\x1b[36m[sourcemap]\x1b[0m trace completed ' +
      `\x1b[2m(tags:${result.tags} rules:${result.rules} remapped:${result.remapped} unresolved:${result.unresolved})\x1b[0m`,
  );
}

function logCssDevUtilsEnabled(displayName: string) {
  console.log(
    `\x1b[35m✨\x1b[0m \x1b[1m\x1b[35m[${displayName}]\x1b[0m \x1b[32menabled\x1b[0m ` +
      `\x1b[2m│ Run\x1b[0m \x1b[1m\x1b[36m${displayName}.traceSourcemap()\x1b[0m \x1b[2mto map back to original source code\x1b[0m`,
  );
}
