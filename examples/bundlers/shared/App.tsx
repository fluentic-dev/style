import { useCss } from '@fluentic/style';

import { accentCardTheme, pageStyles, parentHoverScope } from './App.styles';
import { Card } from './components/Card';

export function BundlerSampleApp(props: { bundler: string; }) {
  const css = useCss(pageStyles);

  return (
    <main css={css.page}>
      <div css={css.frame}>
        <section css={css.hero}>
          <p css={css.badge}>Bundler sample</p>
          <h1 css={css.title}>Fluentic on {props.bundler}</h1>
          <p css={css.lead}>
            This sample keeps the app intentionally small while exercising <code>style()</code>,{' '}
            <code>style.slot()</code>, <code>style.scope()</code>, and the <code>useCss</code>{' '}
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
      </div>
    </main>
  );
}
