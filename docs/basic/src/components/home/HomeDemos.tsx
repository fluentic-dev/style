import Link from '@docusaurus/Link';
import { useState } from 'react';
import styles from '../../pages/index.module.css';
import DemoSelect from '../DemoSelect';
import InlineCode from './InlineCode';

export const initialDemoOptions = {
  title: 'Revenue',
  root: false,
  highlight: true,
  compact: true,
  accent: '#2563eb',
  space: 16,
  spacious: true,
  dark: false,
  duration: 200,
  production: false,
};
export type DemoOptions = typeof initialDemoOptions;

export function demoCode(id: string, code: string, state: DemoOptions) {
  switch (id) {
    case 'parts':
      return `${code}\n\n<Card\n  title={${JSON.stringify(state.title)}}\n  css={style({ backgroundColor: '${
        state.root ? '#ede9fe' : '#ffffff'
      }' })}\n  theme={style.scope([\n    cardStyle.title({ color: '${
        state.highlight ? '#2563eb' : '#0f172a'
      }' }),\n  ])}\n/>`;
    case 'customize':
      return code.replace(
        'theme={[compactCard, highlightedCard]}',
        `theme={[${
          [state.compact && 'compactCard', state.highlight && 'highlightedCard'].filter(Boolean).join(', ')
        }]}`,
      );
    case 'tokens':
      return code.replace("accent: '#2563eb'", `accent: '${state.accent}'`).replace(
        'medium: 16',
        `medium: ${state.space}`,
      );
    case 'themes':
      return code.replace('css={spaciousTheme}', `css={${state.spacious ? 'spaciousTheme' : 'undefined'}}`).replace(
        'Purple, with 24px padding',
        'Save changes',
      );
    case 'app-theme':
      return `${code}\n\n<App darkMode={${state.dark}} />`;
    case 'animation':
      return code.replace("'200ms'", `'${state.duration}ms'`);
    case 'interop':
      return code.replace("color: '#2563eb'", `color: '${state.accent}'`);
    default:
      return code;
  }
}

