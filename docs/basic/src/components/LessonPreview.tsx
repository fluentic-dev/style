import Link from '@docusaurus/Link';
import CodeBlock from '@theme/CodeBlock';
import { useId, useState } from 'react';
import styles from './LessonPreview.module.css';

type Kind = 'composition' | 'states' | 'dynamic' | 'theme' | 'parts';

/** Controlled previews mirror the examples; the full playground runs the compiler. */
export default function LessonPreview({ kind = 'composition' }: { kind?: Kind; }) {
  const id = useId();
  const [compact, setCompact] = useState(false);
  const [dark, setDark] = useState(false);
  const [percent, setPercent] = useState(40);
  const [smallTitle, setSmallTitle] = useState(false);
  const code = kind === 'dynamic'
    ? `const value = ${percent};\n<div css={[fill, style({ width: \`\${value}%\` })]} />`
    : kind === 'theme'
    ? `const darkMode = ${dark};\n<section css={[panel, darkMode && dark]}>\n  Your workspace\n</section>`
    : kind === 'parts'
    ? `const compactCard = style.scope([\n  cardStyle.root({ padding: 12 }),\n  cardStyle.title({ fontSize: 16 }),\n]);\n\n<Card title="Your workspace" theme={${
      smallTitle ? 'compactCard' : 'undefined'
    }} />`
    : kind === 'states'
    ? `const button = style({\n  padding: '12px 24px',\n  backgroundColor: '#7043ce',\n  color: 'white',\n})\n  .hover({\n    backgroundColor: '#31205e',\n    boxShadow: '0 6px 16px rgb(49 32 94 / 0.35)',\n  })\n  .focusVisible({\n    outline: '2px solid #7043ce',\n    outlineOffset: 3,\n  });`
    : `const isCompact = ${compact};\n\n<button css={[button, isCompact && compact]}>\n  Save changes\n</button>`;
  return (
    <section className={styles.lesson} aria-label={`${kind} preview`}>
      <div className={styles.bar}>
        <strong>Try the idea</strong>
      </div>
      <div className={styles.controls}>
        {kind === 'composition' && (
          <label>
            <input type='checkbox' checked={compact} onChange={(e) => setCompact(e.target.checked)} /> Compact padding
          </label>
        )}
        {kind === 'theme' && (
          <label>
            <input type='checkbox' checked={dark} onChange={(e) => setDark(e.target.checked)} /> Dark theme
          </label>
        )}
        {kind === 'parts' && (
          <label>
            <input type='checkbox' checked={smallTitle} onChange={(e) => setSmallTitle(e.target.checked)} />{' '}
            Apply compact scope
          </label>
        )}
        {kind === 'dynamic' && (
          <label htmlFor={id}>
            Progress: {percent}%{' '}
            <input
              id={id}
              type='range'
              min='0'
              max='100'
              value={percent}
              onChange={(e) => setPercent(Number(e.target.value))}
            />
          </label>
        )}
        {kind === 'states' && <p>Hover the button, or press Tab to focus it.</p>}
      </div>
      <div className={styles.stage} data-dark={dark}>
        {kind === 'dynamic'
          ? (
            <div
              className={styles.track}
              role='progressbar'
              aria-label='Example progress'
              aria-valuenow={percent}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div style={{ width: `${percent}%` }} />
            </div>
          )
          : kind === 'theme' || kind === 'parts'
          ? (
            <article className={styles.card} style={{ padding: smallTitle ? 12 : 24 }}>
              <strong style={{ fontSize: smallTitle ? 16 : 20 }}>Your workspace</strong>
              <p>A place for your next idea.</p>
            </article>
          )
          : (
            <button type='button' className={styles.button} style={{ padding: compact ? '6px 12px' : '12px 24px' }}>
              Save changes
            </button>
          )}
      </div>
      <CodeBlock language='tsx'>{code}</CodeBlock>
      <p className={styles.note}>
        {kind === 'states' ? 'Try hover and keyboard focus.' : 'Change a control to follow the code.'}{' '}
        <Link to='/playground/'>Try it in the live playground</Link>.
      </p>
    </section>
  );
}
