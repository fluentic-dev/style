import { createMDX } from 'fumadocs-mdx/next';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const docsBase = normalizeBase(process.env.DOCS_BASE ?? '/style');

function normalizeBase(base) {
  if (!base || base === '/') {
    return '';
  }

  return `/${base.replace(/^\/+|\/+$/g, '')}`;
}

/** @type {import('next').NextConfig} */
const config = {
  allowedDevOrigins: ['10.*.*.*', '172.*.*.*', '192.168.*.*'],
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
  transpilePackages: ['@docs/playground'],
  webpack(webpackConfig) {
    webpackConfig.resolve.alias = {
      ...webpackConfig.resolve.alias,
      '@babel/core$': require.resolve('@docs/playground/babel-browser'),
    };
    return webpackConfig;
  },
};

const withMDX = createMDX();

export default withMDX(config);
