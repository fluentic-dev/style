import { css as emotionCss } from '@emotion/css';
import { combineStyle, createElement as fluenticCreateElement, getClassName, style } from '@fluentic/style';
import { css as gooberCss, setup as setupGoober } from 'goober';
import React from 'react';
import { createRoot } from 'react-dom/client';
import styled from 'styled-components';

setupGoober(React.createElement);

const params = new URLSearchParams(window.location.search);
const ITEMS = Number(params.get('items') || 1000);
const WARMUPS = Number(params.get('warmups') || 3);
const MEASURED = Number(params.get('measured') || 20);
const UPDATE_STEPS = Number(params.get('updateSteps') || 20);

const baseBoxStyle = {
  alignItems: 'center',
  background: '#f8fafc',
  border: '1px solid #d4d4d8',
  borderRadius: 6,
  color: '#18181b',
  display: 'flex',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 12,
  height: 28,
  justifyContent: 'center',
};
const activeBoxStyle = { background: '#dcfce7', borderColor: '#16a34a' };
const dimmedBoxStyle = { opacity: 0.68 };
const dynamicVarStyle = {
  ...baseBoxStyle,
  background: 'hsl(var(--box-hue) 74% 92%)',
  borderColor: 'hsl(var(--box-hue) 62% 42%)',
  boxShadow: '0 0 0 var(--box-ring) hsl(var(--box-hue) 74% 72%)',
  opacity: 'var(--box-opacity)',
  transform: 'translate3d(var(--box-x), 0, 0) scale(var(--box-scale))',
};

let fluenticHoistedStyles;
function getFluenticHoistedStyles() {
  if (fluenticHoistedStyles) return fluenticHoistedStyles;

  const box = style
    .slot(baseBoxStyle)
    .media('(min-width: 1px)', { minHeight: 28 })
    .hover({ borderColor: '#0ea5e9' });
  const active = style.slot(activeBoxStyle);
  const dimmed = style.slot(dimmedBoxStyle);

  fluenticHoistedStyles = { box, active, dimmed };
  return fluenticHoistedStyles;
}

let gooberStyles;
function getGooberStyles() {
  if (gooberStyles) return gooberStyles;

  gooberStyles = {
    box: gooberCss({
      ...baseBoxStyle,
      '@media (min-width: 1px)': {
        minHeight: 28,
      },
      '&:hover': {
        borderColor: '#0ea5e9',
      },
    }),
    active: gooberCss(activeBoxStyle),
    dimmed: gooberCss(dimmedBoxStyle),
  };
  return gooberStyles;
}

let emotionStyles;
function getEmotionStyles() {
  if (emotionStyles) return emotionStyles;

  emotionStyles = {
    box: emotionCss({
      ...baseBoxStyle,
      '@media (min-width: 1px)': {
        minHeight: 28,
      },
      '&:hover': {
        borderColor: '#0ea5e9',
      },
    }),
    active: emotionCss(activeBoxStyle),
    dimmed: emotionCss(dimmedBoxStyle),
  };
  return emotionStyles;
}

let fluenticDynamicVarStyles;
function getFluenticDynamicVarStyles() {
  if (fluenticDynamicVarStyles) return fluenticDynamicVarStyles;

  fluenticDynamicVarStyles = {
    box: style
      .slot(dynamicVarStyle)
      .media('(min-width: 1px)', { minHeight: 28 })
      .hover({ filter: 'saturate(1.2)' }),
  };
  return fluenticDynamicVarStyles;
}

let gooberDynamicVarClassName;
function getGooberDynamicVarClassName() {
  if (gooberDynamicVarClassName) return gooberDynamicVarClassName;

  gooberDynamicVarClassName = gooberCss({
    ...dynamicVarStyle,
    '@media (min-width: 1px)': {
      minHeight: 28,
    },
    '&:hover': {
      filter: 'saturate(1.2)',
    },
  });
  return gooberDynamicVarClassName;
}

