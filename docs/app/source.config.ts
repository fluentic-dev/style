import { defineConfig, defineDocs } from 'fumadocs-mdx/config';
import { pageSchema } from 'fumadocs-core/source/schema';
import githubDarkDefault from 'shiki/themes/github-dark-default.mjs';
import githubLightDefault from 'shiki/themes/github-light-default.mjs';

export const docs = defineDocs({
  dir: '../content/src/content/docs',
  docs: {
    schema: pageSchema.extend({
      hideDescription: pageSchema.shape.full,
    }),
  },
});

const lightCodeTheme = {
  ...githubLightDefault,
  name: 'fluentic-github-light',
  tokenColors: [
    {
      scope: [
        'constant.numeric',
        'constant.language.boolean',
        'constant.language.null',
      ],
      settings: {
        foreground: '#116329',
      },
    },
    {
      scope: ['string', 'string punctuation.section.embedded source'],
      settings: {
        foreground: '#0A3069',
      },
    },
    ...(githubLightDefault.tokenColors ?? []),
  ],
};

const darkCodeTheme = {
  ...githubDarkDefault,
  name: 'fluentic-github-dark',
  tokenColors: [
    {
      scope: [
        'constant.numeric',
        'constant.language.boolean',
        'constant.language.null',
      ],
      settings: {
        foreground: '#7EE787',
      },
    },
    {
      scope: ['string', 'string punctuation.section.embedded source'],
      settings: {
        foreground: '#A5D6FF',
      },
    },
    ...(githubDarkDefault.tokenColors ?? []),
  ],
};

export default defineConfig({
  mdxOptions: {
    rehypeCodeOptions: {
      themes: {
        light: lightCodeTheme,
        dark: darkCodeTheme,
      },
      defaultColor: false,
    },
  },
});
