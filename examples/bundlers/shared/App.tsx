import { combineStyle } from '@fluentic/style';
import { useState } from 'react';

import { accentCardTheme, appThemes, pageStyles, parentHoverScope } from './App.styles';
import { Card } from './components/Card';

export function BundlerSampleApp(props: { bundler: string; }) {
  const [themeIndex, setThemeIndex] = useState(0);
  const css = combineStyle(pageStyles);
  const theme = appThemes[themeIndex];

  return (
    <main css={[theme.theme, css.page]}>
      <div css={css.frame}>
        <section css={css.hero}>
          <div css={css.heroBar}>
            <p css={css.badge}>Bundler sample</p>
            <div css={css.themeControls} aria-label='Theme choices'>
              {appThemes.map((item, index) => (
                <button
                  css={[
                    css.themeButton,
                    index === themeIndex && css.themeButtonActive,
                  ]}
                  key={item.label}
                  type='button'
                  onClick={() => setThemeIndex(index)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <h1 css={css.title}>Fluentic on {props.bundler}</h1>
          <p css={css.lead}>
            This sample keeps the app intentionally small while exercising <code>style()</code>,{' '}
            <code>style.slot()</code>, <code>style.scope()</code>, and the <code>combineStyle</code>{' '}
            hook through the bundler plugin and the custom JSX runtime. Resize below 720px to see the media rule
            collapse the cards into one column while this hero switches to a warm border, background, and tighter
            spacing.
          </p>
        </section>

        <section css={css.grid}>
          <Card
            label='Parent hover'
            note='Hover the card to let the parent scope recolor the child label, note, and action. Then hover the action itself so its own slot hover can win.'
            buttonLabel='Hover card'
            theme={parentHoverScope}
          />

          <Card
            label='Theme scope'
            note='This card uses a scope as a small theme. Resize below 720px and its provided scope also changes the card surface, border, and label colors.'
            buttonLabel='Hover card, then me'
            theme={accentCardTheme}
          />
        </section>

        <section css={css.testPanel}>
          <div css={css.testHeader}>
            <h2 css={css.testTitle}>Extra theme checks</h2>
            <span css={css.themeStatus}>{theme.label}</span>
          </div>
          <p css={css.testNote}>
            A small preview for tokens that are not obvious in the two cards above.
          </p>
          <div css={css.tokenGrid}>
            <article css={css.tokenItem}>
              <span css={css.tokenLabel}>Surface</span>
              <span css={css.tokenValue}>panel + border</span>
            </article>
            <article css={[css.tokenItem, css.tokenItemAccent]}>
              <span css={css.tokenLabel}>Accent</span>
              <span css={css.tokenValue}>badge + text</span>
            </article>
            <button css={css.hoverCheck} type='button'>
              Hover color
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
