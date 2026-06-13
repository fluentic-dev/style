import emotionStyled from '@emotion/styled';
import { createElement as fluenticCreateElement, style, combineStyle } from '@fluentic/style';
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

function FluenticRuntimeHoisted(props) {
  const css = combineStyle(isActive(props) ? fluenticStyles1 : fluenticStyles0);

  return fluenticCreateElement('div', { css: css.root });
}

let counter = 0;
function renderComponent(Component) {
  counter += 1;
  const html = renderToString(reactCreateElement(Component, { 'data-active': counter % 2 === 0 ? '1' : '0' }));

  if (html.length === 0) throw new Error('SSR benchmark rendered empty HTML');
}

const suite = new Benchmark.Suite('ssr-style');

for (const [name, Component] of Object.entries(components)) {
  suite.add(name, () => renderComponent(Component), {
    minTime: MIN_TIME,
    maxTime: MAX_TIME,
  });
}

suite
  .add('fluenticRuntimeDynamicObject', () => renderComponent(FluenticRuntimeDynamic), {
    minTime: MIN_TIME,
    maxTime: MAX_TIME,
  })
  .add('fluenticRuntimeHoistedSwitch', () => renderComponent(FluenticRuntimeHoisted), {
    minTime: MIN_TIME,
    maxTime: MAX_TIME,
  })
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
