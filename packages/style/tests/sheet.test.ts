import { SIDECAR_URL_GLOBAL_SYMBOL } from '../config/utils';
import { DEV_CONFIG, IS_DEV, setBuildDevConfig, setDevRuntimeOptions, setDevUtilsRuntimeOptions } from '../config/config/dev';
import {
  configureTestRuntime,
  createDevSheet,
  createFakeDocument,
  createFetchResponse,
  createProdSheet,
  type DebugData,
  enableStyleDevUtils,
  equal,
  getInlineSourceMap,
  getRuleCallsite,
  includes,
  setBuildMeta,
  test,
  traceCallsite,
  traceDevSourcemaps,
  withBrowserWindow,
} from './setup';

test('dev sheet keeps layer tag first and chunks rule tags', () => {
  const document = createFakeDocument();
  const sheet = createDevSheet({
    document: document as unknown as Document,
    maxRules: 1,
    sourcemap: true,
  });

  sheet.updateLayers(['a', '$layer', 'b']);
  sheet.insert({
    key: 'one',
    css: '.one{color:red}',
    callsite: {
      filePath: '/src/one.ts',
      sourceUrl: 'http://127.0.0.1:43210/lib/styles.ts?__fluentic_source=abc',
      line: 10,
      column: 2,
    },
  });
  sheet.insert({
    key: 'two',
    css: '.two{color:blue}',
    debug: {
      $$debug: true,
      loc: [20, 4],
      label: ['', '', ''],
      sourceUrl: '/src/two.ts',
    },
  });
  sheet.flush();

  equal(document.head.childNodes.length, 3);
  equal(document.head.childNodes[0].getAttribute('data-css-sheet'), 'layers');
  equal(document.head.childNodes[1].getAttribute('data-css-sheet'), 'rules');
  equal(document.head.childNodes[2].getAttribute('data-css-sheet'), 'rules');
  includes(document.head.childNodes[0].textContent, '@layer a, css.');
  includes(document.head.childNodes[0].textContent, ', b;');
  includes(document.head.childNodes[1].textContent, '@layer css.');
  includes(document.head.childNodes[1].textContent, '{.one{color:red}}');
  includes(document.head.childNodes[2].textContent, '@layer css.');
  includes(document.head.childNodes[2].textContent, '{.two{color:blue}}');
  includes(document.head.childNodes[1].textContent, 'sourceMappingURL=');
  equal(
    getInlineSourceMap(document.head.childNodes[1].textContent).sources[0],
    'http://127.0.0.1:43210/lib/styles.ts?__fluentic_source=abc',
  );
  equal(getInlineSourceMap(document.head.childNodes[2].textContent).sources[0], '/src/two.ts');
});

function createFakeStorage() {
  const data = new Map<string, string>();

  return {
    get length() {
      return data.size;
    },

    clear() {
      data.clear();
    },

    getItem(key: string) {
      return data.has(key) ? data.get(key)! : null;
    },

    key(index: number) {
      return Array.from(data.keys())[index] ?? null;
    },

    removeItem(key: string) {
      data.delete(key);
    },

    setItem(key: string, value: string) {
      data.set(key, String(value));
    },
  };
}

function captureConsoleLogs(fn: () => void) {
  const calls: { method: string; args: string[]; }[] = [];
  const previousLog = console.log;
  const previousGroupCollapsed = console.groupCollapsed;
  const previousGroupEnd = console.groupEnd;

  console.log = (...args: unknown[]) => {
    calls.push({ method: 'log', args: args.map(String) });
  };
  console.groupCollapsed = (...args: unknown[]) => {
    calls.push({ method: 'groupCollapsed', args: args.map(String) });
  };
  console.groupEnd = () => {
    calls.push({ method: 'groupEnd', args: [] });
  };

  try {
    fn();
  } finally {
    console.log = previousLog;
    console.groupCollapsed = previousGroupCollapsed;
    console.groupEnd = previousGroupEnd;
  }

  return calls;
}

test('dev sheet sourcemap prefers property callsite over whole debug callsite', () => {
  const callsite = getRuleCallsite(
    {
      filePath: '/src/styles.ts',
      sourceUrl: 'http://127.0.0.1:43210/src/styles.ts?__fluentic_source=abc',
      line: 42,
      column: 7,
    },
    {
      $$debug: true,
      loc: [12, 3],
      label: ['', '', ''],
      sourceUrl: '/src/styles.ts',
    },
  );

  equal(callsite?.line, 42);
  equal(callsite?.column, 7);
  equal(callsite?.sourceUrl, 'http://127.0.0.1:43210/src/styles.ts?__fluentic_source=abc');
});

test('dev sheet sourcemap selects traced debug field location by runtime mode', () => {
  const debug: DebugData = {
    $$debug: true,
    loc: [12, 3],
    label: ['', '', ''],
    sourceUrl: '/src/styles.ts',
    fields: {
      color: {
        0: [20, 5],
        1: [8, 3],
      },
    },
  };

  configureTestRuntime({ dev: true, sourcemapMode: 'style' });
  let callsite = getRuleCallsite(null, debug, 'color');
  equal(callsite?.line, 20);
  equal(callsite?.column, 5);

  configureTestRuntime({ dev: true, sourcemapMode: 'value' });
  callsite = getRuleCallsite(null, debug, 'color');
  equal(callsite?.line, 8);
  equal(callsite?.column, 3);
});

