import Link from '@docusaurus/Link';
import { useColorMode } from '@docusaurus/theme-common';
import { Highlight, themes as syntaxThemes } from 'prism-react-renderer';
import { type CSSProperties, useEffect, useRef, useState } from 'react';
import styles from './TryStyle.module.css';

const appThemes = [
  { name: 'light', surface: '#ffffff', text: '#251b39', accent: '#6d28d9' },
  { name: 'dark', surface: '#191526', text: '#f4f0ff', accent: '#c4b5fd' },
  { name: 'forest', surface: '#eef7f1', text: '#153e2b', accent: '#167348' },
];
const sections = ['Style', 'Components', 'Tokens', 'Theme'] as const;
type Section = typeof sections[number];

const tokensCode = `import { createTokens, createValues } from '@fluentic/style';

export const tokens = createTokens({
  spacing: { panel: 24 },
  radius: { button: 8 },
});

// Keep themeable color literals visible, too.
export const color = createValues([
  '#ffffff',
  '#251b39',
  '#6d28d9',
]);`;
const themesCode = `import { createTheme } from '@fluentic/style';
import { color } from './tokens';

// Apply one theme at the app root.
${
  appThemes.map((theme) =>
    `export const ${theme.name} = createTheme([
  color('#ffffff', '${theme.surface}'),
  color('#251b39', '${theme.text}'),
  color('#6d28d9', '${theme.accent}'),
]);`
  ).join('\n\n')
}`;