let emotionDynamicVarClassName;
function getEmotionDynamicVarClassName() {
  if (emotionDynamicVarClassName) return emotionDynamicVarClassName;

  emotionDynamicVarClassName = emotionCss({
    ...dynamicVarStyle,
    '@media (min-width: 1px)': {
      minHeight: 28,
    },
    '&:hover': {
      filter: 'saturate(1.2)',
    },
  });
  return emotionDynamicVarClassName;
}

function createInlineFluenticStyle(isActive) {
  return style
    .slot({
      ...baseBoxStyle,
      background: isActive ? '#dcfce7' : '#f8fafc',
      border: `1px solid ${isActive ? '#16a34a' : '#d4d4d8'}`,
      opacity: isActive ? 1 : 0.68,
    })
    .media('(min-width: 1px)', { minHeight: 28 })
    .hover({ borderColor: '#0ea5e9' });
}

function createInlineFluenticDynamicValueStyle(id, tick) {
  const vars = getDynamicValues(id, tick);

  return style
    .slot({
      ...baseBoxStyle,
      background: `hsl(${vars.hue} 74% 92%)`,
      borderColor: `hsl(${vars.hue} 62% 42%)`,
      boxShadow: `0 0 0 ${vars.ring} hsl(${vars.hue} 74% 72%)`,
      opacity: vars.opacity,
      transform: `translate3d(${vars.x}, 0, 0) scale(${vars.scale})`,
    })
    .media('(min-width: 1px)', { minHeight: 28 })
    .hover({ filter: 'saturate(1.2)' });
}

function createInlineRuntimeStyle(isActive) {
  return {
    ...baseBoxStyle,
    background: isActive ? '#dcfce7' : '#f8fafc',
    border: `1px solid ${isActive ? '#16a34a' : '#d4d4d8'}`,
    opacity: isActive ? 1 : 0.68,
    '@media (min-width: 1px)': {
      minHeight: 28,
    },
    '&:hover': {
      borderColor: '#0ea5e9',
    },
  };
}

let StyledBox;
function getStyledBox() {
  if (StyledBox) return StyledBox;

  StyledBox = styled.div`
    align-items: center;
    background: ${(props) => props.$active ? '#dcfce7' : '#f8fafc'};
    border: 1px solid ${(props) => props.$active ? '#16a34a' : '#d4d4d8'};
    border-radius: 6px;
    color: #18181b;
    display: flex;
    font-family: system-ui, sans-serif;
    font-size: 12px;
    height: 28px;
    justify-content: center;
    opacity: ${(props) => props.$active ? 1 : 0.68};

    @media (min-width: 1px) {
      min-height: 28px;
    }

    &:hover {
      border-color: #0ea5e9;
    }
  `;
  return StyledBox;
}

let StyledDynamicVarsBox;
function getStyledDynamicVarsBox() {
  if (StyledDynamicVarsBox) return StyledDynamicVarsBox;

  StyledDynamicVarsBox = styled.div`
    align-items: center;
    background: hsl(var(--box-hue) 74% 92%);
    border: 1px solid hsl(var(--box-hue) 62% 42%);
    border-radius: 6px;
    box-shadow: 0 0 0 var(--box-ring) hsl(var(--box-hue) 74% 72%);
    color: #18181b;
    display: flex;
    font-family: system-ui, sans-serif;
    font-size: 12px;
    height: 28px;
    justify-content: center;
    opacity: var(--box-opacity);
    transform: translate3d(var(--box-x), 0, 0) scale(var(--box-scale));

    @media (min-width: 1px) {
      min-height: 28px;
    }

    &:hover {
      filter: saturate(1.2);
    }
  `;
  return StyledDynamicVarsBox;
}

const ids = Array.from({ length: ITEMS }, (_, index) => index);

function ParentHoisted({ tick }) {
  const css = combineStyle(getFluenticHoistedStyles());

  return (
    <div className='grid'>
      {ids.map((id) => (
        renderFluenticBox(
          [css.box, id === tick % ITEMS ? css.active : css.dimmed],
          id,
          id,
        )
      ))}
    </div>
  );
}

