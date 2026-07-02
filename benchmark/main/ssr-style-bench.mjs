import emotionStyled from '@emotion/styled';
import { combineStyle, createElement as fluenticCreateElement, style } from '@fluentic/style';
import {
  createExtractedScope,
  createExtractedSlot,
  createExtractedStyle,
  createExtractedStyleMerge,
  createExtractedToken,
  withTokens,
} from '@fluentic/style/builder/extract';
import { createElement as fluenticServerExtractedCreateElement } from '@fluentic/style/jsx-runtime/server/extracted';
import {
  bindScope,
  combineStyle as combineStyleServerExtracted,
  getClassName as getClassNameServerExtracted,
  style as styleServerExtracted,
} from '@fluentic/style/server/extracted';
import * as stylex from '@stylexjs/stylex';
import Benchmark from 'benchmark';
import { setup as setupGoober, styled as gooberStyled } from 'goober';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement as reactCreateElement } from 'react';
import { renderToString } from 'react-dom/server';
import styledComponents from 'styled-components';

const OUT_DIR = process.env.BENCH_OUT_DIR || join(process.cwd(), 'results');
const MIN_TIME = Number(process.env.SSR_STYLE_MIN_TIME || 1);
const MAX_TIME = Number(process.env.SSR_STYLE_MAX_TIME || 8);
const VARIANTS = new Set(
  (process.env.VARIANTS || process.env.APP || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean),
);
const styled = styledComponents.default || styledComponents;

setupGoober(reactCreateElement);

const isActive = (props) => props['data-active'] === '1';

const objectStyle = (props) => ({
  alignItems: 'center',
  border: `1px solid ${isActive(props) ? '#16a34a' : '#d4d4d8'}`,
  borderRadius: 6,
  display: 'flex',
  minHeight: 28,
  opacity: isActive(props) ? 1 : 0.68,
  '@media (min-width: 1px)': {
    minWidth: 52,
  },
  '&:hover': {
    borderColor: '#0ea5e9',
  },
});

const taggedStyle = [
  `
    align-items: center;
    border: 1px solid `,
  `;
    border-radius: 6px;
    display: flex;
    min-height: 28px;
    opacity: `,
  `;
    @media (min-width: 1px) {
      min-width: 52px;
    }
    &:hover {
      border-color: #0ea5e9;
    }
  `,
];
taggedStyle.raw = taggedStyle;

const arrayStyle = (props) => [
  {
    alignItems: 'center',
    border: '1px solid #d4d4d8',
    borderRadius: 6,
    display: 'flex',
    minHeight: 28,
    opacity: 0.68,
    '@media (min-width: 1px)': {
      minWidth: 52,
    },
    '&:hover': {
      borderColor: '#0ea5e9',
    },
  },
  isActive(props) && {
    borderColor: '#16a34a',
    opacity: 1,
  },
];

const fluenticOpacity0 = style
  .slot({
    alignItems: 'center',
    border: '1px solid #d4d4d8',
    borderRadius: 6,
    display: 'flex',
    minHeight: 28,
    opacity: 0.68,
  })
  .media('(min-width: 1px)', { minWidth: 52 })
  .hover({ borderColor: '#0ea5e9' });
const fluenticOpacity1 = style
  .slot({
    alignItems: 'center',
    border: '1px solid #16a34a',
    borderRadius: 6,
    display: 'flex',
    minHeight: 28,
    opacity: 1,
  })
  .media('(min-width: 1px)', { minWidth: 52 })
  .hover({ borderColor: '#0ea5e9' });
const fluenticStyles0 = {
  root: fluenticOpacity0,
};
const fluenticStyles1 = {
  root: fluenticOpacity1,
};

const fluenticServerExtractedOpacity0 = styleServerExtracted
  .slot({
    alignItems: 'center',
    border: '1px solid #d4d4d8',
    borderRadius: 6,
    display: 'flex',
    minHeight: 28,
    opacity: 0.68,
  })
  .media('(min-width: 1px)', { minWidth: 52 })
  .hover({ borderColor: '#0ea5e9' });
