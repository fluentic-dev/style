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
  ['installation'],
  ['fluentic-approach', 'from-elements-to-components'],
  ['fluentic-approach', 'debug-without-getting-lost'],
  ['fluentic-approach', 'extend-without-friction'],
  ['fluentic-approach', 'override-without-guessing'],
  ['fluentic-approach', 'theme-without-retrofitting'],
  ['fluentic-approach', 'extraction-without-lock-in'],
  ['fluentic-approach', 'beyond-the-sketch'],
  ['learn', 'start-here'],
  ['learn', 'style-one-element'],
  ['learn', 'compose-element-styles'],
  ['learn', 'add-local-states-and-media'],
  ['learn', 'understand-the-style-builder'],
  ['learn', 'organize-styles-in-files'],
  ['learn', 'style-reusable-component'],
  ['learn', 'name-component-parts'],
  ['learn', 'style-component-parts-from-outside'],
  ['learn', 'accept-and-resolve-outside-styles'],
  ['learn', 'add-variants-and-states'],
  ['learn', 'expose-styleable-parts'],
  ['learn', 'theme-component-tokens'],
  ['learn', 'theme-app-values'],
  ['learn', 'apply-themes'],
  ['learn', 'theme-app-with-components'],
  ['learn', 'debug-styles'],
  ['learn', 'ship-fluentic'],
  ['learn', 'recap'],
  ['beyond-the-basics', 'runtime-and-dynamic-styles'],
  ['beyond-the-basics', 'interop-with-non-fluentic-apis'],
  ['beyond-the-basics', 'using-css-at-rules'],
  ['beyond-the-basics', 'priority-and-rule-order'],
  ['beyond-the-basics', 'tracing-styles-in-real-apps'],
  ['beyond-the-basics', 'devtools-and-sourcemaps'],
  ['beyond-the-basics', 'custom-style-builders'],
  ['beyond-the-basics', 'custom-style-fields'],
  ['beyond-the-basics', 'custom-chain-methods'],
  ['beyond-the-basics', 'multiple-style-functions'],
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
  ['design', 'start-from-the-problem'],
  ['design', 'the-first-api-style-one-element'],
  ['design', 'why-chains-exist'],
  ['design', 'why-css-arrays-are-not-enough'],
  ['design', 'why-components-need-slots'],
  ['design', 'why-outside-styling-needs-scopes'],
  ['design', 'why-resolution-happens-at-component-boundaries'],
  ['design', 'why-themes-are-data'],
  ['design', 'why-tokens-and-app-values-split'],
  ['design', 'the-style-data-model'],
  ['design', 'runtime-resolution-and-cache'],
  ['design', 'why-extraction-needs-structure'],
  ['design', 'compiler-hoisting'],
  ['design', 'priority-and-rule-order'],
  ['design', 'debugging-through-identity'],
  ['design', 'custom-vocabulary-without-forking-the-model'],
  ['design', 'reviewing-generated-css'],
  ['design', 'tradeoffs'],
  ['reference', 'overview'],
  ['reference', 'imports'],
  ['reference', 'style'],
  ['reference', 'style-slot'],
  ['reference', 'style-scope'],
  ['reference', 'combine-style'],
  ['reference', 'bind-scope'],
  ['reference', 'expose-style'],
  ['reference', 'create-tokens'],
  ['reference', 'create-values'],
  ['reference', 'create-theme'],
  ['reference', 'runtime-interop'],
  ['reference', 'create-style-fn'],
  ['reference', 'selectors'],
  ['reference', 'transforms'],
  ['reference', 'priority'],
  ['reference', 'css-helpers'],
  ['reference', 'create-keyframes'],
  ['reference', 'create-font-face'],
  ['reference', 'font-src'],
  ['reference', 'create-font-palette-values'],
  ['reference', 'create-counter-style'],
  ['reference', 'create-property'],
  ['reference', 'create-position-try'],
  ['reference', 'runtime-and-dev'],
  ['reference', 'types'],
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