export default function TryStyle() {
  const [theme, setTheme] = useState(appThemes[0]);
  const [compact, setCompact] = useState(false);
  const [guide, setGuide] = useState({
    section: 'Style' as Section,
    target: 'export const app',
    count: 5,
    message: 'Start with familiar CSS. Try hover, focus, or a different theme.',
    revision: 0,
  });
  const viewport = useRef<HTMLDivElement>(null);
  const { colorMode } = useColorMode();
  const styleCode = `import { style } from '@fluentic/style';
import { color, tokens } from './tokens';

export const app = style({
  backgroundColor: color('#ffffff'),
  color: color('#251b39'),
  padding: tokens.spacing.panel,
});

export const heading = style({
  color: color('#6d28d9'),
});

export const button = style({
  color: color('#6d28d9'),
  padding: '10px 16px',
  border: '1px solid currentColor',
  borderRadius: tokens.radius.button,
})
  .hover({ opacity: 0.75 })
  .focusVisible({
    outline: '2px solid currentColor',
    outlineOffset: 3,
  });

export const compact = style({ padding: '6px 10px' });`;
  const componentCode = `import { app, heading, button, compact } from './style';
import { light, dark, forest } from './theme';

export function App() {
  const isCompact = ${compact};

  return (
    <main css={[app, ${theme.name}]}>
      <h2 css={heading}>Your workspace</h2>
      <p>A little focus. A great day of building.</p>
      <button css={[button, isCompact && compact]}>
        Create project
      </button>
    </main>
  );
}`;
  const examples = {
    Style: {
      code: styleCode,
      file: 'style.ts',
      target: 'export const app',
      count: 5,
      message: 'Write typed CSS, then add hover and focus states.',
    },
    Components: {
      code: componentCode,
      file: 'App.tsx',
      target: `<main css={[app, ${theme.name}]}`,
      count: 7,
      message: 'Compose styles on components. Apply the app theme at the root.',
    },
    Tokens: {
      code: tokensCode,
      file: 'tokens.ts',
      target: 'export const tokens',
      count: 4,
      message: 'Share named tokens for spacing and shape, and themeable color values.',
    },
    Theme: {
      code: themesCode,
      file: 'theme.ts',
      target: `export const ${theme.name}`,
      count: 5,
      message: `${theme.name} replaces the shared values for the whole subtree.`,
    },
  };
  const code = examples[guide.section].code;
  const firstLine = code.split('\n').findIndex((line) => line.includes(guide.target));

  function reveal(section: Section, target: string, count: number, message: string) {
    setGuide((previous) => ({ section, target, count, message, revision: previous.revision + 1 }));
  }

  useEffect(() => {
    const container = viewport.current;
    const line = container?.querySelector<HTMLElement>('[data-highlighted="true"]');
    if (!container || !line) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    container.scrollTo({
      top: container.scrollTop + line.getBoundingClientRect().top - container.getBoundingClientRect().top - 48,
      behavior: reducedMotion ? 'instant' : 'smooth',
    });
  }, [guide.revision, guide.section]);

  return (
    <section className={styles.demo} aria-label='Interactive app theme example'>
      <div className={styles.file}>
        <span>A theme for your whole app</span>
        <span>TypeScript + React</span>
      </div>
      <div className={styles.tabs} role='group' aria-label='Code sections'>
        {sections.map((section) => (
          <button
            key={section}
            type='button'
            aria-pressed={guide.section === section}
            onClick={() => {
              const example = examples[section];
              reveal(section, example.target, example.count, example.message);
            }}
          >
            {section}
          </button>
        ))}
        <span>{examples[guide.section].file}</span>
      </div>
      <div className={styles.code} ref={viewport} role='region' aria-label={`${guide.section} code`} tabIndex={0}>
        <Highlight code={code} language='tsx' theme={colorMode === 'dark' ? syntaxThemes.dracula : syntaxThemes.github}>
          {({ tokens, getLineProps, getTokenProps }) => (
            <pre className={styles.source}>
              <code>
                {tokens.map((line, index) => {
                  const highlighted = index >= firstLine && index < firstLine + guide.count;
                  return (
                    <span
                      {...getLineProps({ line })}
                      key={`${guide.revision}-${index}`}
                      className={`${styles.codeLine} ${highlighted ? styles.highlighted : ''}`}
                      data-highlighted={highlighted}
                    >
                      <span className={styles.lineNumber} aria-hidden='true'>{index + 1}</span>
                      {line.map((token, tokenIndex) => <span key={tokenIndex} {...getTokenProps({ token })} />)}
                    </span>
                  );
                })}
              </code>
            </pre>
          )}
        </Highlight>
      </div>
      <p className={styles.guide} role='status'>{guide.message}</p>
      <div className={styles.preview}>
        <div className={styles.controls}>
          <div role='group' aria-label='Example app theme' className={styles.colors}>
            {appThemes.map((option) => (
              <button
                key={option.name}
                type='button'
                aria-pressed={theme.name === option.name}
                onClick={() => {
                  setTheme(option);
                  reveal(
                    'Theme',
                    `export const ${option.name}`,
                    5,
                    `${option.name}: background, text, and accent update together.`,
                  );
                }}
              >
                <span style={{ backgroundColor: option.accent }} aria-hidden='true' />
                {option.name}
              </button>
            ))}
          </div>
          <label className={styles.compact}>
            <input
              type='checkbox'
              checked={compact}
              onChange={(event) => {
                setCompact(event.target.checked);
                reveal(
                  'Components',
                  'const isCompact',
                  1,
                  `isCompact = ${event.target.checked}. The button composes the compact padding.`,
                );
              }}
            />
            Compact
          </label>
        </div>
        <div
          className={styles.workspace}
          style={{
            '--demo-surface': theme.surface,
            '--demo-text': theme.text,
            '--demo-accent': theme.accent,
          } as CSSProperties}
        >
          <h2>Your workspace</h2>
          <p>A little focus. A great day of building.</p>
          <button
            type='button'
            className={styles.exampleButton}
            style={{ padding: compact ? '6px 10px' : '10px 16px' }}
            onMouseEnter={() => reveal('Style', '.hover(', 1, 'Hover applies opacity to this button.')}
            onFocus={() => reveal('Style', '.focusVisible(', 4, 'Keyboard focus adds an outline. Try Tab to see it.')}
            onClick={() =>
              reveal(
                'Components',
                '<button css=',
                3,
                'Compose the base style and optional compact style on the button.',
              )}
          >
            Create project
          </button>
        </div>
        <p className={styles.hint}>Switch themes. Toggle compact. Hover or focus the button.</p>
      </div>
      <div className={styles.caption}>
        <span>Illustrated preview</span>
        <Link to='/docs/themes/'>Explore app theming</Link>
      </div>
    </section>
  );
}
