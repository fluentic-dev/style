/// <reference types="vite/client" />
import 'virtual:fluentic-style';

import { style } from '@fluentic/style';
import {
  createCounterStyle,
  createFontFace,
  createFontPaletteValues,
  createKeyframes,
  createPositionTry,
  createProperty,
} from '@fluentic/style/css';
import React from 'react';
import { createRoot } from 'react-dom/client';

const enter = createKeyframes({
  from: {
    opacity: 0,
    transform: 'translateY(12px) scale(0.98)',
  },
  to: {
    opacity: 1,
    transform: 'none',
  },
});

const tileMotion = createKeyframes({
  from: {
    transform: 'translateX(0)',
  },
  to: {
    transform: 'translateX(18px)',
  },
});

const cardGlow = createKeyframes({
  from: {
    backgroundColor: '#ffffff',
    borderColor: '#d9dee8',
    boxShadow: '0 14px 38px rgba(28, 34, 48, 0.08)',
    transform: 'translateY(0)',
  },
  to: {
    backgroundColor: '#f8fbff',
    borderColor: '#9bb2f1',
    boxShadow: '0 18px 42px rgba(47, 95, 218, 0.18)',
    transform: 'translateY(-5px)',
  },
});

const demoFont = createFontFace({
  src: 'local("Georgia")',
  fontDisplay: 'swap',
  fontStyle: 'normal',
  fontWeight: 400,
});

const menuPosition = createPositionTry({
  positionArea: 'top',
  margin: '8px',
});

const markerStyle = createCounterStyle({
  system: 'cyclic',
  symbols: '"◆" "◇"',
  suffix: '" "',
});

const spinAngle = createProperty('--at-rule-spin-angle', {
  syntax: '"<angle>"',
  inherits: false,
  initialValue: '0deg',
});

const palette = createFontPaletteValues({
  fontFamily: 'system-ui',
  basePalette: 1,
});

