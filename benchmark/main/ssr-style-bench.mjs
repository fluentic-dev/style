import * as babel from '@babel/core';
import emotionStyled from '@emotion/styled';
import { plugin as fluenticVitePlugin } from '@fluentic/style/plugin/vite';
import stylexBabelPlugin from '@stylexjs/babel-plugin';
import Benchmark from 'benchmark';
import { setup as setupGoober, styled as gooberStyled } from 'goober';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement as h } from 'react';
import { renderToString } from 'react-dom/server';
import styledComponents from 'styled-components';

globalThis.FLUENTIC_STYLE_BUILD_CONFIG = JSON.stringify({ hoist: true, css: {} });
globalThis.FLUENTIC_STYLE_DEV_CONFIG = JSON.stringify({});
globalThis.FLUENTIC_STYLE_SIDECAR_SERVER_URL = '';

const [
  fluenticExtract,
  fluenticServerJsx,
  fluenticServerExtracted,
] = await Promise.all([
  import('@fluentic/style/builder/extract'),
  import('@fluentic/style/jsx-runtime/server/extracted'),
  import('@fluentic/style/server/extracted'),
]);
const {
  createExtractedScope,
  createExtractedSlot,
  createExtractedToken,
} = fluenticExtract;
const { createElement: fluenticServerExtractedCreateElement } = fluenticServerJsx;
const {
  bindScope,
  combineStyle: combineStyleServerExtracted,
} = fluenticServerExtracted;

const OUT_DIR = process.env.BENCH_OUT_DIR || join(process.cwd(), 'results');
const MIN_TIME = Number(process.env.SSR_STYLE_MIN_TIME || 0.75);
const MAX_TIME = Number(process.env.SSR_STYLE_MAX_TIME || 8);
const ROWS = (process.env.SSR_ROWS || process.env.ROWS || '100,500')
  .split(',')
  .map((value) => Number(value.trim()))
  .filter((value) => Number.isFinite(value) && value > 0);
const VARIANTS = new Set(
  (process.env.VARIANTS || process.env.APP || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean),
);
const styled = styledComponents.default || styledComponents;

setupGoober(h);

const compiledFluentic = await loadCompiledFluenticFixture();
const compiledStylex = await loadCompiledStylexFixture();

const menu = ['Overview', 'Customers', 'Billing', 'Rules', 'Reports', 'Settings'];
const statusByIndex = ['active', 'trial', 'blocked', 'active', 'active', 'review'];
const rowsByCount = new Map();

function getRows(count) {
  let rows = rowsByCount.get(count);
  if (rows) return rows;

  rows = Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    name: `Customer ${index + 1}`,
    plan: index % 3 === 0 ? 'Enterprise' : index % 2 === 0 ? 'Pro' : 'Basic',
    usage: (index * 13) % 100,
    status: statusByIndex[index % statusByIndex.length],
  }));
  rowsByCount.set(count, rows);
  return rows;
}

const staticClass = {
  page: 'ssr-page',
  header: 'ssr-header',
  shell: 'ssr-shell',
  nav: 'ssr-nav',
  card: 'ssr-card',
  title: 'ssr-title',
  muted: 'ssr-muted',
  table: 'ssr-table',
  thtd: 'ssr-cell',
  row: 'ssr-row',
  rowActive: 'ssr-row-active',
  badge: 'ssr-badge',
  button: 'ssr-button',
  select: 'ssr-select',
};

const GooberCell = gooberStyled('td')({ borderBottom: '1px solid #334155', padding: '8px 6px' });
const GooberRow = gooberStyled('tr')((props) => ({
  background: props['data-active'] === '1' ? 'rgba(34,211,238,0.08)' : 'transparent',
}));
const EmotionCell = emotionStyled.td({ borderBottom: '1px solid #334155', padding: '8px 6px' });
const EmotionRow = emotionStyled.tr((props) => ({
  background: props['data-active'] === '1' ? 'rgba(34,211,238,0.08)' : 'transparent',
}));
const StyledCell = styled.td({ borderBottom: '1px solid #334155', padding: '8px 6px' });
const StyledRow = styled.tr((props) => ({
  background: props.$active ? 'rgba(34,211,238,0.08)' : 'transparent',
}));

const composeClass = {
  list: 'compose-list',
  item: 'compose-item',
  itemActive: 'compose-item-active',
  compact: 'compose-compact',
  success: 'compose-success',
  warning: 'compose-warning',
  danger: 'compose-danger',
  header: 'compose-header',
  title: 'compose-title',
  meta: 'compose-meta',
  metric: 'compose-metric',
  badge: 'compose-badge',
  action: 'compose-action',
};
const composeAccentToken = createExtractedToken('compose-accent', '#0f766e');
const composeSurfaceToken = createExtractedToken('compose-surface', 'rgba(240,253,250,0.92)');
const composeRingToken = createExtractedToken('compose-ring', 'rgba(15,118,110,0.24)');
const compositionStyles = {
  list: composeSlot('list', 'compose-list-grid'),
  item: composeSlot('item', 'compose-card-base', [
    'compose-card-surface-var',
    'compose-card-surface-var',
    [1, '--compose-surface', composeSurfaceToken, 1],
  ], [
    'compose-card-ring-var',
    'compose-card-ring-var',
    [1, '--compose-ring', composeRingToken, 1],
  ]),
  header: composeSlot('header', 'compose-header-grid'),
  title: composeSlot('title', 'compose-title-text'),
  meta: composeSlot('meta', 'compose-meta-text'),
  metric: composeSlot('metric', 'compose-metric-box'),
  badge: composeSlot('badge', 'compose-badge-base', [
    'compose-badge-accent-var',
    'compose-badge-accent-var',
    [1, '--compose-accent', composeAccentToken, 1],
  ]),
  action: composeSlot('action', 'compose-action-base', [
    'compose-action-accent-var',
    'compose-action-accent-var',
    [1, '--compose-accent', composeAccentToken, 1],
  ]),
};
const compositionScopes = {
  compact: createExtractedScope([
    [4, 'compose-item', 'compose-compact-item', 'compose-compact-item'],
    [4, 'compose-action', 'compose-compact-action', 'compose-compact-action'],
  ]),
  success: createExtractedScope([
    [4, 'compose-item', 'compose-success-item', 'compose-success-item'],
    [4, 'compose-badge', 'compose-success-badge', 'compose-success-badge'],
  ]),
  warning: createExtractedScope([
    [4, 'compose-item', 'compose-warning-item', 'compose-warning-item'],
    [4, 'compose-badge', 'compose-warning-badge', 'compose-warning-badge'],
  ]),
  danger: createExtractedScope([
    [4, 'compose-item', 'compose-danger-item', 'compose-danger-item'],
    [4, 'compose-badge', 'compose-danger-badge', 'compose-danger-badge'],
  ]),
  active: createExtractedScope([
    [4, 'compose-item', 'compose-active-item', 'compose-active-item'],
    [4, 'compose-action', 'compose-active-action', 'compose-active-action'],
  ]),
};
const StyledCompositionArticle = styled.article`
  border: 1px solid var(--compose-ring);
  background: var(--compose-surface);
`;
const StyledCompositionHeader = styled.header``;
const StyledCompositionTitle = styled.h2``;
const StyledCompositionBadge = styled.span``;
const StyledCompositionMeta = styled.p``;
const StyledCompositionMetric = styled.strong``;
const StyledCompositionButton = styled.button`
  color: var(--compose-accent);
`;
const GooberCompositionArticle = gooberStyled('article')`
  border: 1px solid var(--compose-ring);
  background: var(--compose-surface);
`;
const GooberCompositionHeader = gooberStyled('header')``;
const GooberCompositionTitle = gooberStyled('h2')``;
const GooberCompositionBadge = gooberStyled('span')``;
const GooberCompositionMeta = gooberStyled('p')``;
const GooberCompositionMetric = gooberStyled('strong')``;
const GooberCompositionButton = gooberStyled('button')`
  color: var(--compose-accent);
`;
const EmotionCompositionArticle = emotionStyled.article`
  border: 1px solid var(--compose-ring);
  background: var(--compose-surface);
`;
const EmotionCompositionHeader = emotionStyled.header``;
const EmotionCompositionTitle = emotionStyled.h2``;
const EmotionCompositionBadge = emotionStyled.span``;
const EmotionCompositionMeta = emotionStyled.p``;
const EmotionCompositionMetric = emotionStyled.strong``;
const EmotionCompositionButton = emotionStyled.button`
  color: var(--compose-accent);
`;