const fluenticServerExtractedOpacity1 = styleServerExtracted
  .slot({
    alignItems: 'center',
    border: '1px solid #16a34a',
    borderRadius: 6,
    display: 'flex',
    minHeight: 28,
    opacity: 1,
  })
  .media('(min-width: 1px)', { minWidth: 52 })
  .hover({ borderColor: '#0ea5e9' });
const fluenticServerExtractedStyles0 = {
  root: fluenticServerExtractedOpacity0,
};
const fluenticServerExtractedStyles1 = {
  root: fluenticServerExtractedOpacity1,
};

const fluenticCompiledExtractedStyles0 = {
  root: createExtractedSlot('fluentic-ssr-root', [
    ['ssr-align-items-center', 'ssr-align-items-center'],
    ['ssr-border-neutral', 'ssr-border-neutral'],
    ['ssr-radius-6', 'ssr-radius-6'],
    ['ssr-display-flex', 'ssr-display-flex'],
    ['ssr-min-height-28', 'ssr-min-height-28'],
    ['ssr-opacity-inactive', 'ssr-opacity-inactive'],
    ['ssr-media-min-width-52', 'ssr-media-min-width-52'],
    ['ssr-hover-border-sky', 'ssr-hover-border-sky'],
  ]),
};
const fluenticCompiledExtractedStyles1 = {
  root: createExtractedSlot('fluentic-ssr-root', [
    ['ssr-align-items-center', 'ssr-align-items-center'],
    ['ssr-border-active', 'ssr-border-active'],
    ['ssr-radius-6', 'ssr-radius-6'],
    ['ssr-display-flex', 'ssr-display-flex'],
    ['ssr-min-height-28', 'ssr-min-height-28'],
    ['ssr-opacity-active', 'ssr-opacity-active'],
    ['ssr-media-min-width-52', 'ssr-media-min-width-52'],
    ['ssr-hover-border-sky', 'ssr-hover-border-sky'],
  ]),
};
const fluenticCompiledExtractedCss0 = combineStyleServerExtracted(fluenticCompiledExtractedStyles0);
const fluenticCompiledExtractedCss1 = combineStyleServerExtracted(fluenticCompiledExtractedStyles1);

const fluenticCompiledStaticStyles = {
  root: createExtractedSlot('fluentic-ssr-static-root', [
    ['ssr-static-align-items-center', 'ssr-static-align-items-center'],
    ['ssr-static-border-neutral', 'ssr-static-border-neutral'],
    ['ssr-static-radius-6', 'ssr-static-radius-6'],
    ['ssr-static-display-flex', 'ssr-static-display-flex'],
    ['ssr-static-min-height-28', 'ssr-static-min-height-28'],
    ['ssr-static-opacity', 'ssr-static-opacity'],
    ['ssr-static-media-min-width-52', 'ssr-static-media-min-width-52'],
    ['ssr-static-hover-border-sky', 'ssr-static-hover-border-sky'],
  ]),
  label: createExtractedSlot('fluentic-ssr-static-label', [
    ['ssr-static-label-color', 'ssr-static-label-color'],
    ['ssr-static-label-weight', 'ssr-static-label-weight'],
  ]),
};
const fluenticCompiledStaticScope = createExtractedScope([
  [4, 'fluentic-ssr-static-root', 'ssr-static-scope-root', 'ssr-static-scope-root', true],
  [4, 'fluentic-ssr-static-label', 'ssr-static-scope-label', 'ssr-static-scope-label'],
]);
const fluenticCompiledStaticScopeTarget = bindScope(
  fluenticCompiledStaticStyles.root,
  fluenticCompiledStaticScope,
);
const fluenticCompiledStaticCss = combineStyleServerExtracted(
  fluenticCompiledStaticStyles,
  fluenticCompiledStaticScopeTarget,
);
const fluenticCompiledStaticClassName = getClassNameServerExtracted(
  fluenticCompiledStaticCss.root,
).className;

