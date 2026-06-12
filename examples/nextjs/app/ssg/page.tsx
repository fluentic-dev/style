import { getCss } from '@fluentic/style';
import { Card } from '../../lib/Card';
import { Chrome } from '../../lib/Chrome';
import { page } from '../../lib/styles';

export const dynamic = 'force-static';

export default function SsgPage() {
  const css = getCss(page);

  return (
    <Chrome>
      <section css={css.hero}>
        <span css={css.eyebrow}>Static generation</span>
        <h1 css={css.heading}>SSG route</h1>
        <p css={css.intro}>
          Next prerenders this route at build time, so the extracted CSS is already in place when the page is served.
        </p>
      </section>
      <section css={css.grid}>
        <Card title='force-static' important>
          Next prerenders this route, and extracted CSS is linked before hydration.
        </Card>
      </section>
    </Chrome>
  );
}