const cases = [
  {
    name: 'reactClassNameDashboard',
    lane: 'baseline-classname',
    group: 'dashboard',
    scenario: 'Plain React className dashboard',
    description: 'Plain React SSR with already-known className strings.',
    component: ReactClassNameDashboard,
  },
  {
    name: 'reactClassNameAndStyleDashboard',
    lane: 'baseline-classname-style-prop',
    group: 'dashboard',
    scenario: 'Plain React className plus style variables',
    description: 'Plain React SSR with className plus per-row style variables.',
    component: ReactClassNameAndStyleDashboard,
    baseline: true,
  },
  {
    name: 'fluenticExtractedDirectCssDashboard',
    lane: 'fluentic-extracted-css-prop',
    group: 'dashboard',
    scenario: 'Fluentic table direct css prop',
    description: 'Table/dashboard shape with extracted CSS objects passed directly through the server css prop.',
    component: FluenticExtractedDirectCssDashboard,
  },
  {
    name: 'fluenticExtractedScopedDashboard',
    lane: 'fluentic-extracted-scoped-composition',
    group: 'dashboard',
    scenario: 'Fluentic table scoped composition',
    description: 'Table/dashboard shape with cached combineStyle scope combinations consumed through css props.',
    component: FluenticExtractedScopedDashboard,
  },
  {
    name: 'fluenticExtractedTokenOverrideDashboard',
    lane: 'fluentic-extracted-token-override',
    group: 'dashboard',
    scenario: 'Fluentic dashboard token overrides',
    description:
      'Dashboard shape with extracted classes, repeated status token overrides, and high-cardinality values on style props.',
    component: FluenticExtractedTokenOverrideDashboard,
  },
  {
    name: 'stylexCompiledDashboard',
    lane: 'stylex-compiled-render-only',
    group: 'dashboard',
    scenario: 'StyleX compiled dashboard',
    description: 'StyleX source fixture compiled with @stylexjs/babel-plugin before SSR render.',
    component: StyleXCompiledDashboard,
  },
  {
    name: 'gooberStyledDashboard',
    lane: 'runtime-styled-render-only',
    group: 'dashboard',
    scenario: 'Goober styled render only',
    description: 'Goober styled components render-only path without stylesheet extraction.',
    component: GooberStyledDashboard,
  },
  {
    name: 'emotionStyledDashboard',
    lane: 'runtime-styled-render-only',
    group: 'dashboard',
    scenario: 'Emotion styled render only',
    description: 'Emotion styled components render-only path without stylesheet extraction.',
    component: EmotionStyledDashboard,
  },
  {
    name: 'styledComponentsDashboard',
    lane: 'runtime-styled-render-only',
    group: 'dashboard',
    scenario: 'styled-components render only',
    description: 'styled-components render-only path without ServerStyleSheet collection.',
    component: StyledComponentsDashboard,
  },
  {
    name: 'reactManualCompositionList',
    lane: 'manual-composition-baseline',
    group: 'composition',
    scenario: 'Plain React manual composition',
    description: 'Plain React with manual className composition and style object merging.',
    component: ReactManualCompositionList,
    baseline: true,
  },
  {
    name: 'fluenticExtractedDirectCssCompositionList',
    lane: 'fluentic-extracted-css-prop',
    group: 'composition',
    scenario: 'Fluentic card direct css prop',
    description: 'Repeated card component shape with extracted CSS objects passed directly through css props.',
    component: FluenticExtractedDirectCssCompositionList,
  },
  {
    name: 'fluenticExtractedScopedCompositionList',
    lane: 'fluentic-extracted-scoped-composition',
    group: 'composition',
    scenario: 'Fluentic card scoped composition',
    description: 'Repeated Fluentic component instances using cached combineStyle scope combinations and css arrays.',
    component: FluenticExtractedScopedCompositionList,
  },
  {
    name: 'fluenticExtractedTokenOverrideCompositionList',
    lane: 'fluentic-extracted-token-override-composition',
    group: 'composition',
    scenario: 'Fluentic card scoped composition plus token overrides',
    description:
      'Repeated Fluentic component instances using scoped classes plus per-row combineStyle() token overrides.',
    component: FluenticExtractedTokenOverrideCompositionList,
  },
  {
    name: 'stylexCompositionList',
    lane: 'stylex-compiled-composition',
    group: 'composition',
    scenario: 'StyleX compiled composition',
    description: 'StyleX composition source fixture compiled with @stylexjs/babel-plugin before SSR render.',
    component: StyleXCompositionList,
  },
  {
    name: 'gooberCompositionList',
    lane: 'runtime-class-composition',
    group: 'composition',
    scenario: 'Goober styled scoped composition',
    description: 'Goober static class composition plus dynamic style variables.',
    component: GooberCompositionList,
  },
  {
    name: 'emotionCompositionList',
    lane: 'runtime-class-composition',
    group: 'composition',
    scenario: 'Emotion styled scoped composition',
    description: 'Emotion static class composition plus dynamic style variables.',
    component: EmotionCompositionList,
  },
  {
    name: 'styledComponentsCompositionList',
    lane: 'runtime-styled-composition',
    group: 'composition',
    scenario: 'styled-components scoped composition',
    description: 'styled-components repeated component instances with style variable props.',
    component: StyledComponentsCompositionList,
  },
];

let counter = 0;
const selectedCases = cases.filter((benchCase) => shouldRun(benchCase.name, benchCase.lane));
const suite = new Benchmark.Suite('server-render-style-resolution');

for (const rows of ROWS) {
  for (const benchCase of selectedCases) {
    suite.add(`${rows}rows:${benchCase.name}`, () => renderComponent(benchCase.component, rows, benchCase.name), {
      minTime: MIN_TIME,
      maxTime: MAX_TIME,
    });
  }
}