const styles = {
  page: style({
    minHeight: '100vh',
    margin: 0,
    backgroundColor: '#f6f7f9',
    color: '#1a1f2c',
    fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
    padding: 24,
  }),
  shell: style({
    width: '100%',
    maxWidth: 1120,
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 18,
  }),
  header: style({
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  }),
  eyebrow: style({
    margin: 0,
    color: '#5d6676',
    fontSize: 13,
    fontWeight: 800,
    textTransform: 'uppercase',
  }),
  title: style({
    margin: 0,
    fontSize: 34,
    lineHeight: 1.1,
  }),
  copy: style({
    maxWidth: 760,
    margin: 0,
    color: '#596273',
    lineHeight: 1.6,
  }),
  grid: style({
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'stretch',
    gap: 12,
  }),
  item: style({
    boxSizing: 'border-box',
    minHeight: 172,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    border: '1px solid #d9dee8',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    boxShadow: '0 14px 38px rgba(28, 34, 48, 0.08)',
    padding: 18,
    animationName: enter,
    animationDuration: '520ms',
    animationFillMode: 'both',
    animationTimingFunction: 'cubic-bezier(.2,.8,.2,1)',
  }),
  regularItem: style({
    flex: '0 0 calc(50% - 6px)',
    height: 220,
    minWidth: 0,
  }).media('(max-width: 860px)', {
    flex: '0 0 100%',
    height: 'auto',
    minWidth: 0,
  }),
  timelineItem: style({
    flex: '0 0 calc(50% - 6px)',
    height: 430,
  }).media('(max-width: 860px)', {
    flex: '0 0 100%',
  }),
  keyframesItem: style({
    animationName: cardGlow,
    animationDuration: '2.4s',
    animationIterationCount: 'infinite',
    animationDirection: 'alternate',
  }),
  animatedPreview: style({
    animationName: tileMotion,
    animationDuration: '1.8s',
    animationIterationCount: 'infinite',
    animationDirection: 'alternate',
    animationTimingFunction: 'cubic-bezier(.2,.8,.2,1)',
  }),
  animatedBadge: style({
    alignSelf: 'start',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    backgroundColor: '#eaf0ff',
    color: '#2f5fda',
    fontSize: 13,
    fontWeight: 900,
    padding: '7px 10px',
    boxShadow: 'inset 0 0 0 1px rgba(47, 95, 218, 0.12)',
  }),
  animatedDot: style({
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#2f5fda',
  }),
  label: style({
    margin: 0,
    color: '#20283a',
    fontSize: 17,
    fontWeight: 800,
  }),
  code: style({
    margin: 0,
    color: '#596273',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    fontSize: 12,
    lineHeight: 1.55,
  }),
  preview: style({
    minHeight: 42,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    borderRadius: 6,
    backgroundColor: '#f4f6fa',
    color: '#20283a',
    padding: '10px 12px',
  }),
  fontFace: style({
    fontFamily: demoFont,
    fontSize: 20,
    letterSpacing: 0,
  }),
  positionTry: style({
    height: 280,
    alignItems: 'stretch',
    position: 'relative',
    overflow: 'hidden',
  }),
  propertyItem: style({
    height: 280,
  }),
  propertyStack: style({
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  }),
  positionPreview: style({
    flex: 1,
    minHeight: 170,
    width: '100%',
    position: 'relative',
    alignItems: 'stretch',
    overflow: 'hidden',
    backgroundColor: '#eef2f8',
  }),
  positionClipLabel: style({
    flex: '0 0 auto',
    color: '#6c7482',
    fontSize: 11,
    fontWeight: 800,
    textTransform: 'uppercase',
  }),
  positionScrollContent: style({
    boxSizing: 'border-box',
    width: '100%',
    flex: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 10,
    padding: 12,
  }),
  positionScene: style({
    boxSizing: 'border-box',
    flex: '1 1 0',
    minWidth: 0,
    minHeight: 150,
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    borderRadius: 6,
    border: '1px dashed #c7d1e3',
    backgroundColor: 'rgba(255, 255, 255, 0.42)',
    padding: 10,
  }),
  positionSceneLabel: style({
    color: '#6c7482',
    fontSize: 11,
    fontWeight: 800,
    textTransform: 'uppercase',
  }),
  positionAnchorWrap: style({
    position: 'relative',
    display: 'flex',
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  }),
  positionAnchorWrapEdge: style({
    alignItems: 'flex-end',
    paddingBottom: 8,
  }),
  positionAnchor: style({
    anchorName: '--menu-anchor',
    width: 92,
    borderRadius: 6,
    backgroundColor: '#2f5fda',
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 800,
    padding: '7px 9px',
    textAlign: 'center',
  }),
  positionAnchorFit: style({
    anchorName: '--menu-anchor-fit',
  }),
  positionAnchorEdge: style({
    anchorName: '--menu-anchor-edge',
  }),
  positionFallback: style({
    position: 'absolute',
    positionArea: 'bottom',
    positionTryFallbacks: menuPosition,
    border: '1px dashed #8ba0c8',
    borderRadius: 6,
    color: '#516079',
    fontSize: 12,
    fontWeight: 800,
    padding: '7px 9px',
    backgroundColor: '#ffffff',
    margin: 8,
    boxShadow: '0 8px 20px rgba(28, 34, 48, 0.12)',
  }),
  positionMenuFit: style({
    positionAnchor: '--menu-anchor-fit',
  }),
  positionMenuEdge: style({
    positionAnchor: '--menu-anchor-edge',
  }),
  positionGuide: style({
    flex: '0 0 auto',
    height: 1,
    borderBlockStart: '1px dashed #bdc8dc',
  }),
  counterList: style({
    listStyleType: markerStyle,
    paddingLeft: 22,
    margin: 0,
  }),
  registeredProperty: style({
    '--at-rule-spin-angle': '0deg',
    transform: 'rotate(var(--at-rule-spin-angle))',
    transitionProperty: spinAngle,
    transitionDuration: '300ms',
  } as never).hover({
    '--at-rule-spin-angle': '18deg',
  } as never),
  propertyPreview: style({
    justifyContent: 'space-between',
  }),
  propertyPreviewAlt: style({
    backgroundColor: '#eef2f8',
  }),
  propertyBox: style({
    width: 34,
    height: 34,
    borderRadius: 6,
    backgroundColor: '#db4f62',
  }),
  propertyBoxAlt: style({
    backgroundColor: '#2f5fda',
  }),
  palette: style({
    fontPalette: palette,
  }),
  palettePreview: style({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    fontPalette: palette,
    backgroundColor: '#eef2f8',
  }),
  paletteSwatches: style({
    display: 'flex',
    gap: 6,
    flexShrink: 0,
  }),
  paletteSwatch: style({
    width: 22,
    height: 22,
    borderRadius: 999,
    border: '1px solid rgba(32, 40, 58, 0.12)',
  }),
  paletteSample: style({
    fontSize: 18,
    fontWeight: 800,
    lineHeight: 1.2,
  }),
  timelineHint: style({
    margin: 0,
    color: '#596273',
    fontSize: 12,
    fontWeight: 800,
  }),
};