const fluenticRuntimeRenderLocalMergedBase = style({
  gap: 12,
  padding: 24,
});
const fluenticCompiledWithTokensColor = createExtractedToken('ssr-dynamic-color', null);
const fluenticCompiledWithTokensBorderColor = createExtractedToken('ssr-dynamic-border-color', null);
const fluenticCompiledWithTokensBase = createExtractedStyle([
  ['ssr-gap', 'ssr-gap', [1, '--ssr-dynamic-gap', 12, 1]],
  ['ssr-padding', 'ssr-padding', [1, '--ssr-dynamic-padding', 24, 1]],
]);
const fluenticCompiledWithTokensStyle = createExtractedStyleMerge(
  [
    ['ssr-color', 'ssr-color', [1, '--ssr-dynamic-color', fluenticCompiledWithTokensColor, 1]],
    ['ssr-background-white', 'ssr-background-white'],
    [
      'ssr-hover-border-color',
      'ssr-hover-border-color',
      [1, '--ssr-dynamic-border-color', fluenticCompiledWithTokensBorderColor, 1],
    ],
  ],
  fluenticCompiledWithTokensBase,
);
const stylexCompiledInactive = {
  alignItems: 'stylex-align-items-center',
  border: 'stylex-border-neutral',
  borderRadius: 'stylex-radius-6',
  display: 'stylex-display-flex',
  minHeight: 'stylex-min-height-28',
  opacity: 'stylex-opacity-inactive',
  mediaMinWidth: 'stylex-media-min-width-52',
  hoverBorder: 'stylex-hover-border-sky',
  $$css: true,
};
const stylexCompiledActive = {
  alignItems: 'stylex-align-items-center',
  border: 'stylex-border-active',
  borderRadius: 'stylex-radius-6',
  display: 'stylex-display-flex',
  minHeight: 'stylex-min-height-28',
  opacity: 'stylex-opacity-active',
  mediaMinWidth: 'stylex-media-min-width-52',
  hoverBorder: 'stylex-hover-border-sky',
  $$css: true,
};
const stylexCompiledStaticProps = stylex.props(stylexCompiledInactive);

const components = {
  gooberObject: gooberStyled('div')(objectStyle),
  gooberTagged: gooberStyled(
    'div',
  )(
    taggedStyle,
    (props) => isActive(props) ? '#16a34a' : '#d4d4d8',
    (props) => isActive(props) ? 1 : 0.68,
  ),
  gooberArray: gooberStyled('div')(arrayStyle),
  styledComponentsObject: styled.div(objectStyle),
  styledComponentsTagged: styled.div(
    taggedStyle,
    (props) => isActive(props) ? '#16a34a' : '#d4d4d8',
    (props) => isActive(props) ? 1 : 0.68,
  ),
  styledComponentsArray: styled.div(arrayStyle),
  emotionObject: emotionStyled.div(objectStyle),
  emotionTagged: emotionStyled.div(
    taggedStyle,
    (props) => isActive(props) ? '#16a34a' : '#d4d4d8',
    (props) => isActive(props) ? 1 : 0.68,
  ),
  emotionArray: emotionStyled.div(arrayStyle),
};

function ReactBareDiv() {
  return reactCreateElement('div', { className: 'ssr-static-align-items-center' });
}

function FluenticRuntimeNoCss() {
  return fluenticCreateElement('div', { className: 'ssr-static-align-items-center' });
}

function FluenticServerExtractedNoCss() {
  return fluenticServerExtractedCreateElement('div', { className: 'ssr-static-align-items-center' });
}

function FluenticServerExtractedStaticClassName() {
  return fluenticServerExtractedCreateElement('div', { className: fluenticCompiledStaticClassName });
}

function StyleXPrecomputedStaticPropsBaseline() {
  return reactCreateElement('div', stylexCompiledStaticProps);
}

function StyleXCompiledStyleqHoistedSwitch(props) {
  return reactCreateElement('div', stylex.props(isActive(props) ? stylexCompiledActive : stylexCompiledInactive));
}