suite
  .on('start', function(event) {
    console.log(`Starting ${event.currentTarget.name} benchmark...`);
    console.log(`rows=${ROWS.join(',')} minTime=${MIN_TIME}s maxTime=${MAX_TIME}s`);
  })
  .on('cycle', (event) => {
    if (event.target.error) {
      console.log(`${event.target.name}: ${event.target.error?.stack || event.target.error}`);
      return;
    }

    console.log(String(event.target));
  })
  .on('error', (event) => {
    console.error(`${event.target.name}: ${event.target.error?.stack || event.target.error}`);
  })
  .on('complete', function() {
    const baselines = new Map();
    const results = [];

    this.forEach((bench) => {
      const { rows, name } = parseBenchName(bench.name);
      const benchCase = cases.find((item) => item.name === name);
      const group = benchCase?.group || 'default';
      const result = {
        rows,
        name,
        lane: benchCase?.lane || 'unknown',
        group,
        scenario: benchCase?.scenario || name,
        description: benchCase?.description || '',
        opsPerSecond: bench.hz,
        marginOfError: bench.stats.rme,
        samples: bench.stats.sample.length,
        meanSeconds: bench.stats.mean,
        deviationSeconds: bench.stats.deviation,
      };

      results.push(result);
      if (benchCase?.baseline) baselines.set(`${rows}:${group}`, result);
    });

    for (const result of results) {
      const baseline = baselines.get(`${result.rows}:${result.group}`);
      if (!baseline) continue;

      result.baseline = baseline.name;
      result.overheadVsBaselineMeanSeconds = result.meanSeconds - baseline.meanSeconds;
      result.relativeToBaseline = result.meanSeconds / baseline.meanSeconds;
      if (baseline.name === 'reactClassNameDashboard' || baseline.name === 'reactClassNameAndStyleDashboard') {
        result.overheadVsReactClassNameMeanSeconds = result.overheadVsBaselineMeanSeconds;
        result.relativeToReactClassName = result.relativeToBaseline;
      }
    }

    results.sort(
      (a, b) =>
        a.rows - b.rows ||
        a.group.localeCompare(b.group) ||
        compareByBaselineThenRelative(a, b) ||
        b.opsPerSecond - a.opsPerSecond,
    );

    const report = {
      kind: 'server-render-style-resolution-benchmark',
      createdAt: new Date().toISOString(),
      settings: {
        rows: ROWS,
        minTime: MIN_TIME,
        maxTime: MAX_TIME,
        mode: 'compiled-fluentic-renderToString-dashboard-and-composition-shapes',
        notes: [
          'This suite compiles Fluentic source-shaped fixtures to production extracted output before measuring SSR render work.',
          'This suite measures server render className/css-prop/token-override resolution for an app-shaped dashboard table.',
          'Composition cases render repeated component instances with scoped themes, css arrays, and token overrides.',
          'Fluentic uses extracted CSS; it does not collect server style tags, so no fake Fluentic collection path is measured.',
          'Runtime libraries are kept in render-only lanes unless their explicit server stylesheet APIs are benchmarked separately.',
        ],
      },
      environment: {
        node: process.version,
        v8: process.versions.v8,
        platform: process.platform,
        arch: process.arch,
      },
      cases: selectedCases.map(({ component: _component, baseline: _baseline, ...benchCase }) => benchCase),
      results,
    };

    mkdirSync(OUT_DIR, { recursive: true });
    const outputPath = join(OUT_DIR, `ssr-style-${Date.now()}.json`);
    writeFileSync(outputPath, JSON.stringify(report, null, 2));

    console.log('\nServer render style resolution results:');
    console.table(
      results.map((result) => ({
        rows: result.rows,
        group: result.group,
        scenario: result.scenario,
        opsPerSecond: Math.round(result.opsPerSecond),
        meanMs: (result.meanSeconds * 1000).toFixed(3),
        vsBaseline: result.relativeToBaseline
          ? `${result.relativeToBaseline.toFixed(2)}x`
          : '',
        marginOfError: `${result.marginOfError.toFixed(2)}%`,
        samples: result.samples,
      })),
    );
    console.log(`\nServer render style resolution report: ${outputPath}`);
  })
  .run({ async: false });

function compareByBaselineThenRelative(a, b) {
  const aIsBaseline = a.name === a.baseline;
  const bIsBaseline = b.name === b.baseline;

  if (aIsBaseline !== bIsBaseline) return aIsBaseline ? -1 : 1;

  const aIsReact = a.name.startsWith('react');
  const bIsReact = b.name.startsWith('react');

  if (aIsReact !== bIsReact) return aIsReact ? -1 : 1;

  return (a.relativeToBaseline ?? Number.POSITIVE_INFINITY) -
    (b.relativeToBaseline ?? Number.POSITIVE_INFINITY);
}

function ReactClassNameDashboard({ rows, tick }) {
  return renderDashboard({
    rows,
    tick,
    create: h,
    classNames: staticClass,
    rowProps: (row, index, active) => ({
      className: active ? `${staticClass.row} ${staticClass.rowActive}` : staticClass.row,
    }),
    cellProps: () => ({ className: staticClass.thtd }),
    badgeProps: () => ({ className: staticClass.badge }),
  });
}

function ReactClassNameAndStyleDashboard({ rows, tick }) {
  return renderDashboard({
    rows,
    tick,
    create: h,
    classNames: staticClass,
    rowProps: (row, index, active) => ({
      className: active ? `${staticClass.row} ${staticClass.rowActive}` : staticClass.row,
      style: getRowDynamicStyle(row, tick),
    }),
    cellProps: () => ({ className: staticClass.thtd }),
    badgeProps: () => ({ className: staticClass.badge }),
  });
}

function FluenticExtractedDirectCssDashboard({ rows, tick }) {
  return h(compiledFluentic.DirectCssDashboard, { rows, tick });
}

function FluenticExtractedScopedDashboard({ rows, tick }) {
  return h(compiledFluentic.ScopedDashboard, { rows, tick });
}

function FluenticExtractedTokenOverrideDashboard({ rows, tick }) {
  return h(compiledFluentic.TokenOverrideDashboard, { rows, tick });
}

function StyleXCompiledDashboard({ rows, tick }) {
  return h(compiledStylex.StyleXDashboard, { rows, tick });
}

function GooberStyledDashboard({ rows, tick }) {
  return renderStyledDashboard({
    rows,
    tick,
    Row: GooberRow,
    Cell: GooberCell,
    rowProps: (row, active) => ({
      'data-active': active ? '1' : '0',
      style: getRowDynamicStyle(row, tick),
    }),
  });
}

function EmotionStyledDashboard({ rows, tick }) {
  return renderStyledDashboard({
    rows,
    tick,
    Row: EmotionRow,
    Cell: EmotionCell,
    rowProps: (row, active) => ({
      'data-active': active ? '1' : '0',
      style: getRowDynamicStyle(row, tick),
    }),
  });
}

function StyledComponentsDashboard({ rows, tick }) {
  return renderStyledDashboard({
    rows,
    tick,
    Row: StyledRow,
    Cell: StyledCell,
    rowProps: (row, active) => ({
      $active: active,
      style: getRowDynamicStyle(row, tick),
    }),
  });
}

function ReactManualCompositionList({ rows, tick }) {
  return renderCompositionList({
    rows,
    tick,
    create: h,
    rootProps: () => ({ className: composeClass.list }),
    itemProps: (row, index, active) => ({
      className: joinClassNames(
        composeClass.item,
        active && composeClass.itemActive,
        index % 2 === 0 && composeClass.compact,
        getCompositionStatusClass(row),
      ),
      style: mergeStyleObjects(getCompositionBaseVars(row), getCompositionDynamicVars(row, tick)),
    }),
    partProps: (part) => ({ className: composeClass[part] }),
  });
}

