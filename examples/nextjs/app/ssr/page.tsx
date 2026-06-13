import { combineStyle } from '@fluentic/style';
import { connection } from 'next/server';
import { Card } from '../../lib/Card';
import { Chrome } from '../../lib/Chrome';
import { page } from '../../lib/styles';

export default async function SsrPage() {
  const css = combineStyle(page);
  const isStaticExport = process.env.MODE === 'ssg';

  if (!isStaticExport) {
    await connection();
  }

  const renderedAt = new Date().toISOString();

  return (
    <Chrome>
      <section css={css.hero}>
        <span css={css.eyebrow}>Server rendering</span>
        <h1 css={css.heading}>SSR route</h1>
        <p css={css.intro}>
          This route renders on each request while still serving extracted CSS before hydration.
        </p>
      </section>
      <section css={css.grid}>
        <Card title={isStaticExport ? 'static export fallback' : 'force-dynamic'} important>
          {isStaticExport
            ? 'Static export mode prerenders this compatibility page.'
            : 'This page renders on the server for each request.'} Rendered at {renderedAt}.
        </Card>
      </section>
    </Chrome>
  );
}