function ParentHoistedClassName({ tick }) {
  const css = combineStyle(getFluenticHoistedStyles());
  const activeClassName = getClassName([css.box, css.active]).className;
  const dimmedClassName = getClassName([css.box, css.dimmed]).className;

  return (
    <div className='grid'>
      {ids.map((id) => (
        <div key={id} className={id === tick % ITEMS ? activeClassName : dimmedClassName}>
          {id}
        </div>
      ))}
    </div>
  );
}

function FluenticNoCssCreateElement({ tick }) {
  return (
    <div className='grid'>
      {ids.map((id) => (
        fluenticCreateElement(
          'div',
          {
            key: id,
            className: id === tick % ITEMS ? 'bench-box active' : 'bench-box dimmed',
          },
          id,
        )
      ))}
    </div>
  );
}

function ReactNoCssCreateElement({ tick }) {
  return React.createElement(
    'div',
    { className: 'grid' },
    ids.map((id) =>
      React.createElement(
        'div',
        {
          key: id,
          className: id === tick % ITEMS ? 'bench-box active' : 'bench-box dimmed',
        },
        id,
      )
    ),
  );
}

function ChildHoistedSameMap({ tick }) {
  return (
    <div className='grid'>
      {ids.map((id) => <ChildHoistedBox key={id} id={id} active={id === tick % ITEMS} />)}
    </div>
  );
}

function ChildHoistedBox({ id, active: isActive }) {
  const css = combineStyle(getFluenticHoistedStyles());

  return renderFluenticBox([css.box, isActive ? css.active : css.dimmed], id);
}

function ChildNewMapSameSlots({ tick }) {
  return (
    <div className='grid'>
      {ids.map((id) => <ChildNewMapBox key={id} id={id} active={id === tick % ITEMS} />)}
    </div>
  );
}

function ChildNewMapBox({ id, active: isActive }) {
  const { box, active, dimmed } = getFluenticHoistedStyles();
  const css = combineStyle({ box, active, dimmed });

  return renderFluenticBox([css.box, isActive ? css.active : css.dimmed], id);
}

function ChildInlineDynamic({ tick }) {
  return (
    <div className='grid'>
      {ids.map((id) => <ChildInlineDynamicBox key={id} id={id} active={id === tick % ITEMS} />)}
    </div>
  );
}

function ChildInlineDynamicBox({ id, active: isActive }) {
  const styles = {
    box: createInlineFluenticStyle(isActive),
  };
  const css = combineStyle(styles);

  return renderFluenticBox(css.box, id);
}

function renderFluenticBox(cssValue, id, key) {
  return fluenticCreateElement('div', { key, css: cssValue }, id);
}

function getDynamicValues(id, tick) {
  const phase = id + tick;

  return {
    hue: (id * 17 + tick * 23) % 360,
    opacity: 0.62 + ((phase % 9) / 20),
    ring: `${phase % 5}px`,
    scale: (0.94 + ((phase % 7) / 50)).toFixed(2),
    x: `${(phase % 13) - 6}px`,
  };
}

function getDynamicVars(id, tick) {
  const vars = getDynamicValues(id, tick);

  return {
    '--box-hue': String(vars.hue),
    '--box-opacity': String(vars.opacity),
    '--box-ring': vars.ring,
    '--box-scale': vars.scale,
    '--box-x': vars.x,
  };
}

function FluenticDynamicVars({ tick }) {
  const css = combineStyle(getFluenticDynamicVarStyles());

  return (
    <div className='grid'>
      {ids.map((id) => (
        fluenticCreateElement('div', { key: id, css: css.box, style: getDynamicVars(id, tick) }, id)
      ))}
    </div>
  );
}

function FluenticInlineDynamicValues({ tick }) {
  return (
    <div className='grid'>
      {ids.map((id) => <FluenticInlineDynamicValueBox key={id} id={id} tick={tick} />)}
    </div>
  );
}