function FluenticExtractedDirectCssCompositionList({ rows, tick }) {
  return h(compiledFluentic.DirectCssCompositionList, { rows, tick });
}

function FluenticExtractedScopedCompositionList({ rows, tick }) {
  return h(compiledFluentic.ScopedCompositionList, { rows, tick });
}

function FluenticExtractedTokenOverrideCompositionList({ rows, tick }) {
  return h(compiledFluentic.TokenOverrideCompositionList, { rows, tick });
}

function StyleXCompositionList({ rows, tick }) {
  return h(compiledStylex.StyleXCompositionList, { rows, tick });
}

function GooberCompositionList({ rows, tick }) {
  return renderStyledCompositionList({
    rows,
    tick,
    parts: {
      article: GooberCompositionArticle,
      header: GooberCompositionHeader,
      title: GooberCompositionTitle,
      badge: GooberCompositionBadge,
      meta: GooberCompositionMeta,
      metric: GooberCompositionMetric,
      button: GooberCompositionButton,
    },
  });
}

function EmotionCompositionList({ rows, tick }) {
  return renderStyledCompositionList({
    rows,
    tick,
    parts: {
      article: EmotionCompositionArticle,
      header: EmotionCompositionHeader,
      title: EmotionCompositionTitle,
      badge: EmotionCompositionBadge,
      meta: EmotionCompositionMeta,
      metric: EmotionCompositionMetric,
      button: EmotionCompositionButton,
    },
  });
}

function StyledComponentsCompositionList({ rows, tick }) {
  return renderStyledCompositionList({
    rows,
    tick,
    parts: {
      article: StyledCompositionArticle,
      header: StyledCompositionHeader,
      title: StyledCompositionTitle,
      badge: StyledCompositionBadge,
      meta: StyledCompositionMeta,
      metric: StyledCompositionMetric,
      button: StyledCompositionButton,
    },
  });
}

function renderDashboard({
  rows,
  tick,
  create,
  classNames,
  css,
  propFor,
  rowProps,
  cellProps,
  badgeProps,
}) {
  const getProps = (key, extra) => {
    const base = propFor
      ? propFor(key)
      : css
      ? { css: css[key] }
      : { className: classNames[key] };

    return extra ? { ...base, ...extra } : base;
  };

  return create(
    'div',
    getProps('page'),
    create(
      'header',
      getProps('header'),
      create('strong', null, 'Fluentic Style Admin'),
      create(
        'select',
        getProps('select'),
        create('option', null, 'Last 7 days'),
      ),
    ),
    create(
      'div',
      getProps('shell'),
      create(
        'section',
        getProps('nav'),
        menu.map((item) => create('button', { ...getProps('button'), key: item }, item)),
      ),
      create(
        'section',
        getProps('card'),
        create('h1', getProps('title'), 'Admin Dashboard'),
        create('p', getProps('muted'), 'Real world server render benchmark.'),
        create(
          'table',
          getProps('table'),
          create(
            'thead',
            null,
            create(
              'tr',
              null,
              ['Name', 'Plan', 'Usage', 'Status'].map((label) => create('th', { ...cellProps(), key: label }, label)),
            ),
          ),
          create(
            'tbody',
            null,
            rows.map((row, index) => {
              const active = index === tick % rows.length;

              return create(
                'tr',
                { ...rowProps(row, index, active), key: row.id },
                create('td', cellProps(), row.name),
                create('td', cellProps(), row.plan),
                create('td', cellProps(), `${row.usage}%`),
                create('td', cellProps(), create('span', badgeProps(row, index, active), row.status)),
              );
            }),
          ),
        ),
      ),
    ),
  );
}

function renderCompositionList({
  rows,
  tick,
  create,
  rootProps,
  itemContext = () => undefined,
  itemProps,
  partProps,
}) {
  return create(
    'section',
    rootProps(),
    rows.map((row, index) => {
      const active = index === tick % rows.length;
      const context = itemContext(row, index, active);

      return create(
        'article',
        { ...itemProps(row, index, active, context), key: row.id },
        create(
          'header',
          partProps('header', row, index, active, context),
          create('h2', partProps('title', row, index, active, context), row.name),
          create('span', partProps('badge', row, index, active, context), row.status),
        ),
        create('p', partProps('meta', row, index, active, context), `${row.plan} plan / ${row.usage}% usage`),
        create('strong', partProps('metric', row, index, active, context), `${100 - row.usage}% remaining`),
        create('button', partProps('action', row, index, active, context), active ? 'Active row' : 'Review'),
      );
    }),
  );
}

function renderStyledCompositionList({ rows, tick, parts }) {
  return h(
    'section',
    { className: composeClass.list },
    rows.map((row, index) => {
      const active = index === tick % rows.length;

      return h(
        parts.article,
        {
          key: row.id,
          className: joinClassNames(
            composeClass.item,
            active && composeClass.itemActive,
            index % 2 === 0 && composeClass.compact,
            getCompositionStatusClass(row),
          ),
          style: mergeStyleObjects(getCompositionBaseVars(row), getCompositionDynamicVars(row, tick)),
        },
        h(
          parts.header,
          { className: composeClass.header },
          h(parts.title, { className: composeClass.title }, row.name),
          h(parts.badge, { className: composeClass.badge }, row.status),
        ),
        h(parts.meta, { className: composeClass.meta }, `${row.plan} plan / ${row.usage}% usage`),
        h(parts.metric, { className: composeClass.metric }, `${100 - row.usage}% remaining`),
        h(parts.button, { className: composeClass.action }, active ? 'Active row' : 'Review'),
      );
    }),
  );
}

function renderStyledDashboard({ rows, tick, Row, Cell, rowProps }) {
  return h(
    'div',
    { className: staticClass.page },
    h(
      'header',
      { className: staticClass.header },
      h('strong', null, 'Fluentic Style Admin'),
      h('select', { className: staticClass.select }, h('option', null, 'Last 7 days')),
    ),
    h(
      'div',
      { className: staticClass.shell },
      h(
        'section',
        { className: staticClass.nav },
        menu.map((item) => h('button', { className: staticClass.button, key: item }, item)),
      ),
      h(
        'section',
        { className: staticClass.card },
        h('h1', { className: staticClass.title }, 'Admin Dashboard'),
        h('p', { className: staticClass.muted }, 'Real world server render benchmark.'),
        h(
          'table',
          { className: staticClass.table },
          h(
            'thead',
            null,
            h(
              'tr',
              null,
              ['Name', 'Plan', 'Usage', 'Status'].map((label) => h(Cell, { key: label }, label)),
            ),
          ),
          h(
            'tbody',
            null,
            rows.map((row, index) => {
              const active = index === tick % rows.length;

              return h(
                Row,
                { ...rowProps(row, active), key: row.id },
                h(Cell, null, row.name),
                h(Cell, null, row.plan),
                h(Cell, null, `${row.usage}%`),
                h(Cell, null, h('span', { className: staticClass.badge }, row.status)),
              );
            }),
          ),
        ),
      ),
    ),
  );
}

