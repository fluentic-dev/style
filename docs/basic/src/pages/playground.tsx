import BrowserOnly from '@docusaurus/BrowserOnly';
import Head from '@docusaurus/Head';
import useBaseUrl from '@docusaurus/useBaseUrl';
import { lazy, Suspense } from 'react';

const PlaygroundApp = lazy(() => import('@docs/playground'));

export default function PlaygroundPage() {
  const docsUrl = useBaseUrl('/docs/intro/');
  const logoUrl = useBaseUrl('/img/logo.png');
  const loading = <p role='status'>Loading playground…</p>;

  return (
    <>
      <Head>
        <title>Playground | Fluentic Style</title>
        <meta name='description' content='Edit Fluentic styles, tokens, and themes and inspect the generated CSS.' />
      </Head>
      <BrowserOnly fallback={loading}>
        {() => (
          <Suspense fallback={loading}>
            <PlaygroundApp docsUrl={docsUrl} logoUrl={logoUrl} />
          </Suspense>
        )}
      </BrowserOnly>
    </>
  );
}