test('dev sheet sourcemap emits sourcesContent from debug code', () => {
  const document = createFakeDocument();
  const sheet = createDevSheet({
    document: document as unknown as Document,
    sourcemap: true,
  });
  const code = 'export const styles = style({ color: "red" });';

  sheet.insert({
    key: 'one',
    css: '.one{color:red}',
    debug: {
      $$debug: true,
      loc: [1, 22],
      label: ['', '', ''],
      sourceUrl: 'webpack:///example/src/styles.ts',
      code,
    },
  });
  sheet.flush();

  const tag = document.head.childNodes[1];
  const map = getInlineSourceMap(tag.textContent);

  equal(map.sources[0], 'webpack:///example/src/styles.ts');
  equal(map.sourcesContent?.[0], code);
});

test('dev sheet sourcemap rebases source urls through sidecar url', () => {
  const key = Symbol.for(SIDECAR_URL_GLOBAL_SYMBOL);
  const root = globalThis as Record<symbol, unknown>;
  const previous = root[key];

  root[key] = 'http://127.0.0.1:12345';

  try {
    const document = createFakeDocument();
    const sheet = createDevSheet({
      document: document as unknown as Document,
      sourcemap: true,
    });

    sheet.insert({
      key: 'one',
      css: '.one{color:red}',
      debug: {
        $$debug: true,
        loc: [1, 1],
        label: ['', '', ''],
        sourceUrl: 'source://@/src/styles.ts',
      },
    });
    sheet.flush();

    const tag = document.head.childNodes[1];
    const map = getInlineSourceMap(tag.textContent);

    equal(map.sources[0], 'http://127.0.0.1:12345/@/src/styles.ts');
    equal(map.sourcesContent, undefined);
  } finally {
    if (previous === undefined) {
      delete root[key];
    } else {
      root[key] = previous;
    }
  }
});

test('dev sheet sourcemap strips stray /at prefix from source urls', () => {
  const document = createFakeDocument();
  const sheet = createDevSheet({
    document: document as unknown as Document,
    sourcemap: true,
  });

  sheet.insert({
    key: 'one',
    css: '.one{color:red}',
    callsite: {
      filePath: '/src/styles.ts',
      sourceUrl: 'http://localhost:5173/at http://localhost:5173/src/styles.ts',
      line: 7,
      column: 5,
    },
  });
  sheet.flush();

  const tag = document.head.childNodes[1];
  const map = getInlineSourceMap(tag.textContent);

  equal(map.sources[0], 'http://localhost:5173/src/styles.ts');
});

test('dev sheet normalizes original callsite source urls before tracing', () => {
  const callsite = getRuleCallsite(
    {
      filePath: 'source:///at http://localhost:5173/src/styles.ts',
      sourceUrl: 'source:///at http://localhost:5173/src/styles.ts',
      line: 7,
      column: 5,
    },
    null,
  );

  equal(callsite?.filePath, 'http://localhost:5173/src/styles.ts');
  equal(callsite?.sourceUrl, 'http://localhost:5173/src/styles.ts');
});

test('runtime trace parses browser stack frames with source labels', () => {
  const root = globalThis as typeof globalThis & {
    Error: ErrorConstructor;
  };
  const OriginalError = root.Error;

  try {
    root.Error = function(message?: string) {
      return {
        name: 'Error',
        message: message ?? '',
        stack: [
          'Error',
          '    at $fn_style (http://127.0.0.1:4174/node_modules/.vite/deps/style.js:1:1)',
          '    at http://127.0.0.1:4174/shared/App.styles.ts (http://127.0.0.1:4174/src_main_tsx.js:12:34)',
        ].join('\n'),
      };
    } as unknown as ErrorConstructor;

    const callsite = traceCallsite();

    equal(callsite?.filePath, 'http://127.0.0.1:4174/src_main_tsx.js');
    equal(callsite?.sourceUrl, 'http://127.0.0.1:4174/src_main_tsx.js');
    equal(callsite?.line, 12);
    equal(callsite?.column, 34);
  } finally {
    root.Error = OriginalError;
  }
});

test('dev sheet writes one generated css line per sourcemap rule', () => {
  const document = createFakeDocument();
  const sheet = createDevSheet({
    document: document as unknown as Document,
    sourcemap: true,
  });

  sheet.insert({
    key: 'one',
    css: '.one{min-height:100vh}',
    callsite: { filePath: '/src/styles.ts', line: 7, column: 5 },
  });
  sheet.insert({
    key: 'two',
    css: '.two{background-color:red}',
    callsite: { filePath: '/src/styles.ts', line: 108, column: 5 },
  });
  sheet.flush();

  const tag = document.head.childNodes[1];
  const lines = tag.textContent.split('\n').filter(Boolean);

  includes(lines[0], '@layer css.');
  includes(lines[0], '{.one{min-height:100vh}}');
  includes(lines[1], '@layer css.');
  includes(lines[1], '{.two{background-color:red}}');
  includes(lines[2], 'sourceMappingURL=');
});

