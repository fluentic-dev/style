import { DocsBody, DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/layouts/docs/page';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { getMDXComponents } from '../../../components/mdx';
import { source } from '../../../lib/source';

type PageProps = {
  params: Promise<{
    slug?: string[];
  }>;
};

const docsOrder = [
  ['why-fluentic'],
  ['fluentic-approach', 'from-elements-to-components'],
  ['fluentic-approach', 'debug-without-getting-lost'],
  ['fluentic-approach', 'extend-without-friction'],
  ['fluentic-approach', 'override-without-guessing'],
  ['fluentic-approach', 'theme-without-retrofitting'],
  ['fluentic-approach', 'extraction-without-lock-in'],
  ['fluentic-approach', 'beyond-the-sketch'],
  ['learn', 'installation'],
  ['learn', 'styling-one-element'],
  ['learn', 'hover-focus-and-media'],
  ['learn', 'moving-styles-into-separate-files'],
  ['learn', 'styling-reusable-components'],
  ['learn', 'publishing-component-styling-apis'],
  ['learn', 'styling-components-from-outside'],
  ['learn', 'attaching-outside-styles'],
  ['learn', 'resolving-styles'],
  ['learn', 'composition-patterns'],
  ['learn', 'tokens'],
  ['learn', 'create-values'],
  ['learn', 'styling-an-application'],
  ['learn', 'combining-themes'],
  ['learn', 'following-styles-back-to-source'],
  ['learn', 'publishing-component-libraries'],
  ['learn', 'keeping-the-model-simple'],
  ['learn', 'recap'],
  ['beyond-the-basics', 'tracing-styles-in-real-apps'],
  ['beyond-the-basics', 'custom-style-builders'],
  ['beyond-the-basics', 'multiple-style-functions'],
  ['beyond-the-basics', 'custom-chain-methods'],
  ['beyond-the-basics', 'custom-style-fields'],
  ['beyond-the-basics', 'priority-and-rule-order'],
  ['beyond-the-basics', 'static-extraction'],
  ['beyond-the-basics', 'runtime-and-dynamic-styles'],
  ['beyond-the-basics', 'devtools-and-sourcemaps'],
  ['integrations', 'overview'],
  ['integrations', 'options'],
  ['integrations', 'nextjs'],
  ['integrations', 'vite'],
  ['integrations', 'webpack'],
  ['integrations', 'rspack'],
  ['integrations', 'farm'],
  ['integrations', 'parcel'],
  ['integrations', 'babel'],
  ['integrations', 'custom-compiler'],
  ['integrations', 'jsx-runtime-setup'],
  ['integrations', 'runtime-only-mode'],
  ['integrations', 'static-extraction'],
  ['design', 'style-builder'],
  ['design', 'chains-and-selectors'],
  ['design', 'custom-style-vocabulary'],
  ['design', 'priority-model'],
  ['design', 'runtime-and-extraction-contract'],
  ['design', 'giving-component-parts-identity'],
  ['design', 'outside-styles-target-public-parts'],
  ['design', 'components-own-their-implementation'],
  ['design', 'resolving-at-component-boundaries'],
  ['design', 'style-resolution-and-cache'],
  ['design', 'hoisting-inline-style-chains'],
  ['design', 'publishing-less-surface-area'],
  ['design', 'themes-as-style-data'],
  ['design', 'debugging-through-identity'],
  ['design', 'runtime-and-react'],
  ['design', 'changing-existing-styles'],
  ['design', 'local-change-in-react'],
  ['design', 'when-styles-cross-boundaries'],
  ['design', 'staying-in-typescript'],
  ['design', 'component-style-composition'],
  ['design', 'public-styling-contracts'],
  ['design', 'reviewing-generated-styles'],
  ['design', 'tradeoffs'],
  ['reference', 'style'],
  ['reference', 'style-slot'],
  ['reference', 'style-scope'],
  ['reference', 'combine-style'],
  ['reference', 'bind-scope'],
  ['reference', 'combine-scope'],
  ['reference', 'tokens'],
  ['reference', 'values'],
  ['reference', 'create-theme'],
  ['reference', 'create-style-fn'],
  ['reference', 'selectors'],
  ['reference', 'transforms'],
  ['reference', 'priority'],
  ['reference', 'css-helpers'],
  ['reference', 'types'],
  ['reference', 'imports'],
  ['reference', 'plugin-options'],
  ['benchmark', 'overview'],
  ['benchmark', 'react-app'],
  ['benchmark', 'ssr-style'],
  ['benchmark', 'compiler'],
];

function renderInlineCode(value: string): ReactNode {
  return value.split(/(`[^`]+`)/g).map((part) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={part}>{part.slice(1, -1)}</code>;
    }

    return part;
  });
}

function stripInlineCode(value?: string) {
  return value?.replace(/`/g, '');
}

function getPager(slug: string[]) {
  const key = slug.join('/');
  const index = docsOrder.findIndex((item) => item.join('/') === key);

  if (index < 0) return null;

  const prevSlug = docsOrder[index - 1];
  const nextSlug = docsOrder[index + 1];

  return {
    prev: prevSlug ? source.getPage(prevSlug) : null,
    next: nextSlug ? source.getPage(nextSlug) : null,
  };
}

export default async function Page(props: PageProps) {
  const params = await props.params;
  const slug = params.slug?.length ? params.slug : ['why-fluentic'];
  const page = source.getPage(slug);

  if (!page) {
    notFound();
  }

  const MDX = page.data.body;
  const pager = getPager(slug);
  const visibleDescription = page.data.hideDescription ? undefined : page.data.description;

  return (
    <DocsPage breadcrumb={{ enabled: false }} toc={page.data.toc} full={page.slugs[0] === 'playground'}>
      <DocsTitle>{page.data.title}</DocsTitle>
      {visibleDescription ? <DocsDescription>{renderInlineCode(visibleDescription)}</DocsDescription> : null}
      <DocsBody>
        <MDX components={getMDXComponents()} />
      </DocsBody>
      {pager
        ? (
          <nav className='docs-pager' aria-label='Page navigation'>
            {pager.prev
              ? (
                <Link className='docs-pager-card docs-pager-prev' href={pager.prev.url}>
                  <span>Previous</span>
                  <strong>{pager.prev.data.title}</strong>
                  {pager.prev.data.description ? <small>{stripInlineCode(pager.prev.data.description)}</small> : null}
                </Link>
              )
              : <span aria-hidden='true' />}
            {pager.next
              ? (
                <Link className='docs-pager-card docs-pager-next' href={pager.next.url}>
                  <span>Next</span>
                  <strong>{pager.next.data.title}</strong>
                  {pager.next.data.description ? <small>{stripInlineCode(pager.next.data.description)}</small> : null}
                </Link>
              )
              : <span aria-hidden='true' />}
          </nav>
        )
        : null}
    </DocsPage>
  );
}

export function generateStaticParams() {
  return [
    { slug: [] },
    ...source.generateParams(),
  ];
}

export async function generateMetadata(props: PageProps) {
  const params = await props.params;
  const slug = params.slug?.length ? params.slug : ['why-fluentic'];
  const page = source.getPage(slug);

  if (!page) {
    notFound();
  }

  return {
    title: page.data.title,
    description: stripInlineCode(page.data.description),
  };
}
