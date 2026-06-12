import { createToken, getCss, style } from '@fluentic/style';
import { Card } from '../../lib/Card';
import { Chrome } from '../../lib/Chrome';
import { page } from '../../lib/styles';

const color = createToken('red');

const styles = {
  heading: style({ textDecoration: 'underline', color }),
};

async function ServerOnlyPanel() {
  return (
    <Card title='server component' important>
      This child has no client boundary and resolves extracted class names on the server.
    </Card>
  );
}

export default function RscPage() {
  const css = getCss(page);
  const pageCss = getCss(styles);

  return (
    <Chrome>
      <section css={css.hero}>
        <span css={css.eyebrow}>React server component</span>
        <h1 css={[css.heading, pageCss.heading]}>RSC route</h1>
        <p css={css.intro}>
          This page is server-only and demonstrates that regular `css` props still resolve on the server without a
          client boundary.
        </p>
      </section>
      <section css={css.grid}>
        <ServerOnlyPanel />
        <Card title='no hook'>
          Server components can use regular css props without a client boundary.
        </Card>
      </section>
    </Chrome>
  );
}