function FluenticInlineDynamicValueBox({ id, tick }) {
  const css = combineStyle({ box: createInlineFluenticDynamicValueStyle(id, tick) });

  return renderFluenticBox(css.box, id);
}

function GooberHoistedClass({ tick }) {
  const css = getGooberStyles();

  return (
    <div className='grid'>
      {ids.map((id) => (
        <div
          key={id}
          className={`${css.box} ${id === tick % ITEMS ? css.active : css.dimmed}`}
        >
          {id}
        </div>
      ))}
    </div>
  );
}

function GooberInlineDynamic({ tick }) {
  return (
    <div className='grid'>
      {ids.map((id) => <GooberInlineDynamicBox key={id} id={id} active={id === tick % ITEMS} />)}
    </div>
  );
}

function GooberInlineDynamicBox({ id, active: isActive }) {
  const className = gooberCss(createInlineRuntimeStyle(isActive));

  return <div className={className}>{id}</div>;
}

function GooberDynamicVars({ tick }) {
  const className = getGooberDynamicVarClassName();

  return (
    <div className='grid'>
      {ids.map((id) => <div key={id} className={className} style={getDynamicVars(id, tick)}>{id}</div>)}
    </div>
  );
}

function EmotionHoistedClass({ tick }) {
  const css = getEmotionStyles();

  return (
    <div className='grid'>
      {ids.map((id) => (
        <div
          key={id}
          className={`${css.box} ${id === tick % ITEMS ? css.active : css.dimmed}`}
        >
          {id}
        </div>
      ))}
    </div>
  );
}

function EmotionInlineDynamic({ tick }) {
  return (
    <div className='grid'>
      {ids.map((id) => <EmotionInlineDynamicBox key={id} id={id} active={id === tick % ITEMS} />)}
    </div>
  );
}

function EmotionInlineDynamicBox({ id, active: isActive }) {
  const className = emotionCss(createInlineRuntimeStyle(isActive));

  return <div className={className}>{id}</div>;
}

function EmotionDynamicVars({ tick }) {
  const className = getEmotionDynamicVarClassName();

  return (
    <div className='grid'>
      {ids.map((id) => <div key={id} className={className} style={getDynamicVars(id, tick)}>{id}</div>)}
    </div>
  );
}

function StyledComponentsDynamicProp({ tick }) {
  const Box = getStyledBox();

  return (
    <div className='grid'>
      {ids.map((id) => <Box key={id} $active={id === tick % ITEMS}>{id}</Box>)}
    </div>
  );
}

function StyledComponentsDynamicVars({ tick }) {
  const Box = getStyledDynamicVarsBox();

  return (
    <div className='grid'>
      {ids.map((id) => <Box key={id} style={getDynamicVars(id, tick)}>{id}</Box>)}
    </div>
  );
}

const variants = {
  parentHoisted: ParentHoisted,
  parentHoistedClassName: ParentHoistedClassName,
  childHoistedSameMap: ChildHoistedSameMap,
  childNewMapSameSlots: ChildNewMapSameSlots,
  childInlineDynamic: ChildInlineDynamic,
  fluenticNoCssCreateElement: FluenticNoCssCreateElement,
  reactNoCssCreateElement: ReactNoCssCreateElement,
  gooberHoistedClass: GooberHoistedClass,
  gooberInlineDynamic: GooberInlineDynamic,
  emotionHoistedClass: EmotionHoistedClass,
  emotionInlineDynamic: EmotionInlineDynamic,
  styledComponentsDynamicProp: StyledComponentsDynamicProp,
  fluenticDynamicVars: FluenticDynamicVars,
  fluenticInlineDynamicValues: FluenticInlineDynamicValues,
  gooberDynamicVars: GooberDynamicVars,
  emotionDynamicVars: EmotionDynamicVars,
  styledComponentsDynamicVars: StyledComponentsDynamicVars,
};

