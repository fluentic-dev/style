import { combineStyle, createTheme, createValues, style } from '@fluentic/style';
import { useState } from 'react';
import { Card } from './components/Card';
import { deepLinkedCardVars, DeepLinkedTokenCard } from './components/DeepLinkedTokenCard';
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

const linkedColors = createValues(
  [
    'brand | mint',
    'alert | amber',
    'focus | violet',
  ],
  'linked-colors',
);

const linkedThemeCards = [
  {
    label: 'Mint',
    title: 'Value token resolves through parent scope',
    value: 'brand | mint',
    theme: createTheme([
      linkedColors('brand | mint', '#0f766e'),
    ]),
    scope: style.scope([
      deepLinkedCardVars.color(linkedColors('brand | mint')),
    ]),
  },
  {
    label: 'Amber',
    title: 'Component var follows app theme',
    value: 'alert | amber',
    theme: createTheme([
      linkedColors('alert | amber', '#b45309'),
    ]),
    scope: style.scope([
      deepLinkedCardVars.color(linkedColors('alert | amber')),
    ]),
  },
  {
    label: 'Violet',
    title: 'Deep link stays stable per item',
    value: 'focus | violet',
    theme: createTheme([
      linkedColors('focus | violet', '#7c3aed'),
    ]),
    scope: style.scope([
      deepLinkedCardVars.color(linkedColors('focus | violet')),
    ]),
  },
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
          <Card
            label={theme.label}
            metrics={metrics.map(([label, value]) => ({ label, value }))}
            tag='exposeStyle'
            theme={theme.card}
          />

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

        <section css={css.linkedSection}>
          <div css={css.panelHeader}>
            <span css={css.badge}>Deep linked tokens</span>
            <span css={css.tag}>createValues</span>
          </div>
          <div css={css.linkedGrid}>
            {linkedThemeCards.map((item) => (
              <div css={item.theme} key={item.value}>
                <DeepLinkedTokenCard
                  label={item.label}
                  scope={item.scope}
                  title={item.title}
                />
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
