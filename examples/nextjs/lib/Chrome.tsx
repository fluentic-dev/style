import { getCss } from '@fluentic/style';
import { getClassName } from '@fluentic/style';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { page } from './styles';

const links = [
  ['/', 'Home'],
  ['/ssg', 'SSG'],
  ['/ssr', 'SSR'],
  ['/rsc', 'RSC'],
  ['/client', 'Client hook'],
  ['/sample', 'Sample'],
] as const;

export function Chrome(props: { children: ReactNode; }) {
  const css = getCss(page);

  return (
    <main css={css.shell}>
      <div css={css.backdrop} aria-hidden='true' />
      <div css={css.content}>
        <header css={css.topbar}>
          <div css={css.brand}>
            <span css={css.brandLabel}>Fluentic Style</span>
            <span css={css.brandValue}>Next.js App Router sample</span>
          </div>
          <div css={css.statusRow}>
            <span css={css.statusChip}>RSC ready</span>
            <span css={css.statusChip}>SSG + SSR</span>
            <span css={css.statusChip}>CSS extracted</span>
          </div>
        </header>
        <nav css={css.nav} aria-label='Example routes'>
          {links.map(([href, label]) => (
            <Link key={href} href={href} {...getClassName(css.link)}>
              {label}
            </Link>
          ))}
        </nav>
        {props.children}
      </div>
    </main>
  );
}