test('dev sheet wraps priority rules in generated priority layers', () => {
  const document = createFakeDocument();
  const sheet = createDevSheet({
    document: document as unknown as Document,
    sourcemap: false,
  });

  sheet.updateLayers(['reset', '$layer', 'override']);
  equal(document.head.childNodes[0].textContent, '@layer reset, override;');
  sheet.insert({
    key: 'priority',
    css: '.priority{padding:18px}',
    priority: [2, 0, 0, 0, 0, 0, 2],
  });
  sheet.flush();

  const layerText = document.head.childNodes[0].textContent;
  const ruleText = document.head.childNodes[1].textContent;

  includes(layerText, '@layer reset, css.');
  includes(layerText, ', override;');
  includes(ruleText, '@layer css.');
  includes(ruleText, '{.priority{padding:18px}}');
});

test('dev sort sheet orders priority groups without css layers', () => {
  const document = createFakeDocument();

  configureTestRuntime({ dev: true, css: { layer: false }, priorityMode: 'sort' });

  try {
    const sheet = createDevSheet({
      document: document as unknown as Document,
      maxRules: 1,
      sourcemap: true,
    });

    sheet.updateLayers(['reset', '$layer', 'override']);
    sheet.insert({
      key: 'high',
      css: '.high{color:red}',
      priority: [2, 0, 0, 0, 0, 0, 0],
    });
    sheet.flush();
    sheet.insert({
      key: 'low-one',
      css: '.low-one{color:blue}',
      priority: [0, 0, 0, 0, 0, 0, 0],
      callsite: { filePath: '/src/styles.ts', line: 1, column: 1 },
    });
    sheet.insert({
      key: 'low-two',
      css: '.low-two{color:green}',
      priority: [0, 0, 0, 0, 0, 0, 1],
    });
    sheet.flush();

    const ruleNodes = document.head.childNodes.filter((node: any) =>
      node.getAttribute('data-css-sheet')?.startsWith('rules')
    );

    equal(ruleNodes.length, 3);
    equal(ruleNodes[0].getAttribute('data-css-sheet'), 'rules p-0-0-0-0-0-0-0');
    equal(ruleNodes[1].getAttribute('data-css-sheet'), 'rules p-0-0-0-0-0-0-1');
    equal(ruleNodes[2].getAttribute('data-css-sheet'), 'rules p-2-0-0-0-0-0-0');
    includes(ruleNodes[0].textContent, '.low-one{color:blue}');
    includes(ruleNodes[1].textContent, '.low-two{color:green}');
    includes(ruleNodes[2].textContent, '.high{color:red}');
    equal(ruleNodes[0].textContent.includes('@layer'), false);
    includes(ruleNodes[0].textContent, 'sourceMappingURL=');
  } finally {
    configureTestRuntime({ dev: false, css: { layer: true }, priorityMode: 'layer' });
    setDevRuntimeOptions(null);
  }
});

test('dev sort sheet keeps output layer when layer is enabled', () => {
  const document = createFakeDocument();

  configureTestRuntime({ dev: true, css: { layer: true }, priorityMode: 'sort' });

  try {
    const sheet = createDevSheet({
      document: document as unknown as Document,
      maxRules: 1,
      sourcemap: false,
    });

    sheet.updateLayers(['reset', '$layer', 'override']);
    sheet.insert({
      key: 'high',
      css: '.high{color:red}',
      priority: [2, 0, 0, 0, 0, 0, 0],
    });
    sheet.flush();
    sheet.insert({
      key: 'low',
      css: '.low{color:blue}',
      priority: [0, 0, 0, 0, 0, 0, 0],
    });
    sheet.flush();

    equal(document.head.childNodes.length, 3);
    equal(document.head.childNodes[0].getAttribute('data-css-sheet'), 'layers');
    equal(document.head.childNodes[0].textContent, '@layer reset, css, override;');
    equal(document.head.childNodes[1].getAttribute('data-css-sheet'), 'rules p-0-0-0-0-0-0-0');
    equal(document.head.childNodes[2].getAttribute('data-css-sheet'), 'rules p-2-0-0-0-0-0-0');
    includes(document.head.childNodes[1].textContent, '@layer css {\n.low{color:blue}\n}');
    includes(document.head.childNodes[2].textContent, '@layer css {\n.high{color:red}\n}');
  } finally {
    configureTestRuntime({ dev: false, css: { layer: true }, priorityMode: 'layer' });
    setDevRuntimeOptions(null);
  }
});

test('dev priority mode command rebuilds existing style tags', () => {
  const document = createFakeDocument();
  const root = globalThis as typeof globalThis & {
    window?: Window & typeof globalThis & Record<string, unknown>;
  };
  const previousWindow = root.window;

  try {
    root.window = {} as Window & typeof globalThis & Record<string, unknown>;
    configureTestRuntime({
      dev: true,
      css: { layer: true },
      priorityMode: 'layer',
    });
    enableStyleDevUtils({ name: 'CssDevUtils' });

    const sheet = createDevSheet({
      document: document as unknown as Document,
      sourcemap: false,
    });
    const utils = root.window.CssDevUtils as {
      setPriorityMode?: {
        toLayer?: () => null;
        toSort?: () => null;
      };
    };

    sheet.updateLayers(['$layer']);
    sheet.insert({
      key: 'low',
      css: '.low{color:blue}',
      priority: [0, 0, 0, 0, 0, 0, 0],
    });
    sheet.insert({
      key: 'high',
      css: '.high{color:red}',
      priority: [2, 0, 0, 0, 0, 0, 0],
    });
    sheet.flush();

    includes(document.head.textContent, '@layer css.');
    equal(utils.setPriorityMode?.toSort?.(), null);
    includes(document.head.textContent, '@layer css');
    includes(document.head.textContent, '.low{color:blue}');
    includes(document.head.textContent, '.high{color:red}');

    equal(utils.setPriorityMode?.toLayer?.(), null);
    includes(document.head.textContent, '@layer css.');
    includes(document.head.textContent, '.low{color:blue}');
    includes(document.head.textContent, '.high{color:red}');
  } finally {
    configureTestRuntime({ dev: false, css: { layer: true }, priorityMode: 'layer' });
    setDevRuntimeOptions(null);
    root.window = previousWindow;
  }
});