function renderComponent(Component, rowCount, name) {
  counter += 1;
  const html = renderToString(h(Component, { rows: getRows(rowCount), tick: counter }));

  if (!html.includes('Customer 1')) throw new Error(`${name} rendered invalid dashboard HTML`);
  if (!html.includes('class=')) throw new Error(`${name} rendered no class attributes`);
  if (name.includes('TokenOverride') && !html.includes('style=')) {
    throw new Error(`${name} rendered no style attribute for token overrides`);
  }
}

function shouldRun(name, lane) {
  return !VARIANTS.size || VARIANTS.has(name) || VARIANTS.has(lane);
}

function parseBenchName(name) {
  const [rowsPart, caseName] = name.split(':');

  return {
    rows: Number(rowsPart.replace('rows', '')),
    name: caseName,
  };
}

function composeSlot(name, ...items) {
  return createExtractedSlot(
    `compose-${name}`,
    items.map((item) => typeof item === 'string' ? [item, item] : item),
  );
}

function joinClassNames(...items) {
  return items.filter(Boolean).join(' ');
}

function mergeStyleObjects(...items) {
  return Object.assign({}, ...items);
}

function getCompositionStatusClass(row) {
  if (row.status === 'blocked') return composeClass.danger;
  if (row.status === 'trial' || row.status === 'review') return composeClass.warning;
  return composeClass.success;
}

function getCompositionStatusScope(row) {
  if (row.status === 'blocked') return compositionScopes.danger;
  if (row.status === 'trial' || row.status === 'review') return compositionScopes.warning;
  return compositionScopes.success;
}

function getCompositionScopedCss(row, index, active) {
  return combineStyleServerExtracted(
    compositionStyles,
    bindScope(
      compositionStyles.item,
      getCompositionStatusScope(row),
      index % 2 === 0 && compositionScopes.compact,
      active && compositionScopes.active,
    ),
  );
}

function getCompositionScopedTokenCss(row, index, active) {
  return combineStyleServerExtracted(
    compositionStyles,
    bindScope(
      compositionStyles.item,
      getCompositionStatusScope(row),
      index % 2 === 0 && compositionScopes.compact,
      active && compositionScopes.active,
    ),
    composeAccentToken(getCompositionAccent(row)),
    composeSurfaceToken(getCompositionSurface(row)),
    composeRingToken(getCompositionRing(row)),
  );
}

function getCompositionAccent(row) {
  if (row.status === 'blocked') return '#dc2626';
  if (row.status === 'trial' || row.status === 'review') return '#b45309';
  return '#0f766e';
}

function getCompositionSurface(row) {
  if (row.status === 'blocked') return 'rgba(254,242,242,0.92)';
  if (row.status === 'trial' || row.status === 'review') return 'rgba(255,251,235,0.92)';
  return 'rgba(240,253,250,0.92)';
}

function getCompositionRing(row) {
  if (row.status === 'blocked') return 'rgba(220,38,38,0.22)';
  if (row.status === 'trial' || row.status === 'review') return 'rgba(180,83,9,0.22)';
  return 'rgba(15,118,110,0.24)';
}

function getCompositionBaseVars(row) {
  return {
    '--compose-accent': getCompositionAccent(row),
    '--compose-surface': getCompositionSurface(row),
    '--compose-ring': getCompositionRing(row),
  };
}

function getCompositionDynamicVars(row, tick) {
  return {
    '--ssr-row-hue': String((row.id * 17 + tick * 23) % 360),
    '--ssr-row-opacity': String(0.72 + ((row.id + tick) % 8) / 30),
    '--ssr-row-offset': `${((row.id + tick) % 7) - 3}px`,
  };
}

function getRowDynamicStyle(row, tick) {
  return {
    '--ssr-row-hue': String((row.id * 17 + tick * 23) % 360),
    '--ssr-row-opacity': String(0.72 + ((row.id + tick) % 8) / 30),
    '--ssr-row-offset': `${((row.id + tick) % 7) - 3}px`,
  };
}

async function loadCompiledStylexFixture() {
  const root = process.cwd();
  const fixturePath = join(root, '.cache/ssr-style-stylex-fixture/source.js');
  const outputPath = join(root, '.cache/ssr-style-stylex-fixture/compiled.mjs');
  const source = getCompiledStylexFixtureSource();

  mkdirSync(join(root, '.cache/ssr-style-stylex-fixture'), { recursive: true });
  writeFileSync(fixturePath, source);

  const result = babel.transformSync(source, {
    filename: fixturePath,
    sourceFileName: fixturePath,
    babelrc: false,
    configFile: false,
    sourceType: 'module',
    plugins: [[stylexBabelPlugin, {
      dev: false,
      runtimeInjection: false,
      treeshakeCompensation: false,
      unstable_moduleResolution: {
        type: 'commonJS',
        rootDir: root,
      },
    }]],
  });

  if (!result?.code) {
    throw new Error('StyleX SSR fixture did not compile.');
  }

  writeFileSync(outputPath, result.code);

  return import(`${outputPath}?t=${Date.now()}`);
}

async function loadCompiledFluenticFixture() {
  const plugin = fluenticVitePlugin({ css: { debugClassName: true }, layer: false });
  const root = process.cwd();
  const fixturePath = join(root, '.cache/ssr-style-fixture/source.ts');
  const outputPath = join(root, '.cache/ssr-style-fixture/compiled.mjs');

  mkdirSync(join(root, '.cache/ssr-style-fixture'), { recursive: true });

  await plugin.config?.({ root }, { command: 'build', mode: 'production' });
  plugin.configResolved?.({ root, command: 'build' });
  await plugin.buildStart?.call({});

  const result = await plugin.transform.call(
    {
      error(error) {
        throw error;
      },
    },
    getCompiledFluenticFixtureSource(),
    fixturePath,
  );

  if (!result?.code) {
    throw new Error('Fluentic SSR fixture did not compile.');
  }

  writeFileSync(outputPath, result.code);

  return import(`${outputPath}?t=${Date.now()}`);
}

