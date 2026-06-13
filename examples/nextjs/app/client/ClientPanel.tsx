'use client';

import { style, combineStyle } from '@fluentic/style';
import { useState } from 'react';
import { page } from '../../lib/styles';

const clientStyles = {
  panel: style.slot({
    backgroundColor: 'rgba(255,255,255,0.9)',
    border: '1px solid rgba(20,24,31,0.1)',
    borderRadius: 14,
    boxShadow: '0 18px 40px rgba(34, 42, 37, 0.06)',
    alignContent: 'start',
    display: 'grid',
    gap: 14,
    padding: '20px 22px',
    position: 'relative',
    overflow: 'hidden',
  }),
  bar: style.slot({
    backgroundColor: '#0f766e',
    height: 3,
    left: 0,
    position: 'absolute',
    top: 0,
    width: '100%',
  }),
  label: style.slot({
    color: '#2b302d',
    fontSize: 16,
    lineHeight: 1.55,
    margin: 0,
  }),
  code: style.slot({
    backgroundColor: 'rgba(15,118,110,0.08)',
    border: '1px solid rgba(15,118,110,0.14)',
    borderRadius: 999,
    color: '#155e56',
    display: 'inline-flex',
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 0.05,
    padding: '6px 10px',
    textTransform: 'uppercase',
    width: 'fit-content',
  }),
  actionRow: style.slot({
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'wrap',
    gap: 10,
  }),
  button: style.slot({
    backgroundColor: '#0f766e',
    border: '1px solid #0f766e',
    borderRadius: 10,
    color: '#ffffff',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 700,
    padding: '10px 14px',
  }).hover({
    backgroundColor: '#115e59',
    borderColor: '#115e59',
  }),
  count: style.slot({
    color: '#155e56',
    fontSize: 14,
    fontWeight: 700,
  }),
};

export function ClientPanel() {
  const [clicks, setClicks] = useState(0);
  const css = combineStyle(clientStyles);
  const pageCss = combineStyle(page);

  return (
    <section css={pageCss.grid}>
      <article css={css.panel}>
        <div css={css.bar} />
        <span css={css.code}>combineStyle</span>
        <p css={css.label}>
          This client component uses combineStyle. The build still extracts the rules, so the hook does not need to inject CSS
          at runtime.
        </p>
        <div css={css.actionRow}>
          <button css={css.button} type='button' onClick={() => setClicks((count) => count + 1)}>
            Click client button
          </button>
          <span css={css.count}>{clicks} client clicks</span>
        </div>
      </article>
    </section>
  );
}
