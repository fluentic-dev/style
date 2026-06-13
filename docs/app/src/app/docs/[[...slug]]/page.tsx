import { notFound } from 'next/navigation';
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from 'fumadocs-ui/layouts/docs/page';
import type { ReactNode } from 'react';
import { getMDXComponents } from '../../../components/mdx';
import { source } from '../../../lib/source';

type PageProps = {
  params: Promise<{
    slug?: string[];
  }>;
};

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

export default async function Page(props: PageProps) {
  const params = await props.params;
  const page = source.getPage(params.slug ?? []);

  if (!page) {
    notFound();
  }

  const MDX = page.data.body;

  return (
    <DocsPage breadcrumb={{ enabled: false }} toc={page.data.toc} full={page.slugs[0] === 'playground'}>
      <DocsTitle>{page.data.title}</DocsTitle>
      {page.data.description ? <DocsDescription>{renderInlineCode(page.data.description)}</DocsDescription> : null}
      <DocsBody>
        <MDX components={getMDXComponents()} />
      </DocsBody>
    </DocsPage>
  );
}

export function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata(props: PageProps) {
  const params = await props.params;
  const page = source.getPage(params.slug ?? []);

  if (!page) {
    notFound();
  }

  return {
    title: page.data.title,
    description: stripInlineCode(page.data.description),
  };
}
