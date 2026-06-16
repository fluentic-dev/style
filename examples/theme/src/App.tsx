import { combineStyle } from '@fluentic/style';
import { useState } from 'react';
import { appStyles, themes } from './theme';

const metrics = [
  ['Revenue', '$84k'],
  ['Latency', '128ms'],
  ['Tasks', '42'],
];

const feed = [
  ['Sync complete', 'Design tokens propagated across three surfaces.', 'Live'],
  ['Theme audit', 'Nested token aliases stayed stable through extraction.', 'Clean'],
  ['Preview ready', 'Runtime switching keeps component class data reusable.', 'Fast'],
];

export function ThemeApp() {
  const [themeIndex, setThemeIndex] = useState(0);

  const css = combineStyle(appStyles);
  const theme = themes[themeIndex];

  return (
    <main css={[theme.theme, css.page]}>
      <section css={css.shell}>
        <header css={css.topbar}>
          <div css={css.headingGroup}>
            <span css={css.eyebrow}>Theme workbench</span>
            <h1 css={css.title}>Nested tokens, live themes.</h1>
            <p css={css.subtitle}>
              One token tree drives the whole surface while each theme swaps semantic values in place.
            </p>
          </div>
          <nav css={css.switcher} aria-label='Theme'>
            {themes.map((item, index) => (
              <button
                css={[
                  css.switchButton,
                  index === themeIndex && css.switchButtonActive,
                ]}
                key={item.label}
                type='button'
                onClick={() => setThemeIndex(index)}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </header>

        <div css={css.board}>
          <section css={[css.panel, css.preview]}>
            <div css={css.panelHeader}>
              <span css={css.badge}>{theme.label}</span>
              <span css={css.tag}>createTheme</span>
            </div>
            <div css={css.metricGrid}>
              {metrics.map(([label, value]) => (
                <article css={css.metric} key={label}>
                  <span css={css.metricLabel}>{label}</span>
                  <strong css={css.metricValue}>{value}</strong>
                </article>
              ))}
            </div>
            <div css={css.actionRow}>
              <button css={css.primaryAction} type='button'>Publish</button>
              <button css={css.secondaryAction} type='button'>Compare</button>
            </div>
          </section>

          <section css={css.panel}>
            <div css={css.panelHeader}>
              <span css={css.badge}>Token map</span>
              <span css={css.tag}>createTokens</span>
            </div>
            <div css={css.feed}>
              {feed.map(([title, text, tag]) => (
                <article css={css.feedItem} key={title}>
                  <span css={css.dot} />
                  <span>
                    <strong css={css.feedTitle}>{title}</strong>
                    <br />
                    <span css={css.feedText}>{text}</span>
                  </span>
                  <span css={css.tag}>{tag}</span>
                </article>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