function getCompiledStylexFixtureSource() {
  return String.raw`
import * as stylex from '@stylexjs/stylex';
import { createElement as h } from 'react';

const menu = ['Overview', 'Customers', 'Billing', 'Rules', 'Reports', 'Settings'];

const dashboardStyles = stylex.create({
  page: { minHeight: '100vh', padding: 18 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  shell: { display: 'grid', gridTemplateColumns: '250px 1fr', gap: 12 },
  nav: { padding: 12 },
  card: { padding: 12 },
  title: { margin: 0, fontSize: 20 },
  muted: { color: '#94a3b8', fontSize: 12 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  thtd: { borderBottom: '1px solid #334155', padding: '8px 6px' },
  row: {},
  rowActive: { backgroundColor: 'rgba(34,211,238,0.08)' },
  badge: { display: 'inline-block', fontSize: 11 },
  button: { width: '100%', marginBottom: 6 },
  select: { padding: '6px 8px' },
});

const compositionStyles = stylex.create({
  list: {},
  item: {
    backgroundColor: 'rgba(240,253,250,0.92)',
    borderColor: 'rgba(15,118,110,0.24)',
  },
  itemActive: { outlineColor: '#0ea5e9' },
  compact: { padding: 10 },
  success: { borderColor: '#0f766e' },
  warning: { borderColor: '#b45309' },
  danger: { borderColor: '#dc2626' },
  header: {},
  title: {},
  meta: {},
  metric: {},
  badge: { color: '#0f766e' },
  badgeSuccess: { color: '#0f766e' },
  badgeWarning: { color: '#b45309' },
  badgeDanger: { color: '#dc2626' },
  action: { color: '#0f766e' },
  actionActive: { fontWeight: 700 },
});

const p = {
  page: stylex.props(dashboardStyles.page),
  header: stylex.props(dashboardStyles.header),
  shell: stylex.props(dashboardStyles.shell),
  nav: stylex.props(dashboardStyles.nav),
  card: stylex.props(dashboardStyles.card),
  title: stylex.props(dashboardStyles.title),
  muted: stylex.props(dashboardStyles.muted),
  table: stylex.props(dashboardStyles.table),
  thtd: stylex.props(dashboardStyles.thtd),
  badge: stylex.props(dashboardStyles.badge),
  button: stylex.props(dashboardStyles.button),
  select: stylex.props(dashboardStyles.select),
  row: stylex.props(dashboardStyles.row),
  rowActive: stylex.props(dashboardStyles.row, dashboardStyles.rowActive),
  list: stylex.props(compositionStyles.list),
  headerPart: stylex.props(compositionStyles.header),
  titlePart: stylex.props(compositionStyles.title),
  meta: stylex.props(compositionStyles.meta),
  metric: stylex.props(compositionStyles.metric),
};

export function StyleXDashboard({ rows, tick }) {
  return renderDashboard({
    rows,
    tick,
    rowProps: (row, index, active) => ({
      ...(active ? p.rowActive : p.row),
      style: getRowDynamicStyle(row, tick),
    }),
    cellProps: () => p.thtd,
    badgeProps: () => p.badge,
  });
}

export function StyleXCompositionList({ rows, tick }) {
  return renderCompositionList({
    rows,
    tick,
    rootProps: () => p.list,
    itemProps: (row, index, active) => {
      const props = stylex.props(
        compositionStyles.item,
        active && compositionStyles.itemActive,
        index % 2 === 0 && compositionStyles.compact,
        row.status === 'blocked' && compositionStyles.danger,
        (row.status === 'trial' || row.status === 'review') && compositionStyles.warning,
        row.status !== 'blocked' && row.status !== 'trial' && row.status !== 'review' && compositionStyles.success,
      );

      props.style = mergeStyleObjects(getCompositionBaseVars(row), getCompositionDynamicVars(row, tick));
      return props;
    },
    partProps: (part, row, index, active) => {
      if (part === 'header') return p.headerPart;
      if (part === 'title') return p.titlePart;
      if (part === 'meta') return p.meta;
      if (part === 'metric') return p.metric;

      if (part === 'badge') {
        return stylex.props(
          compositionStyles.badge,
          row.status === 'blocked' && compositionStyles.badgeDanger,
          (row.status === 'trial' || row.status === 'review') && compositionStyles.badgeWarning,
          row.status !== 'blocked' && row.status !== 'trial' && row.status !== 'review' && compositionStyles.badgeSuccess,
        );
      }

      if (part === 'action') {
        return stylex.props(compositionStyles.action, active && compositionStyles.actionActive);
      }

      return {};
    },
  });
}

function renderDashboard({
  rows,
  tick,
  rowProps,
  cellProps,
  badgeProps,
}) {
  return h(
    'div',
    p.page,
    h('header', p.header, h('strong', null, 'Fluentic Style Admin'), h('select', p.select, h('option', null, 'Last 7 days'))),
    h(
      'div',
      p.shell,
      h('section', p.nav, menu.map((item) => h('button', { ...p.button, key: item }, item))),
      h(
        'section',
        p.card,
        h('h1', p.title, 'Admin Dashboard'),
        h('p', p.muted, 'Real world server render benchmark.'),
        h(
          'table',
          p.table,
          h('tbody', null, rows.map((row, index) => {
            const active = index === tick % rows.length;
            return h(
              'tr',
              { ...rowProps(row, index, active), key: row.id },
              h('td', cellProps(), row.name),
              h('td', cellProps(), row.plan),
              h('td', cellProps(), row.usage + '%'),
              h('td', cellProps(), h('span', badgeProps(row, index, active), row.status)),
            );
          })),
        ),
      ),
    ),
  );
}

function renderCompositionList({
  rows,
  tick,
  rootProps,
  itemProps,
  partProps,
}) {
  return h(
    'section',
    rootProps(),
    rows.map((row, index) => {
      const active = index === tick % rows.length;

      return h(
        'article',
        { ...itemProps(row, index, active), key: row.id },
        h(
          'header',
          partProps('header', row, index, active),
          h('h2', partProps('title', row, index, active), row.name),
          h('span', partProps('badge', row, index, active), row.status),
        ),
        h('p', partProps('meta', row, index, active), row.plan + ' plan / ' + row.usage + '% usage'),
        h('strong', partProps('metric', row, index, active), 100 - row.usage + '% remaining'),
        h('button', partProps('action', row, index, active), active ? 'Active row' : 'Review'),
      );
    }),
  );
}

function getCompositionBaseVars(row) {
  return {
    '--compose-accent': getCompositionAccent(row),
    '--compose-surface': getCompositionSurface(row),
    '--compose-ring': getCompositionRing(row),
  };
}

function getCompositionDynamicVars(row, tick) {
  return {
    '--ssr-row-hue': String((row.id * 17 + tick * 23) % 360),
    '--ssr-row-opacity': String(0.72 + ((row.id + tick) % 8) / 30),
    '--ssr-row-offset': ((row.id + tick) % 7) - 3 + 'px',
  };
}

function getRowDynamicStyle(row, tick) {
  return {
    '--ssr-row-hue': String((row.id * 17 + tick * 23) % 360),
    '--ssr-row-opacity': String(0.72 + ((row.id + tick) % 8) / 30),
    '--ssr-row-offset': ((row.id + tick) % 7) - 3 + 'px',
  };
}

function getCompositionAccent(row) {
  if (row.status === 'blocked') return '#dc2626';
  if (row.status === 'trial' || row.status === 'review') return '#b45309';
  return '#0f766e';
}

function getCompositionSurface(row) {
  if (row.status === 'blocked') return 'rgba(254,242,242,0.92)';
  if (row.status === 'trial' || row.status === 'review') return 'rgba(255,251,235,0.92)';
  return 'rgba(240,253,250,0.92)';
}

function getCompositionRing(row) {
  if (row.status === 'blocked') return 'rgba(220,38,38,0.22)';
  if (row.status === 'trial' || row.status === 'review') return 'rgba(180,83,9,0.22)';
  return 'rgba(15,118,110,0.24)';
}

function mergeStyleObjects(...items) {
  return Object.assign({}, ...items);
}
`;
}