function twoFrames() {
  return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

function readStyleTelemetry() {
  let ruleCount = 0;
  let cssTextBytes = 0;

  function visitRules(rules) {
    ruleCount += rules.length;

    for (let i = 0; i < rules.length; i++) {
      const rule = rules[i];
      cssTextBytes += rule.cssText.length;
      if (rule.cssRules) visitRules(rule.cssRules);
    }
  }

  for (const sheet of document.styleSheets) {
    try {
      visitRules(sheet.cssRules || []);
    } catch {
      // Same-origin benchmark sheets should be readable; skip if a browser blocks one.
    }
  }

  return {
    styleTagCount: document.querySelectorAll('style').length,
    fluenticStyleTagCount: document.querySelectorAll('style[data-css-sheet]').length,
    ruleCount,
    cssTextBytes,
  };
}

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values) {
  const sorted = values.slice().sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function p95(values) {
  const sorted = values.slice().sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1);

  return sorted[index];
}

function summarize(values) {
  return {
    mean: mean(values),
    median: median(values),
    min: Math.min(...values),
    max: Math.max(...values),
    p95: p95(values),
    values,
  };
}

async function runCase(Component) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);

  const mountStartedAt = performance.now();
  root.render(<Component tick={0} />);
  await twoFrames();
  const mountMs = performance.now() - mountStartedAt;

  const updateValues = [];
  for (let i = 1; i <= UPDATE_STEPS; i++) {
    const updateStartedAt = performance.now();
    root.render(<Component tick={i} />);
    await twoFrames();
    updateValues.push(performance.now() - updateStartedAt);
  }

  root.unmount();
  host.remove();

  return {
    mountMs,
    updateMs: mean(updateValues),
  };
}

async function runVariant(name, Component) {
  for (let i = 0; i < WARMUPS; i++) {
    await runCase(Component);
  }

  const samples = [];
  for (let i = 0; i < MEASURED; i++) {
    samples.push(await runCase(Component));
  }

  return {
    variant: name,
    items: ITEMS,
    warmups: WARMUPS,
    measured: MEASURED,
    updateSteps: UPDATE_STEPS,
    mountMs: summarize(samples.map((sample) => sample.mountMs)),
    updateMs: summarize(samples.map((sample) => sample.updateMs)),
    styleTelemetry: readStyleTelemetry(),
  };
}

async function run() {
  const variant = params.get('variant') || 'parentHoisted';
  const Component = variants[variant];

  if (!Component) {
    throw new Error(`Unknown variant: ${variant}`);
  }

  window.__benchResult = await runVariant(variant, Component);
  return window.__benchResult;
}

function App() {
  const [result, setResult] = React.useState(null);
  const [running, setRunning] = React.useState(false);

  async function runAndSetResult() {
    setRunning(true);
    try {
      setResult(await run());
    } finally {
      setRunning(false);
    }
  }

  React.useEffect(() => {
    if (params.get('autorun') === '1') {
      void runAndSetResult();
    }
  }, []);

  return (
    <main style={{ padding: 16, fontFamily: 'system-ui, sans-serif' }}>
      <style>
        {`
          .grid {
            display: grid;
            gap: 4px;
            grid-template-columns: repeat(auto-fill, minmax(52px, 1fr));
          }
          .bench-box {
            align-items: center;
            background: #f8fafc;
            border: 1px solid #d4d4d8;
            border-radius: 6px;
            color: #18181b;
            display: flex;
            font-family: system-ui, sans-serif;
            font-size: 12px;
            height: 28px;
            justify-content: center;
          }
          .bench-box.active {
            background: #dcfce7;
            border-color: #16a34a;
          }
          .bench-box.dimmed {
            opacity: 0.68;
          }
        `}
      </style>
      <h1>Style Cache Benchmark</h1>
      <button
        onClick={() => {
          void runAndSetResult();
        }}
        disabled={running}
      >
        {running ? 'Running...' : 'Run'}
      </button>
      {result && <pre>{JSON.stringify(result, null, 2)}</pre>}
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
