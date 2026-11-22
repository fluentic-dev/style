import { buildGlobalSheetRules } from '../css/globalSheet';
import { refreshDevStyleTags } from '../sheet/dev';
import { serializeOrderedRules } from '../sheet/ordering';
import type { SheetRule } from '../sheet/types';
import {
  configureTestRuntime,
  createCompiler,
  createDevSheet,
  createFakeDocument,
  createProdSheet,
  createRscStylePayload,
  createSheet,
  deepEqual,
  equal,
  getSheetRules,
  includes,
  notIncludes,
  parseRscStylePayload,
  style,
  test,
} from './setup';

const priority = (weight: number): SheetRule['priority'] => [weight, 0, 0, 0, 0, 0, 0];
function assertOrder(css: string, selectors: string[]) {
  let position = -1;
  for (const selector of selectors) {
    const next = css.indexOf(selector + '{');
    if (next <= position) throw new Error(`expected ${selectors.join(' < ')} in ${css}`);
    position = next;
  }
}
function global(id: string, order: number, suffix = ''): SheetRule {
  return {
    key: id + suffix,
    css: '.' + id + suffix + '{color:red}',
    layer: false,
    sheet: true,
    globalSheet: { id, order },
  };
}

for (const mode of ['sort', 'layer', 'prod'] as const) {
  test(`whole global sheet order and stable discovery survive late inserts and HMR (${mode})`, () => {
    configureTestRuntime({
      dev: mode !== 'prod',
      priorityMode: mode === 'prod' ? 'layer' : mode,
      css: { layer: false },
    });
    const document = createFakeDocument();
    const sheet = (mode === 'prod' ? createProdSheet : createDevSheet)({
      document: document as never,
      tagName: 'ordering-test',
      sourcemap: false,
    });
    const read = () =>
      document.head.childNodes.map((tag: any) =>
        tag.textContent + (mode === 'prod' ? tag.sheet?.cssRules.join('\n') ?? '' : '')
      ).join('\n');
    try {
      sheet.insert(global('positive', 2));
      sheet.insert({ key: 'local', css: '.local{color:red}', layer: false, sheet: true, priority: priority(-10) });
      sheet.insert({ key: 'regular', css: '.regular{color:red}', layer: false, priority: priority(10) });
      sheet.insert(global('first', 0));
      sheet.flush();
      sheet.insert(global('second', 0));
      sheet.insert(global('negative', -3));
      sheet.insert(global('first', 0, 'More'));
      sheet.flush();
      assertOrder(read(), ['.negative', '.first', '.firstMore', '.second', '.regular', '.local', '.positive']);
      if (mode !== 'prod') {
        refreshDevStyleTags();
        assertOrder(read(), ['.negative', '.first', '.firstMore', '.second', '.regular', '.local', '.positive']);
      }
      sheet.replaceRules!('module', [global('hmr', -1)]);
      assertOrder(read(), ['.negative', '.hmr', '.first', '.second', '.regular', '.local', '.positive']);
      sheet.replaceRules!('module', [global('hmr', 3)]);
      assertOrder(read(), ['.negative', '.first', '.second', '.regular', '.local', '.positive', '.hmr']);
      sheet.replaceRules!('module', []);
      notIncludes(read(), '.hmr{');
    } finally {
      sheet.destroy?.();
      configureTestRuntime();
    }
  });
}

test('global sheet IDs distinguish calls and serialized transport keeps ordering metadata', () => {
  const a = buildGlobalSheetRules({ order: -2 }, [style.selector('body', { margin: 0 })]);
  const b = buildGlobalSheetRules({ order: 3 }, [style.selector('html', { margin: 0 })]);
  if (a[0].globalSheet.id === b[0].globalSheet.id) throw new Error('different global calls share an ID');
  deepEqual(
    parseRscStylePayload(createRscStylePayload(a)).map(({ globalSheet, sheet }) => ({ globalSheet, sheet })),
    a.map(({ globalSheet, sheet }) => ({ globalSheet, sheet })),
  );
});

test('local specificity defaults to one and accepts zero and repeated classes', () => {
  for (const specificity of [undefined, 0, 1, 2]) {
    const rule = getSheetRules(createSheet({ specificity }, [style.selector('.item', { color: 'red' })]))[0];
    const className = rule.key;
    includes(
      rule.css,
      (specificity === 0 ? `:where(.${className})` : `.${className}`.repeat(specificity ?? 1)) + ' .item{',
    );
  }
});

test('sheet layer resolution and managed important are shared by runtime, seeds, and extraction', () => {
  for (const enabled of [true, false]) {
    configureTestRuntime({ css: { layer: enabled, layerNamespace: 'app' } });
    try {
      for (const layer of [undefined, false, true, '.forms', 'vendor'] as const) {
        const expected = layer === true
          ? enabled ? 'app' : null
          : typeof layer === 'string'
          ? layer.startsWith('.') ? enabled ? 'app.forms' : 'forms' : layer
          : null;
        const rules = getSheetRules(createSheet({ layer }, [style.selector('.item', {
          color: style.important('red'),
          backgroundColor: style.important('blue', true),
        })]));
        const css = serializeOrderedRules(rules);
        if (expected) {
          includes(css, `@layer ${expected}.important;`);
          includes(css, `@layer ${expected}.important {`);
          includes(css, `@layer ${expected} {`);
        } else notIncludes(css, '@layer');
        equal(rules.find((rule) => rule.css.includes('background-color'))?.importantNative, true);
        const compiler = createCompiler({ css: { layer: enabled, layerNamespace: 'app' } });
        const result = compiler.transform(
          `import { style } from '@fluentic/style';
          import { createSheet } from '@fluentic/style/css';
          export const sheet = createSheet(${JSON.stringify({ layer })}, [style.selector('.item', {
            color: style.important('red'), backgroundColor: style.important('blue', true),
          })]);`,
          '/tmp/ordering-important.ts',
        );
        if (!result) throw new Error('expected extraction');
        equal(result.css.join('\n'), css);
      }
    } finally {
      configureTestRuntime({ css: { layer: true, layerNamespace: 'css' } });
    }
  }
});