function getCompiledFluenticFixtureSource() {
  return String.raw`
import { bindScope, combineStyle, createElement as h, createToken, style } from '@fluentic/style';

const menu = ['Overview', 'Customers', 'Billing', 'Rules', 'Reports', 'Settings'];

const staticClass = {
  page: 'ssr-page',
  header: 'ssr-header',
  shell: 'ssr-shell',
  nav: 'ssr-nav',
  card: 'ssr-card',
  title: 'ssr-title',
  muted: 'ssr-muted',
  table: 'ssr-table',
  thtd: 'ssr-cell',
  row: 'ssr-row',
  rowActive: 'ssr-row-active',
  badge: 'ssr-badge',
  button: 'ssr-button',
  select: 'ssr-select',
};

const dashboardStyles = {
  page: style.slot({ minHeight: '100vh', padding: 18 }),
  header: style.slot({ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }),
  shell: style.slot({ display: 'grid', gridTemplateColumns: '250px 1fr', gap: 12 }),
  nav: style.slot({ padding: 12 }),
  card: style.slot({ padding: 12 }),
  title: style.slot({ margin: 0, fontSize: 20 }),
  muted: style.slot({ color: '#94a3b8', fontSize: 12 }),
  table: style.slot({ width: '100%', borderCollapse: 'collapse', fontSize: 13 }),
  thtd: style.slot({ borderBottom: '1px solid #334155', padding: '8px 6px' }),
  row: style.slot({}),
  rowActive: style.slot({ background: 'rgba(34,211,238,0.08)' }),
  badge: style.slot({ display: 'inline-block', fontSize: 11 }),
  button: style.slot({ width: '100%', marginBottom: 6 }),
  select: style.slot({ padding: '6px 8px' }),
};

const rowAccentToken = createToken('#0f766e');
const rowSurfaceToken = createToken('rgba(240,253,250,0.92)');
const rowRingToken = createToken('rgba(15,118,110,0.24)');
const tokenDashboardStyles = {
  ...dashboardStyles,
  row: style.slot({
    backgroundColor: rowSurfaceToken,
    color: rowAccentToken,
    outlineColor: rowRingToken,
  }),
};

const dashboardActiveScope = style.scope([
  dashboardStyles.row({ background: 'rgba(34,211,238,0.08)' }),
]);
const dashboardSuccessScope = style.scope([
  dashboardStyles.badge({ color: '#0f766e' }),
]);
const dashboardWarningScope = style.scope([
  dashboardStyles.badge({ color: '#b45309' }),
]);
const dashboardDangerScope = style.scope([
  dashboardStyles.badge({ color: '#dc2626' }),
]);

const accentToken = createToken('#0f766e');
const surfaceToken = createToken('rgba(240,253,250,0.92)');
const ringToken = createToken('rgba(15,118,110,0.24)');

const cardStyles = {
  list: style.slot({}),
  item: style.slot({
    backgroundColor: 'rgba(240,253,250,0.92)',
    borderColor: 'rgba(15,118,110,0.24)',
  }),
  header: style.slot({}),
  title: style.slot({}),
  meta: style.slot({}),
  metric: style.slot({}),
  badge: style.slot({ color: '#0f766e' }),
  action: style.slot({ color: '#0f766e' }),
};

const directCardStyles = {
  ...cardStyles,
  itemActive: style.slot({ outlineColor: '#0ea5e9' }),
  itemCompact: style.slot({ padding: 10 }),
  itemSuccess: style.slot({ borderColor: '#0f766e' }),
  itemWarning: style.slot({ borderColor: '#b45309' }),
  itemDanger: style.slot({ borderColor: '#dc2626' }),
  badgeSuccess: style.slot({ color: '#0f766e' }),
  badgeWarning: style.slot({ color: '#b45309' }),
  badgeDanger: style.slot({ color: '#dc2626' }),
  actionActive: style.slot({ fontWeight: 700 }),
};

const tokenCardStyles = {
  list: cardStyles.list,
  item: style.slot({
    backgroundColor: surfaceToken,
    borderColor: ringToken,
  }),
  header: cardStyles.header,
  title: cardStyles.title,
  meta: cardStyles.meta,
  metric: cardStyles.metric,
  badge: style.slot({ color: accentToken }),
  action: style.slot({ color: accentToken }),
};

const compactScope = style.scope([
  cardStyles.item({ padding: 10 }),
  cardStyles.action({ minHeight: 30 }),
]);
const activeScope = style.scope([
  cardStyles.item({ outlineColor: '#0ea5e9' }),
  cardStyles.action({ fontWeight: 700 }),
]);
const successScope = style.scope([
  cardStyles.item({ borderColor: '#0f766e' }),
  cardStyles.badge({ color: '#0f766e' }),
]);
const warningScope = style.scope([
  cardStyles.item({ borderColor: '#b45309' }),
  cardStyles.badge({ color: '#b45309' }),
]);
const dangerScope = style.scope([
  cardStyles.item({ borderColor: '#dc2626' }),
  cardStyles.badge({ color: '#dc2626' }),
]);

const tokenCompactScope = style.scope([
  tokenCardStyles.item({ padding: 10 }),
  tokenCardStyles.action({ minHeight: 30 }),
]);
const tokenActiveScope = style.scope([
  tokenCardStyles.item({ outlineColor: '#0ea5e9' }),
  tokenCardStyles.action({ fontWeight: 700 }),
]);
const tokenSuccessScope = style.scope([
  tokenCardStyles.item({ borderColor: '#0f766e' }),
  tokenCardStyles.badge({ fontWeight: 700 }),
]);
const tokenWarningScope = style.scope([
  tokenCardStyles.item({ borderColor: '#b45309' }),
  tokenCardStyles.badge({ fontWeight: 700 }),
]);
const tokenDangerScope = style.scope([
  tokenCardStyles.item({ borderColor: '#dc2626' }),
  tokenCardStyles.badge({ fontWeight: 700 }),
]);

export function DirectCssDashboard({ rows, tick }) {
  return renderDashboard({
    rows,
    tick,
    create: h,
    css: dashboardStyles,
    rowProps: (row, index, active) => ({
      css: [dashboardStyles.row, active && dashboardStyles.rowActive],
      style: getRowDynamicStyle(row, tick),
    }),
    cellProps: () => ({ css: dashboardStyles.thtd }),
    badgeProps: () => ({ css: dashboardStyles.badge }),
  });
}

export function ScopedDashboard({ rows, tick }) {
  return renderDashboard({
    rows,
    tick,
    create: h,
    css: dashboardStyles,
    rowContext: (row, index, active) => combineStyle(
      dashboardStyles,
      bindScope(
        dashboardStyles.row,
        getDashboardStatusScope(row),
        active && dashboardActiveScope,
      ),
    ),
    rowProps: (row, index, active, css) => ({
      css: css.row,
      style: getRowDynamicStyle(row, tick),
    }),
    cellProps: (row, index, active, css) => ({ css: css.thtd }),
    badgeProps: (row, index, active, css) => ({ css: css.badge }),
  });
}

export function TokenOverrideDashboard({ rows, tick }) {
  return renderDashboard({
    rows,
    tick,
    create: h,
    css: tokenDashboardStyles,
    rowProps: (row, index, active) => {
      const css = combineStyle(
        tokenDashboardStyles,
        rowAccentToken(getCompositionAccent(row)),
        rowSurfaceToken(getCompositionSurface(row)),
        rowRingToken(getCompositionRing(row)),
      );

      return {
        css: [css.row, active && css.rowActive],
        style: getRowDynamicStyle(row, tick),
      };
    },
    cellProps: () => ({ css: tokenDashboardStyles.thtd }),
    badgeProps: () => ({ css: tokenDashboardStyles.badge }),
  });
}

export function DirectCssCompositionList({ rows, tick }) {
  return renderCompositionList({
    rows,
    tick,
    create: h,
    rootProps: () => ({ css: directCardStyles.list }),
    itemContext: () => directCardStyles,
    itemProps: (row, index, active, css) => ({
      css: [
        css.item,
        active && css.itemActive,
        index % 2 === 0 && css.itemCompact,
        getDirectStatusItemStyle(row),
      ],
      style: mergeStyleObjects(getCompositionBaseVars(row), getCompositionDynamicVars(row, tick)),
    }),
    partProps: (part, row, index, active, css) => {
      if (part === 'badge') {
        return { css: [css.badge, getDirectStatusBadgeStyle(row)] };
      }

      if (part === 'action') {
        return { css: [css.action, active && css.actionActive] };
      }

      return { css: css[part] };
    },
  });
}

export function ScopedCompositionList({ rows, tick }) {
  return renderCompositionList({
    rows,
    tick,
    create: h,
    rootProps: () => ({ css: cardStyles.list }),
    itemContext: (row, index, active) => combineStyle(
      cardStyles,
      bindScope(
        cardStyles.item,
        getStatusScope(row),
        index % 2 === 0 && compactScope,
        active && activeScope,
      ),
    ),
    itemProps: (row, index, active, css) => ({
      css: css.item,
      style: mergeStyleObjects(getCompositionBaseVars(row), getCompositionDynamicVars(row, tick)),
    }),
    partProps: (part, row, index, active, css) => ({ css: css[part] }),
  });
}

export function TokenOverrideCompositionList({ rows, tick }) {
  return renderCompositionList({
    rows,
    tick,
    create: h,
    rootProps: () => ({ css: tokenCardStyles.list }),
    itemContext: (row, index, active) => combineStyle(
      tokenCardStyles,
      bindScope(
        tokenCardStyles.item,
        getTokenStatusScope(row),
        index % 2 === 0 && tokenCompactScope,
        active && tokenActiveScope,
      ),
      accentToken(getCompositionAccent(row)),
      surfaceToken(getCompositionSurface(row)),
      ringToken(getCompositionRing(row)),
    ),
    itemProps: (row, index, active, css) => ({
      css: css.item,
      style: getCompositionDynamicVars(row, tick),
    }),
    partProps: (part, row, index, active, css) => ({ css: css[part] }),
  });
}

function renderDashboard({
  rows,
  tick,
  create,
  classNames,
  css,
  rowContext = () => undefined,
  rowProps,
  cellProps,
  badgeProps,
}) {
  const getProps = (key, extra) => {
    const base = css ? { css: css[key] } : { className: classNames[key] };
    return extra ? { ...base, ...extra } : base;
  };

  return create(
    'div',
    getProps('page'),
    create('header', getProps('header'), create('strong', null, 'Fluentic Style Admin'), create('select', getProps('select'), create('option', null, 'Last 7 days'))),
    create(
      'div',
      getProps('shell'),
      create('section', getProps('nav'), menu.map((item) => create('button', { ...getProps('button'), key: item }, item))),
      create(
        'section',
        getProps('card'),
        create('h1', getProps('title'), 'Admin Dashboard'),
        create('p', getProps('muted'), 'Real world server render benchmark.'),
        create(
          'table',
          getProps('table'),
          create('tbody', null, rows.map((row, index) => {
            const active = index === tick % rows.length;
            const context = rowContext(row, index, active);
            return create(
              'tr',
              { ...rowProps(row, index, active, context), key: row.id },
              create('td', cellProps(row, index, active, context), row.name),
              create('td', cellProps(row, index, active, context), row.plan),
              create('td', cellProps(row, index, active, context), row.usage + '%'),
              create('td', cellProps(row, index, active, context), create('span', badgeProps(row, index, active, context), row.status)),
            );
          })),
        ),
      ),
    ),
  );
}

function renderCompositionList({
  rows,
  tick,
  create,
  rootProps,
  itemContext,
  itemProps,
  partProps,
}) {
  return create(
    'section',
    rootProps(),
    rows.map((row, index) => {
      const active = index === tick % rows.length;
      const context = itemContext(row, index, active);

      return create(
        'article',
        { ...itemProps(row, index, active, context), key: row.id },
        create(
          'header',
          partProps('header', row, index, active, context),
          create('h2', partProps('title', row, index, active, context), row.name),
          create('span', partProps('badge', row, index, active, context), row.status),
        ),
        create('p', partProps('meta', row, index, active, context), row.plan + ' plan / ' + row.usage + '% usage'),
        create('strong', partProps('metric', row, index, active, context), 100 - row.usage + '% remaining'),
        create('button', partProps('action', row, index, active, context), active ? 'Active row' : 'Review'),
      );
    }),
  );
}

function getDashboardStatusScope(row) {
  if (row.status === 'blocked') return dashboardDangerScope;
  if (row.status === 'trial' || row.status === 'review') return dashboardWarningScope;
  return dashboardSuccessScope;
}

function getStatusScope(row) {
  if (row.status === 'blocked') return dangerScope;
  if (row.status === 'trial' || row.status === 'review') return warningScope;
  return successScope;
}

function getDirectStatusItemStyle(row) {
  if (row.status === 'blocked') return directCardStyles.itemDanger;
  if (row.status === 'trial' || row.status === 'review') return directCardStyles.itemWarning;
  return directCardStyles.itemSuccess;
}

function getDirectStatusBadgeStyle(row) {
  if (row.status === 'blocked') return directCardStyles.badgeDanger;
  if (row.status === 'trial' || row.status === 'review') return directCardStyles.badgeWarning;
  return directCardStyles.badgeSuccess;
}

function getTokenStatusScope(row) {
  if (row.status === 'blocked') return tokenDangerScope;
  if (row.status === 'trial' || row.status === 'review') return tokenWarningScope;
  return tokenSuccessScope;
}

function getCompositionAccent(row) {
  if (row.status === 'blocked') return '#dc2626';
  if (row.status === 'trial' || row.status === 'review') return '#b45309';
  return '#0f766e';
}

function getCompositionSurface(row) {
  if (row.status === 'blocked') return 'rgba(254,242,242,0.92)';
  if (row.status === 'trial' || row.status === 'review') return 'rgba(255,251,235,0.92)';
  return 'rgba(240,253,250,0.92)';
}

function getCompositionRing(row) {
  if (row.status === 'blocked') return 'rgba(220,38,38,0.22)';
  if (row.status === 'trial' || row.status === 'review') return 'rgba(180,83,9,0.22)';
  return 'rgba(15,118,110,0.24)';
}

function getCompositionBaseVars(row) {
  return {
    '--compose-accent': getCompositionAccent(row),
    '--compose-surface': getCompositionSurface(row),
    '--compose-ring': getCompositionRing(row),
  };
}

function getCompositionDynamicVars(row, tick) {
  return {
    '--ssr-row-hue': String((row.id * 17 + tick * 23) % 360),
    '--ssr-row-opacity': String(0.72 + ((row.id + tick) % 8) / 30),
    '--ssr-row-offset': ((row.id + tick) % 7) - 3 + 'px',
  };
}

function getRowDynamicStyle(row, tick) {
  return {
    '--ssr-row-hue': String((row.id * 17 + tick * 23) % 360),
    '--ssr-row-opacity': String(0.72 + ((row.id + tick) % 8) / 30),
    '--ssr-row-offset': ((row.id + tick) % 7) - 3 + 'px',
  };
}

function mergeStyleObjects(...items) {
  return Object.assign({}, ...items);
}
`;
}
