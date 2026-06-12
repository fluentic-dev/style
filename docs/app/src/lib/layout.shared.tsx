import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

const basePath = process.env.NEXT_PUBLIC_DOCS_BASE ?? '';

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <>
          <img src={`${basePath}/logo.png`} alt="" width={34} height={34} />
          <span>Fluentic Style</span>
        </>
      ),
    },
    links: [
      {
        text: 'Home',
        url: '/',
        active: 'url',
      },
      {
        text: 'Docs',
        url: '/docs',
        active: 'nested-url',
        on: 'nav',
      },
      {
        type: 'button',
        text: 'Playground',
        url: '/playground',
        active: 'url',
      },
    ],
    githubUrl: 'https://github.com/fluentic',
  };
}
