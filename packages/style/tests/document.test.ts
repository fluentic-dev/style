import { BUILD_CONFIG } from '../config/build';
import { configureStyleRuntime } from '../config/configure';
import { getRuntimeDocument } from '../config/document';
import { createGlobalSheet } from '../css/globalSheet';
import { createStyleTarget } from '../css/styleTarget';
import { insertElementMarkerSheetRule } from '../runtime/core/elementMarker';
import {
  configureTestRuntime,
  createFakeDocument,
  createSheet,
  createToken,
  equal,
  getClassName,
  getGlobalSheet,
  setBuildMeta,
  setGlobalSheet,
  style,
  test,
} from './setup';

test('development entry preserves global rules injected before initialization', async () => {
  const previousSheet = getGlobalSheet();
  const document = createFakeDocument();
  try {
    configureTestRuntime({ dev: true });
    configureStyleRuntime({ document: document as unknown as Document });
    createGlobalSheet([style.selector('body', { fontFamily: 'Inter, sans-serif' })]);
    const sheet = getGlobalSheet();

    await import('../entry/dev/sheet');

    equal(getGlobalSheet(), sheet);
  } finally {
    configureStyleRuntime({ document: true });
    configureTestRuntime();
    setGlobalSheet(previousSheet);
  }
});

test('disabled injection preserves explicit style target updates and cleanup with plugin configuration', () => {
  const previousBuild = BUILD_CONFIG.current;
  const classes = new Set<string>();
  const values = new Map<string, string>();
  const element = {
    classList: { add: (name: string) => classes.add(name), remove: (name: string) => classes.delete(name) },
    style: {
      getPropertyValue: (name: string) => values.get(name) ?? '',
      setProperty: (name: string, value: string) => values.set(name, value),
      removeProperty: (name: string) => values.delete(name),
    },
  } as unknown as Element;
  const target = createStyleTarget();
  try {
    BUILD_CONFIG.current = { hoist: false, css: {} };
    setBuildMeta({ dev: false, extract: false, hoist: false, rsc: false, css: null });
    configureStyleRuntime({ document: false });
    const color = createToken('blue');
    target.apply(element, createSheet([color('red'), style.selector('&', { color })]));
    equal(classes.size > 0, true);
    equal([...values.values()].includes('red'), true);
    target.destroy();
    equal(classes.size, 0);
    equal(values.size, 0);
  } finally {
    BUILD_CONFIG.current = previousBuild;
    target.destroy();
    configureStyleRuntime({ document: true });
    setBuildMeta({ dev: false, extract: false, hoist: false, rsc: false, css: null });
  }
});

test('runtime document controls injection and reinserts cached styles after switching', () => {
  const previousSheet = getGlobalSheet();
  const first = createFakeDocument();
  const second = createFakeDocument();
  const css = style({ color: 'rebeccapurple' });

  try {
    for (const dev of [false, true]) {
      configureTestRuntime({ dev });
      configureStyleRuntime({ document: first as unknown as Document });
      const result = getClassName(css);
      equal(first.head.childNodes.length > 0, true);
      const active = getGlobalSheet();
      configureStyleRuntime({ document: first as unknown as Document });
      equal(getGlobalSheet(), active);

      configureStyleRuntime({ document: false });
      equal(first.head.childNodes.length, 0);
      equal(getClassName(css).className, result.className);
      configureStyleRuntime({ cacheTTL: false });
      equal(getRuntimeDocument(), null);
      insertElementMarkerSheetRule({ key: 'element-marker:test', css: '.test{}' }, first as unknown as Document);
      equal(first.head.childNodes.length, 0);

      configureStyleRuntime({ document: second as unknown as Document });
      equal(getClassName(css).className, result.className);
      equal(second.head.childNodes.length > 0, true);
      equal(first.head.childNodes.length, 0);
      configureStyleRuntime({ document: false });
      equal(second.head.childNodes.length, 0);
    }
  } finally {
    configureStyleRuntime({ document: true });
    configureTestRuntime();
    setGlobalSheet(previousSheet);
  }
});

test('automatic document selection recovers after rendering without a DOM', () => {
  const previousDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const previousSheet = getGlobalSheet();
  const document = createFakeDocument();
  const css = style({ color: 'orange' });
  try {
    Object.defineProperty(globalThis, 'document', { configurable: true, value: undefined });
    configureStyleRuntime({ document: false });
    configureStyleRuntime({ document: true });
    const result = getClassName(css);
    Object.defineProperty(globalThis, 'document', { configurable: true, value: document });
    equal(getClassName(css).className, result.className);
    equal(document.head.childNodes.length > 0, true);
    configureStyleRuntime({ document: false });
    equal(document.head.childNodes.length, 0);
  } finally {
    if (previousDocument) Object.defineProperty(globalThis, 'document', previousDocument);
    else Reflect.deleteProperty(globalThis, 'document');
    configureStyleRuntime({ document: true });
    setGlobalSheet(previousSheet);
  }
});

test('debug marker sheets follow the configured document', () => {
  const first = createFakeDocument();
  const second = createFakeDocument();
  try {
    configureStyleRuntime({ document: first as unknown as Document });
    insertElementMarkerSheetRule({ key: 'element-marker:test', css: '.test{}' });
    equal(first.head.childNodes.length > 0, true);
    configureStyleRuntime({ document: second as unknown as Document });
    equal(first.head.childNodes.length, 0);
    insertElementMarkerSheetRule({ key: 'element-marker:test', css: '.test{}' });
    equal(second.head.childNodes.length > 0, true);
    configureStyleRuntime({ document: false });
    equal(second.head.childNodes.length, 0);
  } finally {
    configureStyleRuntime({ document: true });
  }
});
