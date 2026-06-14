'use client';

import { combineStyle, createTokens, style } from '@fluentic/style';
import { useState } from 'react';
import { page } from '../../lib/styles';

const tokenDefaults = {
  tone: '#0f766e',
  surface: 'rgba(240,253,250,0.92)',
};

const tokens = createTokens(tokenDefaults);

const styles = {
  panel: style.slot({
    backgroundColor: tokens.surface,
    borderColor: tokens.tone,
  }),
  title: style.slot({
    color: tokens.tone,
  }),
  swatch: style.slot({
    backgroundColor: tokens.tone,
    borderRadius: 999,
    height: 34,
    width: 34,
  }),
  button: style.slot({
    backgroundColor: tokens.tone,
    border: '1px solid transparent',
    borderRadius: 10,
    color: '#ffffff',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 700,
    padding: '10px 14px',
  }).hover({
    filter: 'brightness(0.92)',
  }),
  row: style.slot({
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'wrap',
    gap: 10,
  }),
};

type ClientTokenPanelProps = {
  initialTone: string;
};

const tones = ['#0f766e', '#7c2d12', '#1d4ed8'];

export function ClientTokenPanel(props: ClientTokenPanelProps) {
  const [index, setIndex] = useState(() => Math.max(0, tones.indexOf(props.initialTone)));

  const nextTone = tones[index % tones.length];

  const pageCss = combineStyle(page);

  const css = combineStyle(
    styles,
    tokens.tone(nextTone),
    tokens.surface(index % 2 ? 'rgba(239,246,255,0.92)' : 'rgba(240,253,250,0.92)'),
  );

  return (
    <article css={[pageCss.card, css.panel]}>
      <div css={pageCss.cardAccent} />
      <h2 css={[pageCss.cardTitle, css.title]}>client token override</h2>
      <div css={css.row}>
        <span css={css.swatch} />
        <button css={css.button} type='button' onClick={() => setIndex((value) => value + 1)}>
          Rotate token
        </button>
      </div>
      <p css={pageCss.cardText}>
        This client island recomputes token values after hydration while keeping the extracted class data stable.
      </p>
    </article>
  );
}
