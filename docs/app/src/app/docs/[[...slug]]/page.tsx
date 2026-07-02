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
  ['why-fluentic', 'changing-existing-styles'],
  ['why-fluentic', 'local-change-in-react'],
  ['why-fluentic', 'when-styles-cross-boundaries'],
  ['why-fluentic', 'staying-in-typescript'],
  ['why-fluentic', 'component-style-composition'],
  ['why-fluentic', 'public-styling-contracts'],
  ['why-fluentic', 'reviewing-generated-styles'],
  ['why-fluentic', 'the-style-model'],
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
  ['beyond-the-basics', 'custom-chain-methods'],
  ['beyond-the-basics', 'custom-style-fields'],
  ['beyond-the-basics', 'priority-and-rule-order'],
  ['beyond-the-basics', 'static-extraction'],
  ['beyond-the-basics', 'runtime-and-dynamic-styles'],
  ['beyond-the-basics', 'devtools-and-sourcemaps'],
  ['integrations', 'overview'],
  ['integrations', 'nextjs'],
  ['integrations', 'vite'],
  ['integrations', 'webpack'],
  ['integrations', 'rspack'],
  ['integrations', 'babel'],
  ['integrations', 'custom-compiler'],
  ['integrations', 'jsx-runtime-setup'],
  ['integrations', 'runtime-only-mode'],
  ['integrations', 'static-extraction'],
  ['design', 'keeping-styles-as-data'],
  ['design', 'separating-behavior-from-declarations'],
  ['design', 'giving-component-parts-identity'],
  ['design', 'outside-styles-target-public-parts'],
  ['design', 'components-own-their-implementation'],
  ['design', 'resolving-at-component-boundaries'],
  ['design', 'publishing-less-surface-area'],
  ['design', 'themes-as-style-data'],
  ['design', 'debugging-through-identity'],
  ['design', 'runtime-and-react'],
  ['design', 'compiler-as-delivery'],
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
  const slug = params.slug?.length ? params.slug : ['why-fluentic', 'changing-existing-styles'];
  const page = source.getPage(slug);

  if (!page) {
    notFound();
  }

  const MDX = page.data.body;
  const pager = getPager(slug);

  return (
    <DocsPage breadcrumb={{ enabled: false }} toc={page.data.toc} full={page.slugs[0] === 'playground'}>
      <DocsTitle>{page.data.title}</DocsTitle>
      {page.data.description ? <DocsDescription>{renderInlineCode(page.data.description)}</DocsDescription> : null}
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
  const slug = params.slug?.length ? params.slug : ['why-fluentic', 'changing-existing-styles'];
  const page = source.getPage(slug);

  if (!page) {
    notFound();
  }

  return {
    title: page.data.title,
    description: stripInlineCode(page.data.description),
  };
}
