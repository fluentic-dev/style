import { createClassNameFn } from '@fluentic/style';
import { createNamedTokens } from '@fluentic/style/dialect';
import { selector } from '@fluentic/style/selector';
import {
  createDefaultedTailwindStyleConfig,
  createTailwindClassNamePreset,
} from '@fluentic/style/presets/tailwind';

export const classNameColors = createNamedTokens('next.classname.color', {
  paper: '#fff9f3',
  ink: '#182027',
  inkSoft: '#24303a',
  muted: '#5f6d75',
  line: '#dfd4c8',
  panel: 'rgba(255, 255, 255, 0.84)',
  white: '#ffffff',
  whiteSoft: 'rgb(255 255 255 / 0.68)',
  accent: '#087f83',
  accentSoft: '#d7f4ef',
  plum: '#50245f',
});

const preset = createTailwindClassNamePreset(
  createDefaultedTailwindStyleConfig({
    theme: {
      colors: classNameColors,
      sizes: {
        shell: 'min(1040px, calc(100% - 64px))',
        shellTablet: 'min(calc(100% - 48px), 720px)',
        shellMobile: 'calc(100% - 32px)',
        full: '100%',
        screen: '100vh',
        touch: '44px',
        visualMin: '420px',
        dot: '10px',
      },
      spacing: {
        0: 0,
        page: '44px',
        pageMobile: '24px',
        card: '18px',
        cardLg: '24px',
        field: '10px',
        heroY: '36px',
        heroMobileY: '24px',
        gridGap: '18px',
        sectionY: '34px',
        stack: '14px',
      },
      radii: {
        none: 0,
        card: '8px',
        pill: '999px',
      },
      shadows: {
        panel: '0 18px 44px rgba(45, 39, 31, 0.1)',
        panelLift: '0 24px 70px rgba(45, 39, 31, 0.14)',
      },
      fontSizes: {
        title: 'clamp(2.6rem, 5vw, 5rem)',
        titleMobile: 'clamp(2.4rem, 14vw, 3.7rem)',
        h3: '1.08rem',
        copy: '1rem',
        small: '0.875rem',
        chip: '0.8125rem',
      },
      lineHeights: {
        title: 1,
        titleMobile: 0.96,
        copy: 1.6,
      },
      fontWeights: {
        strong: 760,
      },
    },
  }),
);

export const { className: cx } = createClassNameFn({
  selectors: {
    ...preset.selectors,
    maxMd: selector('@media (max-width: 860px)', 'media'),
    maxSm: selector('@media (max-width: 620px)', 'media'),
    supportsGrid: selector('@supports (display: grid)', 'supports'),
  },
  transform: preset.transform,
});
