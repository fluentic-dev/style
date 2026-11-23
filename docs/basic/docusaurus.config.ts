import type { Config } from '@docusaurus/types';
import { themes } from 'prism-react-renderer';

const baseUrl = `/${(process.env.DOCS_BASE ?? '/style/').replace(/^\/+|\/+$/g, '')}/`.replace('//', '/');

const config: Config = {
  title: 'Fluentic Style',
  tagline: 'A complete styling system for your components and apps.',
  favicon: 'img/logo.png',
  url: process.env.DOCS_SITE ?? 'https://fluenticstack.com',
  baseUrl,
  trailingSlash: true,
  organizationName: 'fluentic-dev',
  projectName: 'style',
  onBrokenLinks: 'throw',
  markdown: { hooks: { onBrokenMarkdownLinks: 'throw' } },
  plugins: [function playgroundBrowserCompiler() {
    return {
      name: 'playground-browser-compiler',
      configureWebpack() {
        return {
          resolve: { alias: { '@babel/core$': require.resolve('@docs/playground/babel-browser') } },
        };
      },
    };
  }],
  presets: [['classic', {
    docs: { sidebarPath: './sidebars.ts', routeBasePath: 'docs' },
    blog: false,
    theme: { customCss: './src/css/custom.css' },
  }]],
  themes: [['@easyops-cn/docusaurus-search-local', {
    hashed: 'filename',
    indexBlog: false,
    indexPages: false,
  }]],
  themeConfig: {
    navbar: {
      title: 'fluentic/style',
      logo: { alt: '', src: 'img/logo.png' },
      items: [
        { type: 'doc', docId: 'intro', label: 'Docs', position: 'left' },
        { to: '/docs/reference/overview/', label: 'API', position: 'left' },
        { to: '/playground/', label: 'Playground', position: 'left' },
        { to: '/docs/advanced/', label: 'Reference map', position: 'left' },
        {
          href: 'https://github.com/fluentic-dev/style',
          label: 'GitHub',
          position: 'right',
          className: 'navbar-github',
        },
      ],
    },
    footer: { copyright: 'Fluentic Style · MIT licensed' },
    colorMode: { defaultMode: 'light', respectPrefersColorScheme: true },
    prism: {
      magicComments: [
        {
          className: 'theme-code-block-highlighted-line',
          line: 'highlight-next-line',
          block: { start: 'highlight-start', end: 'highlight-end' },
        },
      ],
      theme: {
        ...themes.github,
        plain: { color: '#334155', backgroundColor: '#ffffff' },
        styles: [
          { types: ['comment', 'prolog'], style: { color: '#64748b', fontStyle: 'normal' } },
          { types: ['keyword', 'tag'], style: { color: '#e11d48' } },
          { types: ['string', 'attr-value'], style: { color: '#005f87' } },
          { types: ['function', 'class-name'], style: { color: '#843dff' } },
          { types: ['number', 'boolean'], style: { color: '#0055c4' } },
          { types: ['operator', 'punctuation'], style: { color: '#59667b' } },
          { types: ['property', 'attr-name'], style: { color: '#334155' } },
        ],
      },
      darkTheme: themes.vsDark,
      additionalLanguages: ['bash', 'json'],
    },
    tableOfContents: { minHeadingLevel: 2, maxHeadingLevel: 3 },
  },
};
export default config;
