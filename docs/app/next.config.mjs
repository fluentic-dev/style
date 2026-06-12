import { createMDX } from 'fumadocs-mdx/next';

const docsBase = normalizeBase(process.env.DOCS_BASE ?? '/style');
const docsSite = process.env.DOCS_SITE ?? 'https://fluenticstack.com';

function normalizeBase(base) {
  if (!base || base === '/') {
    return '';
  }

  return `/${base.replace(/^\/+|\/+$/g, '')}`;
}

/** @type {import('next').NextConfig} */
const config = {
  basePath: docsBase,
  env: {
    NEXT_PUBLIC_DOCS_BASE: docsBase,
  },
  images: {
    unoptimized: true,
  },
  output: 'export',
  reactStrictMode: true,
  trailingSlash: true,
  webpack(webpackConfig) {
    webpackConfig.resolve.alias = {
      ...webpackConfig.resolve.alias,
      '#playground': new URL('./src/playground', import.meta.url).pathname,
    };

    return webpackConfig;
  },
};

const withMDX = createMDX();

export default withMDX(config);