test('dev sheet registries are shared across duplicate module instances', async () => {
  const runtimeDevPath = '../sheet/dev/index.ts?runtime-copy';
  const commandDevPath = '../sheet/dev/index.ts?command-copy';
  const runtimeDev = await import(runtimeDevPath) as typeof import('../sheet/dev');
  const commandDev = await import(commandDevPath) as typeof import('../sheet/dev');
  const document = createFakeDocument();

  try {
    configureTestRuntime({
      dev: true,
      css: { layer: true },
      priorityMode: 'layer',
      sourcemapMode: 'style',
    });

    const sheet = runtimeDev.createDevSheet({
      document: document as unknown as Document,
      sourcemap: true,
    });

    sheet.updateLayers(['$layer']);
    sheet.insert({
      key: 'trace',
      css: '.trace{color:red}',
      priority: [1, 0, 0, 0, 0, 0, 0],
      debug: {
        $$debug: true,
        loc: [1, 1],
        label: ['', '', ''],
        sourceUrl: '/src/styles.ts',
        fields: {
          color: {
            0: [20, 5],
            1: [8, 3],
          },
        },
      },
      debugField: 'color',
    });
    sheet.flush();

    includes(document.head.textContent, '@layer css.');
    const styleTraceText = document.head.textContent;

    configureTestRuntime({
      dev: true,
      css: { layer: true },
      priorityMode: 'layer',
      sourcemapMode: 'value',
    });
    commandDev.refreshDevSourcemapTags();

    equal(document.head.textContent === styleTraceText, false);
    includes(document.head.textContent, '@layer css.');

    configureTestRuntime({
      dev: true,
      css: { layer: true },
      priorityMode: 'sort',
      sourcemapMode: 'value',
    });
    commandDev.refreshDevStyleTags();

    includes(document.head.textContent, '@layer css');
    includes(document.head.textContent, '.trace{color:red}');
  } finally {
    configureTestRuntime({
      dev: false,
      css: { layer: true },
      priorityMode: 'layer',
      sourcemapMode: 'style',
    });
    setDevRuntimeOptions(null);
  }
});

test('dev utils installs plugin controls on window target', () => {
  const root = globalThis as typeof globalThis & {
    window?: Window & typeof globalThis & Record<string, unknown>;
  };
  const previousWindow = root.window;

  try {
    root.window = {} as Window & typeof globalThis & Record<string, unknown>;
    configureTestRuntime({ dev: true });
    setBuildMeta({
      dev: true,
      extract: false,
      hoist: false,
      rsc: false,
      css: null,
    });
    enableStyleDevUtils({ name: 'CssDevUtils' });

    const utils = root.window.CssDevUtils as {
      usage?: () => null;
      info?: () => null;
      reset?: () => null;
      traceSourcemap?: unknown;
      startupMessage?: { on?: unknown; off?: unknown; };
      setElementMarker?: { toOn?: unknown; toOff?: unknown; };
      setSourcemapMode?: { toStyle?: unknown; toValue?: unknown; };
      setPriorityMode?: { toLayer?: unknown; toSort?: unknown; };
    };

    equal(Object.getPrototypeOf(utils), null);
    equal(Object.getPrototypeOf(utils.startupMessage), null);
    equal(Object.getPrototypeOf(utils.setElementMarker), null);
    equal(Object.getPrototypeOf(utils.setPriorityMode), null);
    equal(Object.getPrototypeOf(utils.setSourcemapMode), null);
    equal(typeof utils.usage, 'function');
    equal(typeof utils.info, 'function');
    equal(typeof utils.reset, 'function');
    equal(typeof utils.traceSourcemap, 'undefined');
    equal(typeof utils.startupMessage?.on, 'function');
    equal(typeof utils.startupMessage?.off, 'function');
    equal(typeof utils.setElementMarker?.toOn, 'function');
    equal(typeof utils.setElementMarker?.toOff, 'function');
    equal(typeof utils.setSourcemapMode?.toStyle, 'function');
    equal(typeof utils.setSourcemapMode?.toValue, 'function');
    equal(typeof utils.setPriorityMode?.toLayer, 'function');
    equal(typeof utils.setPriorityMode?.toSort, 'function');
    equal(utils.usage?.(), null);
    equal(utils.info?.(), null);
  } finally {
    configureTestRuntime({ dev: false });
    setDevRuntimeOptions(null);
    root.window = previousWindow;
  }
});

