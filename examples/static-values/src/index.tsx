/// <reference types="vite/client" />
import 'virtual:fluentic-style';

import { combineStyle, createTheme, createToken, style } from '@fluentic/style';
import { createKeyframes } from '@fluentic/style/css';
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';

const motion = {
  enterTransform: createToken('scale(0.96) translateY(18px)', 'static-enter-transform'),
  liftTransform: createToken('translateY(-4px)', 'static-lift-transform'),
};

const enter = createKeyframes({
  from: {
    opacity: 0,
    transform: motion.enterTransform,
  },
  to: {
    opacity: 1,
    transform: 'none',
  },
});

const lift = createKeyframes({
  '0%': {
    transform: 'none',
  },
  '50%': {
    transform: motion.liftTransform,
  },
  '100%': {
    transform: 'none',
  },
});

const themes = [
  {
    label: 'Soft',
    theme: createTheme([
      motion.enterTransform('scale(0.96) translateY(18px)'),
      motion.liftTransform('translateY(-4px)'),
    ], 'static-soft-motion'),
  },
  {
    label: 'Snappy',
    theme: createTheme([
      motion.enterTransform('scale(0.9) translateY(28px)'),
      motion.liftTransform('translateY(-8px)'),
    ], 'static-snappy-motion'),
  },
];

const styles = {
  page: style({
    minHeight: '100vh',
    display: 'grid',
    placeItems: 'center',
    backgroundColor: '#f8fafc',
    color: '#172033',
    fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
    padding: 24,
  }),
  panel: style({
    width: 'min(720px, 100%)',
    display: 'grid',
    gap: 18,
  }),
  card: style({
    display: 'grid',
    gap: 16,
    border: '1px solid #d7dde7',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    boxShadow: '0 18px 60px rgba(30, 41, 59, 0.14)',
    padding: 28,
    animationName: enter,
    animationDuration: '420ms',
    animationTimingFunction: 'cubic-bezier(.2,.8,.2,1)',
    animationFillMode: 'both',
  }).hover({
    animationName: lift,
    animationDuration: '760ms',
    animationIterationCount: 'infinite',
  }),
  eyebrow: style({
    margin: 0,
    color: '#526173',
    fontSize: 13,
    fontWeight: 700,
    textTransform: 'uppercase',
  }),
  title: style({
    margin: 0,
    fontSize: 32,
    lineHeight: 1.1,
  }),
  copy: style({
    margin: 0,
    color: '#526173',
    lineHeight: 1.65,
  }),
  controls: style({
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
  }),
  button: style({
    border: '1px solid #cfd7e3',
    borderRadius: 6,
    backgroundColor: '#ffffff',
    color: '#172033',
    cursor: 'pointer',
    font: 'inherit',
    fontWeight: 700,
    padding: '9px 13px',
  }),
  buttonActive: style({
    backgroundColor: '#172033',
    borderColor: '#172033',
    color: '#ffffff',
  }),
};

function App() {
  const [themeIndex, setThemeIndex] = useState(0);
  const css = combineStyle(styles);

  return (
    <main css={[themes[themeIndex].theme, css.page]}>
      <section css={css.panel}>
        <article css={css.card}>
          <p css={css.eyebrow}>Static value refs</p>
          <h1 css={css.title}>Keyframes stay local to the style that uses them.</h1>
          <p css={css.copy}>
            The card consumes keyframe values through animationName. Token-backed transform values remain themeable
            through CSS variables without turning this into a global style API.
          </p>
          <div css={css.controls}>
            {themes.map((item, index) => (
              <button
                css={[css.button, index === themeIndex && css.buttonActive]}
                key={item.label}
                type='button'
                onClick={() => setThemeIndex(index)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