function FluenticRuntimeDynamic(props) {
  const styles = {
    root: style
      .slot({
        alignItems: 'center',
        border: `1px solid ${isActive(props) ? '#16a34a' : '#d4d4d8'}`,
        borderRadius: 6,
        display: 'flex',
        minHeight: 28,
        opacity: isActive(props) ? 1 : 0.68,
      })
      .media('(min-width: 1px)', { minWidth: 52 })
      .hover({ borderColor: '#0ea5e9' }),
  };
  const css = combineStyle(styles);

  return fluenticCreateElement('div', { css: css.root });
}

function FluenticRuntimeRenderLocalMergedDynamic(props) {
  const color = isActive(props) ? '#16a34a' : '#d4d4d8';
  const localDynamic = style({
    color,
    backgroundColor: 'white',
  }).hover({
    borderColor: color,
  }).merge(fluenticRuntimeRenderLocalMergedBase);

  return fluenticCreateElement('div', { css: localDynamic });
}

function FluenticRuntimeHoisted(props) {
  const css = combineStyle(isActive(props) ? fluenticStyles1 : fluenticStyles0);

  return fluenticCreateElement('div', { css: css.root });
}

function FluenticServerExtractedDynamic(props) {
  const styles = {
    root: styleServerExtracted
      .slot({
        alignItems: 'center',
        border: `1px solid ${isActive(props) ? '#16a34a' : '#d4d4d8'}`,
        borderRadius: 6,
        display: 'flex',
        minHeight: 28,
        opacity: isActive(props) ? 1 : 0.68,
      })
      .media('(min-width: 1px)', { minWidth: 52 })
      .hover({ borderColor: '#0ea5e9' }),
  };
  const css = combineStyleServerExtracted(styles);

  return fluenticServerExtractedCreateElement('div', { css: css.root });
}

function FluenticServerExtractedHoisted(props) {
  const css = combineStyleServerExtracted(
    isActive(props) ? fluenticServerExtractedStyles1 : fluenticServerExtractedStyles0,
  );

  return fluenticServerExtractedCreateElement('div', { css: css.root });
}

function FluenticServerExtractedDirectStyle(props) {
  const styles = isActive(props) ? fluenticServerExtractedStyles1 : fluenticServerExtractedStyles0;

  return fluenticServerExtractedCreateElement('div', { css: styles.root });
}

function FluenticCompiledExtractedHoisted(props) {
  const css = isActive(props) ? fluenticCompiledExtractedCss1 : fluenticCompiledExtractedCss0;

  return fluenticServerExtractedCreateElement('div', { css: css.root });
}

function FluenticCompiledExtractedDirectStyle(props) {
  const styles = isActive(props) ? fluenticCompiledExtractedStyles1 : fluenticCompiledExtractedStyles0;

  return fluenticServerExtractedCreateElement('div', { css: styles.root });
}

function FluenticCompiledExtractedStaticCombineStyle() {
  const css = combineStyleServerExtracted(
    fluenticCompiledStaticStyles,
    fluenticCompiledStaticScopeTarget,
  );

  return fluenticServerExtractedCreateElement('div', { css: css.root });
}

function FluenticCompiledExtractedWithTokensDynamic(props) {
  const color = isActive(props) ? '#16a34a' : '#d4d4d8';
  const localDynamic = withTokens(fluenticCompiledWithTokensStyle, [
    fluenticCompiledWithTokensColor(color),
    fluenticCompiledWithTokensBorderColor(color),
  ]);

  return fluenticServerExtractedCreateElement('div', { css: localDynamic });
}

let counter = 0;
function renderComponent(Component) {
  counter += 1;
  const html = renderToString(reactCreateElement(Component, { 'data-active': counter % 2 === 0 ? '1' : '0' }));

  if (html.length === 0) throw new Error('SSR benchmark rendered empty HTML');
}

const suite = new Benchmark.Suite('ssr-style');

function shouldRun(name) {
  return !VARIANTS.size || VARIANTS.has(name);
}

function addBench(name, fn) {
  if (!shouldRun(name)) return suite;

  return suite.add(name, fn, {
    minTime: MIN_TIME,
    maxTime: MAX_TIME,
  });
}