test('dev utils enables runtime sourcemap trace on window target without plugin', () => {
  const root = globalThis as typeof globalThis & {
    window?: Window & typeof globalThis & Record<string, unknown>;
  };
  const previousWindow = root.window;

  try {
    root.window = {} as Window & typeof globalThis & Record<string, unknown>;
    setBuildMeta(null);
    configureTestRuntime({ dev: true });
    enableStyleDevUtils({ name: 'CssDevUtils' });

    const utils = root.window.CssDevUtils as {
      traceSourcemap?: unknown;
      setSourcemapMode?: { toStyle?: unknown; toValue?: unknown; };
    };

    equal(typeof utils.traceSourcemap, 'function');
    equal(typeof utils.setSourcemapMode?.toStyle, 'undefined');
    equal(typeof utils.setSourcemapMode?.toValue, 'undefined');
  } finally {
    configureTestRuntime({ dev: false });
    setDevRuntimeOptions(null);
    root.window = previousWindow;
  }
});

test('enableStyleDevUtils works without a window global', () => {
  const root = globalThis as unknown as Record<string, unknown> & {
    CssDevUtils?: {
      usage?: () => null;
      info?: () => null;
      reset?: () => null;
      traceSourcemap?: unknown;
      startupMessage?: { on?: unknown; off?: unknown; };
      setElementMarker?: { toOn?: unknown; toOff?: unknown; };
      setSourcemapMode?: { toStyle?: unknown; toValue?: unknown; };
      setPriorityMode?: { toLayer?: unknown; toSort?: unknown; };
    };
    window?: Window & typeof globalThis;
  };
  const previousWindow = root.window;
  const previousUtils = root.CssDevUtils;

  try {
    setBuildMeta(null);
    delete (root as { window?: unknown; }).window;
    delete (root as { CssDevUtils?: unknown; }).CssDevUtils;
    configureTestRuntime({ dev: true });

    enableStyleDevUtils({ name: 'CssDevUtils' });

    const utils = root.CssDevUtils;
    equal(Object.getPrototypeOf(utils), null);
    equal(Object.getPrototypeOf(utils?.startupMessage), null);
    equal(Object.getPrototypeOf(utils?.setElementMarker), null);
    equal(Object.getPrototypeOf(utils?.setPriorityMode), null);
    equal(typeof utils?.usage, 'function');
    equal(typeof utils?.info, 'function');
    equal(typeof utils?.reset, 'function');
    equal(typeof utils?.traceSourcemap, 'function');
    equal(typeof utils?.startupMessage?.on, 'function');
    equal(typeof utils?.startupMessage?.off, 'function');
    equal(typeof utils?.setElementMarker?.toOn, 'function');
    equal(typeof utils?.setElementMarker?.toOff, 'function');
    equal(typeof utils?.setSourcemapMode?.toStyle, 'undefined');
    equal(typeof utils?.setSourcemapMode?.toValue, 'undefined');
    equal(typeof utils?.setPriorityMode?.toLayer, 'function');
    equal(typeof utils?.setPriorityMode?.toSort, 'function');
    equal(utils?.usage?.(), null);
    equal(utils?.info?.(), null);
  } finally {
    configureTestRuntime({ dev: false });
    setDevRuntimeOptions(null);
    root.window = previousWindow;
    root.CssDevUtils = previousUtils;
  }
});

test('style dev utils preserves build dev mode', () => {
  const root = globalThis as typeof globalThis & {
    localStorage?: Storage;
    window?: Window & typeof globalThis;
  };
  const previousStorage = root.localStorage;
  const previousWindow = root.window;
  const previousDevConfig = { ...DEV_CONFIG };
  const previousIsDev = IS_DEV.isDev;

  try {
    root.localStorage = createFakeStorage({
      '@fluentic/style.dev.priorityMode': 'sort',
    }) as unknown as Storage;
    delete (root as { window?: unknown; }).window;

    setBuildDevConfig({
      checkSelector: true,
      elementClassName: true,
      priorityMode: 'layer',
      sourcemapMode: 'style',
    });

    enableStyleDevUtils({ name: 'CssDevUtils', silent: true });

    equal(DEV_CONFIG.isDev, true);
  } finally {
    setDevUtilsRuntimeOptions(null);
    setDevRuntimeOptions({
      checkSelector: previousDevConfig.isCheckSelectorEnabled,
      elementClassName: previousDevConfig.isElementClassNameEnabled,
      priorityMode: previousDevConfig.stylePriorityMode,
      sourcemapMode: previousDevConfig.sourcemapLocationMode,
    });
    IS_DEV.isDev = previousIsDev;
    DEV_CONFIG.isDev = previousIsDev;
    root.localStorage = previousStorage;
    root.window = previousWindow;
  }
});