const demos = [
  {
    title: 'createKeyframes',
    css: styles.keyframesItem,
    detail: 'animationName consumes a generated @keyframes name.',
    value: tileMotion.value,
    preview: (
      <span css={[styles.animatedBadge, styles.animatedPreview]}>
        <span css={styles.animatedDot} />
        animated badge
      </span>
    ),
  },
  {
    title: 'createFontFace',
    css: styles.fontFace,
    detail: 'fontFamily consumes a generated @font-face family.',
    value: demoFont.value,
    preview: <span css={styles.preview}>Rendered through local Georgia</span>,
  },
  {
    title: 'createFontPaletteValues',
    css: styles.palette,
    detail: 'fontPalette consumes a generated @font-palette-values name.',
    value: palette.value,
    preview: (
      <span css={[styles.preview, styles.palettePreview]}>
        <span css={styles.paletteSample}>Palette value applied</span>
        <span css={styles.paletteSwatches} aria-hidden='true'>
          {['#2f5fda', '#db4f62', '#f3bd42', '#1f9d78'].map((color) => (
            <span css={styles.paletteSwatch} key={color} style={{ backgroundColor: color }} />
          ))}
        </span>
      </span>
    ),
  },
  {
    title: 'createCounterStyle',
    css: null,
    detail: 'listStyleType consumes a generated @counter-style name.',
    value: markerStyle.value,
    preview: null,
  },
  {
    title: 'createProperty',
    css: styles.propertyItem,
    detail: 'transitionProperty consumes a registered custom property name.',
    value: spinAngle.value,
    preview: (
      <div css={styles.propertyStack}>
        <div css={[styles.preview, styles.propertyPreview]}>
          <span>Hover square</span>
          <span css={[styles.propertyBox, styles.registeredProperty]} />
        </div>
        <div css={[styles.preview, styles.propertyPreview, styles.propertyPreviewAlt]}>
          <span>Same registered property</span>
          <span css={[styles.propertyBox, styles.propertyBoxAlt, styles.registeredProperty]} />
        </div>
      </div>
    ),
  },
  {
    title: 'createPositionTry',
    css: styles.positionTry,
    detail: 'positionTryFallbacks consumes a generated @position-try name.',
    value: menuPosition.value,
    preview: (
      <div css={[styles.preview, styles.positionPreview]}>
        <div css={styles.positionScrollContent}>
          <section css={styles.positionScene}>
            <span css={styles.positionSceneLabel}>preferred bottom fits</span>
            <span css={styles.positionAnchorWrap}>
              <span css={[styles.positionAnchor, styles.positionAnchorFit]}>anchor</span>
              <span css={[styles.positionFallback, styles.positionMenuFit]}>menu</span>
            </span>
          </section>
          <section css={styles.positionScene}>
            <span css={styles.positionSceneLabel}>edge: try top fallback</span>
            <span css={[styles.positionAnchorWrap, styles.positionAnchorWrapEdge]}>
              <span css={[styles.positionAnchor, styles.positionAnchorEdge]}>anchor</span>
              <span css={[styles.positionFallback, styles.positionMenuEdge]}>menu</span>
            </span>
          </section>
        </div>
      </div>
    ),
  },
];

function App() {
  return (
    <main css={styles.page}>
      <section css={styles.shell}>
        <header css={styles.header}>
          <p css={styles.eyebrow}>At-rule value refs</p>
          <h1 css={styles.title}>CSS resources, consumed as style values.</h1>
          <p css={styles.copy}>
            Each tile consumes a value produced by{' '}
            <code>@fluentic/style/css</code>. Build mode extracts the resource rules; runtime mode inserts them when the
            value is consumed.
          </p>
        </header>
        <div css={styles.grid}>
          {demos.map((demo) => (
            <article
              css={[
                styles.item,
                styles.regularItem,
                demo.css,
              ]}
              key={demo.title}
            >
              <h2 css={styles.label}>{demo.title}</h2>
              <p css={styles.copy}>{demo.detail}</p>
              <p css={styles.code}>{demo.value}</p>
              {demo.preview}
              {demo.title === 'createCounterStyle'
                ? (
                  <ul css={styles.counterList}>
                    <li>Custom marker</li>
                    <li>Extracted rule</li>
                  </ul>
                )
                : null}
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