for (const [name, Component] of Object.entries(components)) {
  addBench(name, () => renderComponent(Component));
}

addBench('reactBareDiv', () => renderComponent(ReactBareDiv));
addBench('fluenticRuntimeNoCss', () => renderComponent(FluenticRuntimeNoCss));
addBench('fluenticServerExtractedNoCss', () => renderComponent(FluenticServerExtractedNoCss));
addBench('fluenticServerExtractedStaticClassName', () => renderComponent(FluenticServerExtractedStaticClassName));
addBench('stylexPrecomputedStaticPropsBaseline', () => renderComponent(StyleXPrecomputedStaticPropsBaseline));
addBench('stylexCompiledStyleqHoistedSwitch', () => renderComponent(StyleXCompiledStyleqHoistedSwitch));
addBench('fluenticRuntimeDynamicObject', () => renderComponent(FluenticRuntimeDynamic));
addBench('fluenticRuntimeRenderLocalMergedDynamic', () => renderComponent(FluenticRuntimeRenderLocalMergedDynamic));
addBench('fluenticRuntimeHoistedSwitch', () => renderComponent(FluenticRuntimeHoisted));
addBench('fluenticServerExtractedDynamicObject', () => renderComponent(FluenticServerExtractedDynamic));
addBench('fluenticServerExtractedHoistedSwitch', () => renderComponent(FluenticServerExtractedHoisted));
addBench('fluenticServerExtractedDirectStyleSwitch', () => renderComponent(FluenticServerExtractedDirectStyle));
addBench('fluenticCompiledExtractedHoistedSwitch', () => renderComponent(FluenticCompiledExtractedHoisted));
addBench('fluenticCompiledExtractedDirectStyleSwitch', () => renderComponent(FluenticCompiledExtractedDirectStyle));
addBench(
  'fluenticCompiledExtractedStaticCombineStyle',
  () => renderComponent(FluenticCompiledExtractedStaticCombineStyle),
);
addBench(
  'fluenticCompiledExtractedWithTokensDynamic',
  () => renderComponent(FluenticCompiledExtractedWithTokensDynamic),
);

suite
  .on('start', function(event) {
    console.log(`Starting ${event.currentTarget.name} benchmark...`);
  })
  .on('cycle', (event) => {
    console.log(String(event.target));
  })
  .on('complete', function() {
    const results = [];

    this.forEach((bench) => {
      results.push({
        name: bench.name,
        opsPerSecond: bench.hz,
        marginOfError: bench.stats.rme,
        samples: bench.stats.sample.length,
        meanSeconds: bench.stats.mean,
        deviationSeconds: bench.stats.deviation,
      });
    });

    results.sort((a, b) => b.opsPerSecond - a.opsPerSecond);

    const report = {
      kind: 'ssr-style-serialization-benchmark',
      createdAt: new Date().toISOString(),
      source: 'Inspired by goober benchmarks/perf.cjs styled SSR renderToString suites.',
      settings: {
        minTime: MIN_TIME,
        maxTime: MAX_TIME,
        mode: 'renderToString-only',
        notes: [
          'This suite measures styled component/render style resolution cost only.',
          'It does not include server stylesheet collection or CSS extraction APIs.',
          'The CSS payload uses valid base, dynamic, media, and hover declarations for every library.',
        ],
      },
      environment: {
        node: process.version,
        v8: process.versions.v8,
        platform: process.platform,
        arch: process.arch,
      },
      results,
    };

    mkdirSync(OUT_DIR, { recursive: true });
    const outputPath = join(OUT_DIR, `ssr-style-${Date.now()}.json`);
    writeFileSync(outputPath, JSON.stringify(report, null, 2));

    console.log('\nRanked results:');
    console.table(
      results.map((result, index) => ({
        rank: index + 1,
        name: result.name,
        opsPerSecond: Math.round(result.opsPerSecond),
        marginOfError: `${result.marginOfError.toFixed(2)}%`,
        samples: result.samples,
      })),
    );
    console.log(`\nSSR style benchmark report: ${outputPath}`);
  })
  .run({ async: false });