test('style dev utils saves local debug preferences automatically', () => {
  const root = globalThis as typeof globalThis & {
    window?: Window & typeof globalThis & Record<string, unknown>;
    localStorage?: Storage;
  };
  const previousWindow = root.window;
  const previousStorage = root.localStorage;
  const storage = createFakeStorage();

  try {
    root.window = {} as Window & typeof globalThis & Record<string, unknown>;
    root.localStorage = storage as Storage;
    configureTestRuntime({
      dev: true,
      css: { layer: true },
      priorityMode: 'layer',
      sourcemapMode: 'style',
    });
    setBuildMeta({
      dev: true,
      extract: false,
      hoist: false,
      rsc: false,
      layer: true,
      priorityMode: 'layer',
      sourcemapTrace: 'style',
      css: null,
    });

    enableStyleDevUtils({ name: 'CssDevUtils', silent: true });

    const utils = root.window.CssDevUtils as {
      reset?: () => null;
      startupMessage?: { on?: () => null; off?: () => null; };
      setElementMarker?: { toOff?: () => null; };
      setPriorityMode?: { toSort?: () => null; };
      setSourcemapMode?: { toValue?: () => null; };
    };

    equal(utils.setPriorityMode?.toSort?.(), null);
    equal(utils.setSourcemapMode?.toValue?.(), null);
    equal(utils.setElementMarker?.toOff?.(), null);
    equal(storage.getItem('@fluentic/style.dev.priorityMode'), 'sort');
    equal(storage.getItem('@fluentic/style.dev.sourcemapTrace'), 'value');
    equal(storage.getItem('@fluentic/style.dev.elementMarker'), 'false');

    configureTestRuntime({
      dev: true,
      css: {
        layer: true,
      },
    });

    setDevRuntimeOptions({ elementClassName: true });
    enableStyleDevUtils({ name: 'CssDevUtils', silent: true });

    equal(storage.getItem('@fluentic/style.dev.priorityMode'), 'sort');
    equal(storage.getItem('@fluentic/style.dev.sourcemapTrace'), 'value');
    equal(storage.getItem('@fluentic/style.dev.elementMarker'), 'false');
    equal(utils.startupMessage?.off?.(), null);
    equal(storage.getItem('@fluentic/style.dev.startupMessage'), 'off');
    equal(utils.startupMessage?.on?.(), null);
    equal(storage.getItem('@fluentic/style.dev.startupMessage'), null);
    equal(utils.reset?.(), null);
    equal(storage.getItem('@fluentic/style.dev.priorityMode'), null);
    equal(storage.getItem('@fluentic/style.dev.sourcemapTrace'), null);
    equal(storage.getItem('@fluentic/style.dev.elementMarker'), null);
  } finally {
    configureTestRuntime({
      dev: false,
      css: { layer: true },
      priorityMode: 'layer',
      sourcemapMode: 'style',
    });
    setDevRuntimeOptions(null);
    setBuildMeta(null);
    root.window = previousWindow;
    root.localStorage = previousStorage;
  }
});

test('style dev utils startup logs current saved debug info', () => {
  const root = globalThis as typeof globalThis & {
    window?: Window & typeof globalThis & Record<string, unknown>;
    localStorage?: Storage;
  };
  const previousWindow = root.window;
  const previousStorage = root.localStorage;
  const storage = createFakeStorage();

  try {
    setBuildMeta({
      dev: true,
      extract: false,
      hoist: false,
      rsc: false,
      layer: true,
      priorityMode: 'layer',
      sourcemapTrace: 'style',
      css: null,
    });
    root.window = {} as Window & typeof globalThis & Record<string, unknown>;
    root.localStorage = storage as Storage;
    storage.setItem('@fluentic/style.dev.priorityMode', 'sort');
    storage.setItem('@fluentic/style.dev.sourcemapTrace', 'value');
    storage.setItem('@fluentic/style.dev.elementMarker', 'false');
    configureTestRuntime({
      dev: true,
      css: { layer: true },
      priorityMode: 'layer',
      sourcemapMode: 'style',
    });

    const calls = captureConsoleLogs(() => {
      enableStyleDevUtils({ name: 'CssDevUtils' });
    });
    const startup = calls.find((call) => call.method === 'groupCollapsed')?.args[0] ?? '';
    const logRows = calls.filter((call) => call.method === 'log').map((call) => call.args[0]);

    includes(startup, '[CssDevUtils]');
    includes(startup, 'priority=%csort%c sourcemap=%cvalue');
    includes(startup, 'marker=%coff');
    includes(startup, 'For usage run');
    includes(startup, 'CssDevUtils.usage()');
    includes(logRows[0], 'Priority');
    includes(logRows[1], 'Sourcemap');
    includes(logRows[1], 'Sourcemap   %cvalue%c');
    includes(logRows[2], 'ClassNames');
    includes(logRows[3], 'ElementMark');
    includes(logRows[3], 'ElementMark %coff%c');
    const cssRow = logRows.find((row) => row.includes('CSS')) ?? '';
    includes(cssRow, 'CSS');
    includes(cssRow, 'Sorted rules are wrapped in the configured CSS layer.');
    equal(logRows.some((row) => row.includes('Runtime')), true);
    equal(logRows.some((row) => row.includes('Plugin')), true);
    equal(logRows.some((row) => row.includes('Startup')), false);
    equal(logRows.some((row) => row.includes('Checks')), false);
  } finally {
    configureTestRuntime({
      dev: false,
      css: { layer: true },
      priorityMode: 'layer',
      sourcemapMode: 'style',
    });
    setDevRuntimeOptions(null);
    setBuildMeta(null);
    root.window = previousWindow;
    root.localStorage = previousStorage;
  }
});

test('dev trace remaps runtime css sourcemaps through generated file sourcemap', async () => {
  const document = createFakeDocument();
  const sheet = createDevSheet({
    document: document as unknown as Document,
    sourcemap: true,
  });

  sheet.insert({
    key: 'one',
    css: '.one{color:red}',
    callsite: {
      filePath: '/assets/app.js?t=123',
      sourceUrl: 'http://localhost/assets/app.js?t=123',
      line: 1,
      column: 1,
    },
  });
  sheet.flush();

  const tag = document.head.childNodes[1];
  const sourceMap = {
    version: 3,
    sources: ['../src/styles.ts'],
    sourcesContent: ['export const styles = style({ color: "red" });'],
    names: [],
    mappings: 'AAAA',
  };
  const fetcher = async (url: string) => {
    if (url === 'http://localhost/assets/app.js') {
      return createFetchResponse('console.log("x");\n//# sourceMappingURL=app.js.map');
    }

    if (url === 'http://localhost/assets/app.js.map') {
      return createFetchResponse(JSON.stringify(sourceMap));
    }

    return createFetchResponse('', false);
  };

  const result = await withBrowserWindow('http://localhost/', fetcher, () => traceDevSourcemaps());
  const map = getInlineSourceMap(tag.textContent);

  equal(result.tags > 0, true);
  equal(result.remapped, 1);
  equal(result.sourcemaps[0], 'http://localhost/assets/app.js.map');
  equal(map.sources[0], 'source:///src/styles.ts');
  equal(map.sourcesContent?.[0], 'export const styles = style({ color: "red" });');
});

