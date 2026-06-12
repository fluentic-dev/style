import { getCss } from '@fluentic/style';
import { Card } from '../lib/Card';
import { Chrome } from '../lib/Chrome';
import { page } from '../lib/styles';

export default function HomePage() {
  const css = getCss(page);

  return (
    <Chrome>
      <section css={css.hero}>
        <span css={css.eyebrow}>Server component / extracted CSS</span>
        <h1 css={css.heading}>Fluentic Style in the Next.js App Router</h1>
        <p css={css.intro}>
          This route is a default server component that is statically generated when possible. Styles are compiled and
          extracted by the Webpack plugin.
        </p>
        <div css={css.metaRow}>
          <span css={css.metaPill}>Dev extract enabled</span>
          <span css={css.metaPill}>Prod extract enabled</span>
          <span css={css.metaPill}>CSS prop on DOM</span>
        </div>
      </section>
      <section css={css.grid} data-testid='home-grid'>
        <Card title='Production' important>
          Production builds extract CSS, which is required for stable SSR and RSC output.
        </Card>
        <Card title='Development'>
          This example also extracts in dev so server-rendered class names have CSS immediately.
        </Card>
      </section>
    </Chrome>
  );
}