test('extraction orders whole globals by numeric order and discovery around regular and local styles', () => {
  const compiler = createCompiler({ layer: false });
  const result = compiler.transform(
    `import { style } from '@fluentic/style';
    import { createSheet, createGlobalSheet } from '@fluentic/style/css';
    createGlobalSheet({ order: 3 }, [style.selector('.positive', { color: 'red' })]);
    export const local = createSheet([style.selector('.local', { color: style.weight('red', -10) })]);
    export const regular = style({ display: 'block' });
    createGlobalSheet([style.selector('.first', { color: 'red' }), style.selector('.firstMore', { color: 'red' })]);
    createGlobalSheet([style.selector('.second', { color: 'red' })]);
    createGlobalSheet({ order: -3 }, [style.selector('.negative', { color: 'red' })]);`,
    '/tmp/ordering-global.ts',
  );
  if (!result) throw new Error('expected extraction');
  const css = result.css.join('\n');
  assertOrder(css, ['.negative', '.first', '.firstMore', '.second', '.local', '.positive']);
  if (
    !(css.indexOf('.second{') < css.indexOf('display: block') && css.indexOf('display: block') < css.indexOf('.local{'))
  ) throw new Error(css);
  notIncludes(result.code, 'createGlobalSheet');
});

test('server seeds sort positive globals after regular styles and retain earlier global batches', async () => {
  const { addRscStyleRules, clearRscStyleStore, getRscStyleCss } = await import('../runtime/rsc/styleStore');
  const { renderGlobalRuleBatches, createGlobalSheet, resetGlobalSheetModule } = await import(
    '../runtime/rsc/globalSheet'
  );
  const { setBuildMeta } = await import('./setup');
  configureTestRuntime({ dev: true, css: { layer: false } });
  setBuildMeta({ dev: true, extract: false, hoist: false, rsc: true, css: null });
  const owner = '/tmp/seed-ordering.ts';
  try {
    addRscStyleRules([{ key: 'regular-seed', css: '.regularSeed{color:red}', layer: false }]);
    (createGlobalSheet as (...args: unknown[]) => void)({ order: 2 }, [
      style.selector('.positiveSeed', { color: 'blue' }),
    ], {
      $$debug: true,
      globalModule: owner,
      loc: [1, 1],
      label: ['', '', ''],
      sourceUrl: owner,
    });
    const seed = renderGlobalRuleBatches([{
      owner: '/tmp/negative.ts',
      revision: '1',
      rules: [global('negativeSeed', -1)],
    }]);
    const css = (seed!.props as any).children[1].props.dangerouslySetInnerHTML.__html;
    assertOrder(css, ['.negativeSeed', '.regularSeed', '.positiveSeed']);
    includes(getRscStyleCss(), '.regularSeed{');
  } finally {
    resetGlobalSheetModule(owner);
    clearRscStyleStore();
    setBuildMeta({ dev: false, extract: false, hoist: false, rsc: false, css: null });
    configureTestRuntime();
  }
});

for (const mode of ['sort', 'layer'] as const) {
  for (const layer of ['style', false, { name: 'vendor' }] as const) {
    for (const globalGroup of [false, true]) {
      test(`late priorities preserve existing tags and maps (${mode}, ${JSON.stringify(layer)}, global=${globalGroup})`, () => {
        configureTestRuntime({ dev: true, priorityMode: mode, css: { layer: true } });
        const document = createFakeDocument();
        const sheet = createDevSheet({ document: document as never, sourcemap: true, maxRules: 2 });
        const rule = (name: string, weight: number): SheetRule => ({
          key: name,
          css: '.' + name + '{color:red}',
          priority: priority(weight),
          layer,
          sheet: globalGroup,
          globalSheet: globalGroup ? { id: 'incremental', order: -1 } : undefined,
          callsite: { filePath: '/src/incremental.ts', line: weight + 20, column: 1 },
        });
        try {
          sheet.insert({ key: 'reset', css: '.reset{margin:0}', sheet: true, layer: { name: 'reset' } });
          sheet.insert(rule('high', 10));
          sheet.flush();
          const originalTags = [...document.head.childNodes];
          const high = originalTags.find((tag) => tag.textContent.includes('.high{'));
          const originalHigh = high.textContent;
          let removals = 0;
          const remove = document.head.removeChild.bind(document.head);
          document.head.removeChild = (node: any) => {
            removals++;
            return remove(node);
          };
          for (let i = 0; i < 7; i++) {
            sheet.insert(rule('low' + i, i % 2));
            sheet.flush();
          }
          equal(removals, 0);
          for (const tag of originalTags) equal(tag.parentNode, document.head);
          equal(high.textContent, originalHigh);
          const css = document.head.textContent;
          assertOrder(css, ['.low0', '.low2', '.low4', '.low6', '.low1', '.low3', '.low5', '.high']);
          const tags = [...document.head.childNodes];
          for (let i = 0; i < 7; i++) {
            sheet.insert(rule('low' + i, i % 2));
            sheet.flush();
          }
          equal(document.head.textContent, css);
          equal(document.head.childNodes.length, tags.length);
          tags.forEach((tag, index) => equal(document.head.childNodes[index], tag));
        } finally {
          sheet.destroy?.();
          configureTestRuntime();
        }
      });
    }
  }
}