test('dev trace resolves inline source maps relative to generated file url', async () => {
  const document = createFakeDocument();
  const sheet = createDevSheet({
    document: document as unknown as Document,
    sourcemap: true,
  });

  sheet.insert({
    key: 'one',
    css: '.one{color:red}',
    callsite: {
      filePath: '/assets/app.js?t=123',
      sourceUrl: 'http://localhost/assets/app.js?t=123',
      line: 1,
      column: 1,
    },
  });
  sheet.flush();

  const tag = document.head.childNodes[1];
  const sourceMap = {
    version: 3,
    sources: ['../src/styles.ts'],
    sourcesContent: ['export const styles = style({ color: "red" });'],
    names: [],
    mappings: 'AAAA',
  };
  const inlineSourceMap = 'data:application/json;charset=utf-8,' +
    encodeURIComponent(JSON.stringify(sourceMap));
  const fetcher = async (url: string) => {
    if (url === 'http://localhost/assets/app.js') {
      return createFetchResponse('console.log("x");\n//# sourceMappingURL=' + inlineSourceMap);
    }

    return createFetchResponse('', false);
  };

  const result = await withBrowserWindow('http://localhost/', fetcher, () => traceDevSourcemaps());
  const map = getInlineSourceMap(tag.textContent);

  equal(result.remapped, 1);
  equal(map.sources[0], 'source:///src/styles.ts');
  equal(map.sourcesContent?.[0], 'export const styles = style({ color: "red" });');
});

test('dev trace uses source protocol without embedded source content', async () => {
  const document = createFakeDocument();
  const sheet = createDevSheet({
    document: document as unknown as Document,
    sourcemap: true,
  });

  sheet.insert({
    key: 'one',
    css: '.one{color:red}',
    callsite: {
      filePath: '/assets/app.js?t=123',
      sourceUrl: 'http://localhost/assets/app.js?t=123',
      line: 1,
      column: 1,
    },
  });
  sheet.flush();

  const tag = document.head.childNodes[1];
  const sourceMap = {
    version: 3,
    sources: ['../src/styles.ts'],
    names: [],
    mappings: 'AAAA',
  };
  const fetcher = async (url: string) => {
    if (url === 'http://localhost/assets/app.js') {
      return createFetchResponse('console.log("x");\n//# sourceMappingURL=app.js.map');
    }

    if (url === 'http://localhost/assets/app.js.map') {
      return createFetchResponse(JSON.stringify(sourceMap));
    }

    return createFetchResponse('', false);
  };

  const result = await withBrowserWindow('http://localhost/', fetcher, () => traceDevSourcemaps());
  const map = getInlineSourceMap(tag.textContent);

  equal(result.remapped, 1);
  equal(map.sources[0], 'source:///src/styles.ts');
  equal(map.sourcesContent, undefined);
});

test('dev trace uses source protocol when generated sourcemap is unresolved', async () => {
  const document = createFakeDocument();
  const sheet = createDevSheet({
    document: document as unknown as Document,
    sourcemap: true,
  });

  sheet.insert({
    key: 'one',
    css: '.one{color:red}',
    callsite: {
      filePath: '/assets/app.js?t=123',
      sourceUrl: 'http://localhost/assets/app.js?t=123',
      line: 3,
      column: 7,
    },
  });
  sheet.flush();

  const tag = document.head.childNodes[1];
  const fetcher = async () => createFetchResponse('', false);

  const result = await withBrowserWindow('http://localhost/', fetcher, () => traceDevSourcemaps());
  const map = getInlineSourceMap(tag.textContent);

  equal(result.remapped, 0);
  equal(result.unresolved > 0, true);
  equal(map.sources[0], 'source:///assets/app.js');
});

test('dev trace cleans malformed source protocol stack prefixes', async () => {
  const document = createFakeDocument();
  const sheet = createDevSheet({
    document: document as unknown as Document,
    sourcemap: true,
  });

  sheet.insert({
    key: 'one',
    css: '.one{color:red}',
    callsite: {
      filePath: 'source:///at http://localhost:5173/src/styles.ts',
      sourceUrl: 'source:///at http://localhost:5173/src/styles.ts',
      line: 3,
      column: 7,
    },
  });
  sheet.flush();

  const tag = document.head.childNodes[1];

  await withBrowserWindow(
    'http://localhost:5173/',
    async () => createFetchResponse('', false),
    () => traceDevSourcemaps(),
  );
  const map = getInlineSourceMap(tag.textContent);

  equal(map.sources[0], 'source:///src/styles.ts');
});