export default function HomeDemo({ id, value, onChange, tokens = initialDemoOptions }: {
  tokens?: DemoOptions;
  id: string;
  value: DemoOptions;
  onChange: (patch: Partial<DemoOptions>) => void;
}) {
  const [replay, setReplay] = useState(0);
  if (
    !['parts', 'customize', 'tokens', 'themes', 'app-values', 'app-theme', 'animation', 'interop', 'production']
      .includes(id)
  ) return null;
  const checkbox = (label: string, key: 'root' | 'highlight' | 'compact' | 'spacious' | 'dark' | 'production') => (
    <label className={styles.demoCheckbox}>
      <input
        type='checkbox'
        checked={value[key]}
        onChange={(event) =>
          onChange({ [key]: event.target.checked })}
      />
      <span>
        <InlineCode text={label} />
      </span>
    </label>
  );
  const colorPicker = <DemoSelect label='Accent' value={value.accent} onChange={(accent) => onChange({ accent })} />;

  return (
    <div className={styles.preview}>
      <span className={styles.previewLabel}>{id === 'production' ? 'EXPLORE THE BUILD FLOW' : 'LIVE PREVIEW'}</span>
      {id === 'parts' && (
        <>
          <label className={styles.demoField}>
            <span>
              <code className={styles.inlineCode}>title</code> prop
            </span>
            <input value={value.title} onChange={(event) => onChange({ title: event.target.value })} />
          </label>
          {checkbox('Tint the root · `css` prop', 'root')}
          {checkbox('Blue title · `theme` prop', 'highlight')}
          <article
            className={styles.demoCard}
            style={{ padding: 24, backgroundColor: value.root ? '#ede9fe' : '#ffffff' }}
          >
            <h2 style={{ fontSize: 20, color: value.highlight ? '#2563eb' : '#0f172a' }}>{value.title}</h2>
          </article>
        </>
      )}
      {id === 'customize' && (
        <>
          {checkbox('Compact spacing and title', 'compact')}
          {checkbox('Highlighted title', 'highlight')}
          <article className={styles.demoCard} style={{ padding: value.compact ? 12 : 24, marginBlock: 24 }}>
            <h2 style={{ fontSize: value.compact ? 16 : 20, color: value.highlight ? '#2563eb' : '#0f172a' }}>
              Revenue
            </h2>
          </article>
          <p className={styles.demoHint}>
            <InlineCode text='Two independent scopes. One `theme` prop.' />
          </p>
        </>
      )}
      {id === 'tokens' && (
        <>
          {colorPicker}
          <label className={styles.demoField}>
            <span>
              <code className={styles.inlineCode}>space.medium</code> ·{' '}
              <code className={styles.inlineCode}>{value.space}px</code>
            </span>
            <input
              type='range'
              min='8'
              max='24'
              step='4'
              value={value.space}
              onChange={(event) => onChange({ space: Number(event.target.value) })}
            />
          </label>
          <div className={styles.buttonStage}>
            <button className={styles.previewButton} style={{ color: value.accent, padding: value.space }}>
              Save changes
            </button>
          </div>
        </>
      )}
      {id === 'themes' && (
        <>
          {checkbox('Apply `spaciousTheme` to the section', 'spacious')}
          <section className={styles.buttonStage}>
            <button
              className={styles.previewButton}
              style={{ color: value.spacious ? '#7c3aed' : tokens.accent, padding: value.spacious ? 24 : tokens.space }}
            >
              Save changes
            </button>
          </section>
          <p className={styles.demoHint}>
            <span>
              {value.spacious ? 'Purple' : <code className={styles.inlineCode}>{tokens.accent}</code>} ·{' '}
              <code className={styles.inlineCode}>{value.spacious ? 24 : tokens.space}px</code> padding
            </span>
            <br />The button style stays the same.
          </p>
        </>
      )}
      {(id === 'app-values' || id === 'app-theme') && (
        <>
          {id === 'app-theme' && checkbox('`darkMode`', 'dark')}
          <div
            className={styles.appDemo}
            style={{
              backgroundColor: id === 'app-theme' && value.dark ? '#0f172a' : '#ffffff',
              color: id === 'app-theme' && value.dark ? '#f8fafc' : '#0f172a',
            }}
          >
            Your app
          </div>
          <p className={styles.demoHint}>
            <InlineCode
              text={id === 'app-theme' && value.dark
                ? '`#0f172a` background · `#f8fafc` text'
                : '`#ffffff` background · `#0f172a` text'}
            />
          </p>
        </>
      )}
      {id === 'animation' && (
        <>
          <label className={styles.demoField}>
            <span>
              Duration · <code className={styles.inlineCode}>{value.duration}ms</code>
            </span>
            <input
              type='range'
              min='200'
              max='1600'
              step='200'
              value={value.duration}
              onChange={(event) => {
                onChange({ duration: Number(event.target.value) });
                setReplay((current) => current + 1);
              }}
            />
          </label>
          <div className={styles.buttonStage}>
            <p key={replay} className={styles.animatedNotice} style={{ animationDuration: `${value.duration}ms` }}>
              Changes saved.
            </p>
          </div>
          <button className={styles.configButton} onClick={() => setReplay((current) => current + 1)}>
            Replay animation ↻
          </button>
        </>
      )}
      {id === 'interop' && (
        <>
          {colorPicker}
          <div className={styles.buttonStage}>
            <button className={styles.previewButton} style={{ color: value.accent }}>Save changes</button>
          </div>
          <p className={styles.demoHint}>
            <InlineCode text='A standard button accepting `className` and `style`.' />
            <br />Replace it with your component library.
          </p>
        </>
      )}
      {id === 'production' && (
        <>
          {checkbox('Production build', 'production')}
          <ol className={styles.buildFlow}>
            <li>Your styles</li>
            <li>Fluentic bundler plugin</li>
            <li>{value.production ? 'Static CSS + dynamic styles' : 'Preview + source traces'}</li>
          </ol>
          <p className={styles.demoHint}>
            {value.production
              ? 'Static rules are extracted at build time.'
              : 'Inspect a style and trace it back to its source.'}
          </p>
          <Link className={styles.configButton} to='/playground/'>Try the real compiler →</Link>
        </>
      )}
    </div>
  );
}