test('dev trace can fetch vite querystring generated module urls', async () => {
  const document = createFakeDocument();
  const sheet = createDevSheet({
    document: document as unknown as Document,
    sourcemap: true,
  });

  sheet.insert({
    key: 'one',
    css: '.one{color:red}',
    callsite: {
      filePath: 'http://localhost/src/styles.tsx',
      sourceUrl: 'http://localhost/src/styles.tsx?t=123',
      line: 1,
      column: 1,
    },
  });
  sheet.flush();

  const tag = document.head.childNodes[1];
  const sourceMap = {
    version: 3,
    sources: ['styles.tsx'],
    sourcesContent: ['export const styles = style({ color: "red" });'],
    names: [],
    mappings: 'AAAA',
  };
  const fetcher = async (url: string) => {
    if (url === 'http://localhost/src/styles.tsx?t=123') {
      return createFetchResponse(
        'console.log("x");\n//# sourceMappingURL=data:application/json;charset=utf-8,' +
          encodeURIComponent(JSON.stringify(sourceMap)),
      );
    }

    return createFetchResponse('', false);
  };

  const result = await withBrowserWindow('http://localhost/', fetcher, () => traceDevSourcemaps());
  const map = getInlineSourceMap(tag.textContent);

  equal(result.remapped, 1);
  equal(map.sources[0], 'source:///src/styles.tsx');
  equal(map.sourcesContent?.[0], 'export const styles = style({ color: "red" });');
});

test('dev trace keeps querystring sourcemap fetches separate from queryless misses', async () => {
  const document = createFakeDocument();
  const sheet = createDevSheet({
    document: document as unknown as Document,
    sourcemap: true,
  });

  sheet.insert({
    key: 'one',
    css: '.one{color:red}',
    callsite: {
      filePath: 'http://localhost/src/styles.tsx',
      sourceUrl: 'http://localhost/src/styles.tsx',
      line: 1,
      column: 1,
    },
  });
  sheet.insert({
    key: 'two',
    css: '.two{color:blue}',
    callsite: {
      filePath: 'http://localhost/src/styles.tsx',
      sourceUrl: 'http://localhost/src/styles.tsx?t=123',
      line: 1,
      column: 1,
    },
  });
  sheet.flush();

  const tag = document.head.childNodes[1];
  const sourceMap = {
    version: 3,
    sources: ['styles.tsx'],
    sourcesContent: ['export const styles = style({ color: "blue" });'],
    names: [],
    mappings: 'AAAA',
  };
  const fetcher = async (url: string) => {
    if (url === 'http://localhost/src/styles.tsx?t=123') {
      return createFetchResponse(
        'console.log("x");\n//# sourceMappingURL=data:application/json;charset=utf-8,' +
          encodeURIComponent(JSON.stringify(sourceMap)),
      );
    }

    return createFetchResponse('', false);
  };

  const result = await withBrowserWindow('http://localhost/', fetcher, () => traceDevSourcemaps());
  const map = getInlineSourceMap(tag.textContent);

  equal(result.remapped, 1);
  equal(result.unresolved > 0, true);
  equal(map.sources[0], 'source:///src/styles.tsx');
  equal(map.sourcesContent?.[0], 'export const styles = style({ color: "blue" });');
});

test('dev sheet ignores duplicate keys', () => {
  setDevUtilsRuntimeOptions(null);
  configureTestRuntime({ dev: true, css: { layer: true }, priorityMode: 'layer' });

  const document = createFakeDocument();
  const sheet = createDevSheet({
    document: document as unknown as Document,
    maxRules: 10,
    sourcemap: false,
  });

  sheet.insert({ key: 'same', css: '.one{color:red}' });
  sheet.insert({ key: 'same', css: '.two{color:blue}' });
  sheet.flush();

  includes(document.head.childNodes[1].textContent, '@layer css.');
  includes(document.head.childNodes[1].textContent, '{.one{color:red}}');
});

test('prod sheet uses a layer tag and insertRule tag', () => {
  const document = createFakeDocument();
  const sheet = createProdSheet({
    document: document as unknown as Document,
  });

  sheet.updateLayers(['a']);
  sheet.insert({ key: 'one', css: '.one{color:red}' });
  sheet.insert({ key: 'one', css: '.one{color:blue}' });
  sheet.flush();

  equal(document.head.childNodes.length, 2);
  equal(document.head.childNodes[0].getAttribute('data-css-sheet'), 'layers');
  equal(document.head.childNodes[1].getAttribute('data-css-sheet'), 'rules');
  equal(document.head.childNodes[0].textContent, '@layer a;');
  equal(document.head.childNodes[1].sheet.cssRules.length, 1);
  includes(document.head.childNodes[1].sheet.cssRules[0], '@layer css.');
  includes(document.head.childNodes[1].sheet.cssRules[0], '{.one{color:red}}');
});

test('prod sheet creates rule tag lazily', () => {
  const document = createFakeDocument();
  const sheet = createProdSheet({
    document: document as unknown as Document,
  });

  sheet.updateLayers(['a']);
  sheet.flush();

  equal(document.head.childNodes.length, 1);
  equal(document.head.childNodes[0].getAttribute('data-css-sheet'), 'layers');
  equal(document.head.childNodes[0].textContent, '@layer a;');
});

test('prod sheet does not create tags until used', () => {
  const document = createFakeDocument();

  createProdSheet({
    document: document as unknown as Document,
  });

  equal(document.head.childNodes.length, 0);
});
