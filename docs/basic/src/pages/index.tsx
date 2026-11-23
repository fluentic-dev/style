import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import { useEffect, useState } from 'react';
import DemoSelect from '../components/DemoSelect';
import DocLink from '../components/DocLink';
import FeatureExplorer from '../components/FeatureExplorer';
import FocusCode from '../components/FocusCode';
import HomeDemo, { demoCode, type DemoOptions, initialDemoOptions } from '../components/home/HomeDemos';
import InlineCode from '../components/home/InlineCode';
import InstallCommand from '../components/home/InstallCommand';
import TryStyle from '../components/home/TryStyle';
import styles from './index.module.css';

type Step = {
  id: string;
  title: string;
  text: string;
  code: string;
  link: string;
  to: string;
  advanced?: boolean;
  label?: string;
};

const chapters: { id: string; title: string; steps: Step[]; }[] = [
  {
    id: 'write',
    title: 'Write your styles',
    steps: [
      {
        id: 'first-style',
        title: 'How do I write a style?',
        text: 'Write CSS properties in a typed object. Apply the result with the `css` prop.',
        code: `import { style } from '@fluentic/style';

const button = style({
  color: '#2563eb',
  padding: '8px 16px',
  borderRadius: 8,
});

<button css={button}>Save changes</button>`,
        link: 'Write your first style',
        to: '/docs/writing/object-styles',
      },
      {
        id: 'hover',
        title: 'Change it on hover?',
        text: 'Chain states onto the same style. Hover and keyboard focus stay together.',
        code: `import { style } from '@fluentic/style';

const button = style({ color: '#2563eb' })
  .hover({
    color: '#7c3aed',
    backgroundColor: '#ede9fe',
  })
  .focusVisible({
    color: '#7c3aed',
    backgroundColor: '#ede9fe',
    outline: '2px solid currentColor',
    outlineOffset: 4,
  });

<button css={button}>Save changes</button>`,
        link: 'See states and selectors',
        to: '/docs/writing/states-and-responsive',
      },
      {
        id: 'responsive',
        title: 'What about smaller screens?',
        text: 'Switch from a row to a column with one media query. Resize this mini browser to see the CSS respond.',
        code: `import { style } from '@fluentic/style';

const panel = style({
  display: 'flex',
  gap: 16,
})
  .media('(max-width: 240px)', {
    flexDirection: 'column',
    gap: 8,
  });

const item = style({
  padding: 16,
  backgroundColor: '#ede9fe',
  borderRadius: 8,
});

<section css={panel}>
  <div css={item}>Profile</div>
  <div css={item}>Settings</div>
</section>`,
        link: 'Write responsive styles',
        to: '/docs/writing/states-and-responsive',
      },
      {
        id: 'composition',
        title: 'Need a variant or an override?',
        text: 'Compose base, conditional, and incoming styles in an array. Put overrides after the styles they change.',
        code: `import { style, type StyleProp } from '@fluentic/style';

const button = style({ padding: '8px 16px' });
const compact = style({ padding: '4px 8px' });

type ButtonProps = {
  compact?: boolean;
  css?: StyleProp;
};

function Button(props: ButtonProps) {
  return (
    <button css={[button, props.compact && compact, props.css]}>
      Save changes
    </button>
  );
}

<Button compact css={style({ color: 'blue' })} />`,
        link: 'See how composition works',
        to: '/docs/writing/composition',
      },
      {
        id: 'dynamic',
        title: 'A value comes from your app?',
        text: 'Use props or state for values you only know at runtime.',
        code: `import { style } from '@fluentic/style';

function Swatch({ color }: { color: string }) {
  return (
    <div
      css={style({
        backgroundColor: color,
        width: 32,
        height: 32,
        borderRadius: 8,
      })}
    />
  );
}

<Swatch color="#2563eb" />`,
        link: 'Work with dynamic values',
        to: '/docs/writing/dynamic-values',
      },
    ],
  },
  {
    id: 'vocabulary',
    title: 'Choose your vocabulary',
    steps: [
      {
        id: 'tailwind',
        title: 'Prefer Tailwind utilities?',
        text:
          'Use Tailwind utilities as class names or typed objects. Both support the same css prop and style chains.',
        code: `import { cx } from './styles';

const button = cx('text-blue-500', 'px-4', 'py-2')
  .hover('text-blue-700')
  .md('px-6');

<button css={button}>Save changes</button>`,
        label: 'With the Tailwind preset',
        link: 'See how to configure Tailwind',
        to: '/docs/writing/class-name-styles',
      },
      {
        id: 'design-system',
        title: 'Want your own design system?',
        text: 'Define your own typed objects or class names. Your builder turns either vocabulary into CSS.',
        code: `import { ui } from './styles';

const toolbar = ui({
  row: true,
  center: true,
  gapX: 12,
  padding: 16,
});

<header css={toolbar}>
  <span>Search</span>
  <span>Filter</span>
  <span>Export</span>
</header>`,
        label: 'With your custom builder',
        link: 'See how to create your design system',
        to: '/docs/design-system',
      },
    ],
  },
  {
    id: 'components',
    title: 'Build reusable components',
    steps: [
      {
        id: 'parts',
        title: 'Let others style component parts?',
        text:
          'Expose named parts with slots. The `css` prop styles the root; the `theme` prop customizes the parts. `bindScope` anchors those overrides to this card, and `combineStyle` resolves each part’s styles.',
        code: `import {
  style,
  combineStyle,
  bindScope,
  type StyleProp,
  type StyleTheme,
} from '@fluentic/style';

export const cardStyle = {
  root: style.slot({ padding: 24 }),
  title: style.slot({ fontSize: 20 }),
};

type CardProps = {
  title: string;
  css?: StyleProp;     // Styles for the root element
  theme?: StyleTheme; // Overrides for named parts
};

export function Card(props: CardProps) {
  const css = combineStyle(
    cardStyle,
    bindScope(cardStyle.root, props.theme),
  );

  return (
    <article css={[css.root, props.css]}>
      <h2 css={css.title}>{props.title}</h2>
    </article>
  );
}`,
        label: 'Card.tsx',
        link: 'Build a styleable component',
        to: '/docs/components',
      },
      {
        id: 'customize',
        title: 'Customize several parts at once?',
        text:
          'A component theme is a scope, or an array of scopes. Target the exported slots, then pass the overrides to `Card`. Use `css` separately for its outer layout.',
        code: `import { style } from '@fluentic/style';
import { Card, cardStyle } from './Card';

const compactCard = style.scope([
  cardStyle.root({ padding: 12 }),
  cardStyle.title({ fontSize: 16 }),
]);

const highlightedCard = style.scope([
  cardStyle.title({ color: '#2563eb' }),
]);

<Card
  title="Revenue"
  css={style({ marginBlock: 24 })}
  theme={[compactCard, highlightedCard]}
/>`,
        label: 'Dashboard.tsx · using Card above',
        link: 'Customize component parts',
        to: '/docs/components#customize-those-parts',
      },
    ],
  },
  {
    id: 'theming',
    title: 'Theme your components and app',
    steps: [
      {
        id: 'tokens',
        title: 'Give shared values a name?',
        text:
          'Tokens give colors and spacing stable names. Use the token in a style so a theme can change its value later.',
        code: `import { createTokens, style } from '@fluentic/style';

export const tokens = createTokens({
  accent: '#2563eb',
  space: {
    small: 8,
    medium: 16,
  },
});

export const button = style({
  color: tokens.accent,
  padding: tokens.space.medium,
});

<button css={button}>Save changes</button>`,
        label: 'buttonStyles.tsx',
        link: 'Define your theme tokens',
        to: '/docs/themes#use-named-tokens-for-a-shared-contract',
      },
      {
        id: 'themes',
        title: 'Change those tokens for a section?',
        text:
          '`createTheme` supplies new token values to a subtree. Apply it with `css` on a parent; the button still uses the same styles.',
        code: `import { createTheme } from '@fluentic/style';
import { tokens, button } from './buttonStyles';

const spaciousTheme = createTheme([
  tokens.accent('#7c3aed'),
  tokens.space.medium(24),
]);

<section css={spaciousTheme}>
  <button css={button}>Purple, with 24px padding</button>
</section>`,
        label: 'App.tsx · using the tokens above',
        link: 'Create and apply token themes',
        to: '/docs/learn/create-themes/',
        advanced: true,
      },
      {
        id: 'app-values',
        title: 'Prefer to keep app values visible?',
        text:
          '`createValues` makes literals themeable while keeping the actual colors in your styles. Use named tokens for a shared contract, or app values when the literal reads more clearly.',
        code: `import { createValues, style } from '@fluentic/style';

export const color = createValues([
  '#ffffff',
  '#0f172a',
]);

export const page = style({
  backgroundColor: color('#ffffff'),
  color: color('#0f172a'),
});

<main css={page}>Your app</main>`,
        label: 'appStyles.tsx',
        link: 'Work with app values',
        to: '/docs/themes#keep-app-values-visible',
      },
      {
        id: 'app-theme',
        title: 'Add a dark theme to your app?',
        text:
          'Map each original app value to its dark-theme value. Compose the theme with the page style when dark mode is enabled.',
        code: `import { createTheme } from '@fluentic/style';
import { color, page } from './appStyles';

const darkTheme = createTheme([
  color('#ffffff', '#0f172a'),
  color('#0f172a', '#f8fafc'),
]);

function App({ darkMode }: { darkMode: boolean }) {
  return (
    <main css={[page, darkMode && darkTheme]}>
      Your app
    </main>
  );
}`,
        label: 'App.tsx · using the app values above',
        link: 'Theme your app values',
        to: '/docs/themes',
      },
    ],
  },
  {
    id: 'ship',
    title: 'Connect it to your app',
    steps: [
      {
        id: 'animation',
        title: 'Need animations too?',
        text: 'Define animation steps with `style.keyframes` and reference them directly in your styles.',
        code: `import { style } from '@fluentic/style';

const fadeIn = style.keyframes({
  from: { opacity: 0 },
  to: { opacity: 1 },
});

const notice = style({
  animationName: fadeIn,
  animationDuration: '200ms',
});

<p css={notice}>Changes saved.</p>`,
        link: 'Use keyframes and other CSS at-rules',
        to: '/docs/beyond-the-basics/using-css-at-rules/',
        advanced: true,
      },
      {
        id: 'interop',
        title: 'A library only accepts `className`?',
        text: 'Resolve styles to the `className` and `style` props expected by another component.',
        code: `import { style, getClassName } from '@fluentic/style';
import { Button } from 'your-component-library';

const button = style({ color: '#2563eb' });
const resolved = getClassName(button);

<Button className={resolved.className} style={resolved.style}>
  Save changes
</Button>`,
        label: 'Replace the library import with your own',
        link: 'Connect to third-party APIs',
        to: '/docs/beyond-the-basics/interop-with-non-fluentic-apis/',
        advanced: true,
      },
      {
        id: 'production',
        title: 'Ready to debug and ship?',
        text:
          'Your bundler plugin connects styles to source in development and extracts static CSS for production. Dynamic composition stays available.',
        code: `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { plugin as stylePlugin }
  from '@fluentic/style/plugin/vite';

export default defineConfig({
  plugins: [
    stylePlugin(),
    react({ jsxImportSource: '@fluentic/style/plugin/jsx' }),
  ],
});`,
        label: 'vite.config.ts',
        link: 'Set up your framework and build',
        to: '/docs/frameworks',
      },
    ],
  },
];

const vocabularyFactories: Record<string, string> = {
  'tailwind': `import { createClassNameFn } from '@fluentic/style';
import {
  defaultTailwindTheme,
  createTailwindClassNamePreset,
} from '@fluentic/style/presets/tailwind';

const tailwind = createTailwindClassNamePreset(
  { theme: defaultTailwindTheme },
);

export const { className: cx } = createClassNameFn({
  selectors: tailwind.selectors,
  transform: tailwind.transform,
});`,
  'design-system': `import { createStyleFn, styleTransform, type CSSProperties } from '@fluentic/style';
import { MinimalPrioritySelectors } from '@fluentic/style/selector';

type UiStyle = CSSProperties & {
  row?: boolean;
  center?: boolean;
  gapX?: CSSProperties['columnGap'];
};

const transform = styleTransform<UiStyle>({
  transform({ row, center, gapX, ...css }) {
    if (row) {
      css.display = 'flex';
      css.flexDirection = 'row';
    }
    if (center) {
      css.alignItems = 'center';
      css.justifyContent = 'center';
    }
    if (gapX !== undefined) css.columnGap = gapX;
    return css;
  },
});

export const { style: ui } = createStyleFn({
  selectors: MinimalPrioritySelectors,
  transform,
});`,
};

type VocabularyMode = 'object' | 'classes';
const alternateVocabulary = {
  tailwind: {
    name: 'tw',
    usage: `import { tw } from './styles';

const button = tw({
  text: '$blue.500',
  px: '$4',
  py: '$2',
})
  .hover({ text: '$blue.700' })
  .md({ px: '$6' });

<button css={button}>Save changes</button>`,
    factory: `import { createStyleFn } from '@fluentic/style';
import {
  createDefaultedTailwindStyleConfig,
  createTailwindStyleTransform,
  TailwindSelectors,
} from '@fluentic/style/presets/tailwind';

const config = createDefaultedTailwindStyleConfig({});

export const { style: tw } = createStyleFn({
  selectors: TailwindSelectors,
  transform: createTailwindStyleTransform(config),
});`,
  },
  'design-system': {
    name: 'cx',
    usage: `import { cx } from './styles';

const toolbar = cx('row', 'center', 'gap-12', 'pad-16');

<header css={toolbar}>
  <span>Search</span>
  <span>Filter</span>
  <span>Export</span>
</header>`,
    factory: `import {
  createClassNameFn,
  classNameTransform,
  type CSSProperties,
} from '@fluentic/style';
import { MinimalPrioritySelectors } from '@fluentic/style/selector';

type UiClassName = 'row' | 'center' | 'gap-12' | 'pad-16';

const rules: Record<UiClassName, CSSProperties> = {
  row: {
    display: 'flex',
    flexDirection: 'row',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  'gap-12': { columnGap: 12 },
  'pad-16': { padding: 16 },
};

export const { className: cx } = createClassNameFn({
  selectors: MinimalPrioritySelectors,
  transform: classNameTransform<UiClassName>({
    transform: (name) => rules[name],
  }),
});`,
  },
};

function vocabularyPlugin(id: string, overrideName?: string) {
  const name = overrideName ?? (id === 'tailwind' ? 'cx' : 'ui');
  return `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { plugin as stylePlugin } from '@fluentic/style/plugin/vite';
import { ${name} } from './src/styles';

export default defineConfig({
  plugins: [
    stylePlugin({
      importSources: [{
        source: './styles', // Matches the import in App.tsx
        name: '${name}',
        styleFn: ${name},
      }],
    }),
    react({ jsxImportSource: '@fluentic/style/plugin/jsx' }),
  ],
});`;
}

const codeTabs = ['Usage', 'Factory', 'Plugin setup'];

function VocabularyCode({ step, active, onChange }: { step: Step; active: number; onChange: (tab: number) => void; }) {
  const [mode, setMode] = useState<VocabularyMode>(step.id === 'tailwind' ? 'classes' : 'object');
  const useAlternate = step.id === 'tailwind' ? mode === 'object' : mode === 'classes';
  const alternate = alternateVocabulary[step.id as keyof typeof alternateVocabulary];
  const files = ['src/App.tsx', 'src/styles.ts', 'vite.config.ts'];
  const code = useAlternate
    ? [alternate.usage, alternate.factory, vocabularyPlugin(step.id, alternate.name)]
    : [step.code, vocabularyFactories[step.id], vocabularyPlugin(step.id)];
  function select(tab: number) {
    onChange(tab);
    document.getElementById(`${step.id}-tab-${tab}`)?.focus();
  }
  return (
    <>
      <div className={styles.vocabularyModes}>
        <span>Two ways to write it</span>
        <div role='group' aria-label={`${step.title} syntax`}>
          {(['object', 'classes'] as const).map((option) => (
            <button
              key={option}
              type='button'
              aria-pressed={mode === option}
              onClick={() => setMode(option)}
            >
              {option === 'object' ? 'Object' : 'Class names'}
            </button>
          ))}
        </div>
        <p>Same result. Switch syntax to compare usage and setup.</p>
      </div>
      <div className={styles.codeTabs} role='tablist' aria-label={`${step.title} code`}>
        {codeTabs.map((label, index) => (
          <button
            key={label}
            id={`${step.id}-tab-${index}`}
            role='tab'
            aria-selected={active === index}
            aria-controls={`${step.id}-panel`}
            tabIndex={active === index ? 0 : -1}
            onClick={() => onChange(index)}
            onKeyDown={(event) => {
              const next = event.key === 'ArrowRight'
                ? (index + 1) % 3
                : event.key === 'ArrowLeft'
                ? (index + 2) % 3
                : event.key === 'Home'
                ? 0
                : event.key === 'End'
                ? 2
                : null;
              if (next !== null) {
                event.preventDefault();
                select(next);
              }
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <div role='tabpanel' id={`${step.id}-panel`} aria-labelledby={`${step.id}-tab-${active}`} tabIndex={0}>
        <div className={styles.codeLabel}>
          <span className={styles.fileBadge} aria-hidden='true'>TS</span>
          <span>{files[active]}</span>
        </div>
        <FocusCode
          id={useAlternate ? `${step.id}-alternate` : step.id}
          variant={['usage', 'factory', 'plugin'][active]}
          language={active === 0 ? 'tsx' : 'ts'}
        >
          {code[active]}
        </FocusCode>
      </div>
    </>
  );
}

function VocabularyPreview({ id, onConfig }: { id: string; onConfig: () => void; }) {
  if (!vocabularyFactories[id]) return null;
  return (
    <div className={styles.preview}>
      <div className={styles.previewHeading}>
        <span className={styles.previewLabel}>LIVE PREVIEW</span>
        <button className={styles.configButton} onClick={onConfig}>See config →</button>
      </div>
      <div className={styles.buttonStage}>
        {id === 'tailwind'
          ? <button className={`${styles.previewButton} ${styles.tailwindButton}`}>Save changes</button>
          : (
            <header className={styles.toolbarDemo}>
              <span>Search</span>
              <span>Filter</span>
              <span>Export</span>
            </header>
          )}
      </div>
      <p className={styles.demoHint}>
        <InlineCode
          text={id === 'tailwind'
            ? 'Hover the button. Both syntaxes produce the same styles.'
            : 'The same flex toolbar, using typed objects or class names.'}
        />
      </p>
    </div>
  );
}

const chapterNotes = [
  'Start small. Add states, layouts, and dynamic values as you go.',
  'CSS objects, utility classes, or a vocabulary of your own.',
  'Give every component a clear, customizable styling API.',
  'Connect reusable values to component and app themes.',
  'Bring it all into your framework and production build.',
];

const responsiveDocument =
  `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>
*{box-sizing:border-box}body{margin:0;padding:12px;font:14px system-ui;color:#4c1d95;background:white}
section{display:flex;gap:16px}section>div{padding:16px;background:#ede9fe;border-radius:8px}
@media(max-width:240px){section{flex-direction:column;gap:8px}}
</style></head><body><section><div>Profile</div><div>Settings</div></section></body></html>`;

function StylePreview(
  { id, compact, onCompactChange, swatchColor, onColorChange }: {
    id: string;
    compact: boolean;
    onCompactChange: (value: boolean) => void;
    swatchColor: string;
    onColorChange: (value: string) => void;
  },
) {
  const [narrow, setNarrow] = useState(false);
  if (!['first-style', 'hover', 'responsive', 'composition', 'dynamic'].includes(id)) return null;
  return (
    <div className={styles.preview}>
      <span className={styles.previewLabel}>{id === 'hover' ? 'HOVER OR FOCUS' : 'LIVE PREVIEW'}</span>
      {id === 'dynamic'
        ? (
          <>
            <DemoSelect label='Color' value={swatchColor} onChange={onColorChange} />
            <div
              style={{ backgroundColor: swatchColor, width: 32, height: 32, borderRadius: 8 }}
              aria-label={`Swatch: ${swatchColor}`}
            />
            <p className={styles.demoHint}>
              <code className={styles.inlineCode}>color = {swatchColor}</code>
            </p>
          </>
        )
        : id === 'responsive'
        ? (
          <>
            <div className={styles.viewportToolbar}>
              <button aria-pressed={!narrow} onClick={() => setNarrow(false)}>Wide</button>
              <button aria-pressed={narrow} onClick={() => setNarrow(true)}>Narrow</button>
            </div>
            <div className={`${styles.miniBrowser} ${narrow ? styles.narrowBrowser : ''}`}>
              <div className={styles.miniBrowserBar}>
                <span aria-hidden='true'>● ● ●</span> Preview
              </div>
              <iframe title='Responsive flex layout' srcDoc={responsiveDocument} sandbox='' />
            </div>
            <p className={styles.demoHint}>
              Real viewport. Real media query.<br />The layout changes below{' '}
              <code className={styles.inlineCode}>240px</code>.
            </p>
          </>
        )
        : (
          <>
            {id === 'composition' && (
              <label className={styles.demoCheckbox}>
                <input type='checkbox' checked={compact} onChange={(event) => onCompactChange(event.target.checked)} />
                Compact
              </label>
            )}
            <div className={styles.buttonStage}>
              <button
                className={`${styles.previewButton} ${id === 'hover' ? styles.previewHover : ''}`}
                style={id === 'composition' ? { padding: compact ? '4px 8px' : '8px 16px', color: 'blue' } : undefined}
              >
                Save changes
              </button>
            </div>
            {id === 'composition' && (
              <p className={styles.demoHint}>
                <code className={styles.inlineCode}>padding: {compact ? '4px 8px' : '8px 16px'}</code>
                <br />The incoming blue color stays.
              </p>
            )}
          </>
        )}
    </div>
  );
}

export default function Home() {
  const [demoOptions, setDemoOptions] = useState<Record<string, DemoOptions>>({});
  const [activeCodeTabs, setActiveCodeTabs] = useState<Record<string, number>>({});
  function showCodeTab(id: string, tab: number) {
    setActiveCodeTabs((current) => ({ ...current, [id]: tab }));
  }
  const [compact, setCompact] = useState(true);
  const [swatchColor, setSwatchColor] = useState('#2563eb');
  const [activeChapter, setActiveChapter] = useState(chapters[0].id);
  useEffect(() => {
    const update = () => {
      const current = chapters.filter(({ id }) =>
        (document.getElementById(id)?.getBoundingClientRect().top ?? Infinity) <= 180
      ).at(-1);
      setActiveChapter(current?.id ?? chapters[0].id);
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);
  return (
    <Layout
      title='Typed styles. Your way.'
      description='Typed CSS, Tailwind utilities, responsive layouts, component customization, and app-wide themes with Fluentic Style.'
    >
      <main className={`${styles.home} fluentic-home`}>
        <header className={styles.hero}>
          <div className={styles.heroDetail}>
            <p className={styles.eyebrow}>TYPED STYLES. YOUR WAY.</p>
            <h1>
              Write styles.<br />
              <span>Build your system.</span>
            </h1>
            <p className={styles.lead}>
              Start with familiar CSS in TypeScript. Compose variants, theme component parts, and extract static styles
              for production—all through one styling API.
            </p>
            <div className={styles.actions}>
              <Link className={styles.primary} to='/playground/'>Try the playground</Link>
              <Link className={styles.secondary} to='/docs/quick-start'>Get started</Link>
            </div>
            <p className={styles.heroNote}>Explore in your browser. No project setup needed.</p>
            <InstallCommand />
            <div className={styles.frameworks} aria-label='Framework support'>
              <div className={styles.frameworkRow}>
                <span className={styles.frameworkLabel}>Made for</span>
                <div className={styles.frameworkChips}>
                  <Link to='/docs/frameworks#react-with-vite'>React</Link>
                  <Link to='/docs/frameworks#nextjs'>Next.js</Link>
                  <Link to='/docs/frameworks#preact-and-solidjs'>Preact</Link>
                  <Link to='/docs/frameworks#preact-and-solidjs'>Solid</Link>
                </div>
              </div>
              <div className={styles.frameworkRow}>
                <span className={styles.frameworkLabel}>Coming next</span>
                <div className={`${styles.frameworkChips} ${styles.upcomingFrameworks}`}>
                  <span>Vue</span>
                  <span>Svelte</span>
                  <span>Angular</span>
                </div>
              </div>
              <p className={styles.frameworkNote}>Vue, Svelte, and Angular adapters are in development.</p>
            </div>
          </div>
          <TryStyle />
        </header>
        <section className={styles.capabilities} aria-labelledby='capabilities-title'>
          <div className={styles.capabilitiesHeading}>
            <h2 id='capabilities-title'>For the web projects you work on.</h2>
            <p>
              From a React app to a Next.js project, keep a familiar way to style in TypeScript. Framework and bundler
              integrations help Fluentic fit your stack, with more frameworks on the way.
            </p>
          </div>
          <FeatureExplorer />
        </section>
        <section className={styles.workflow} aria-label='Styles, frameworks, and build integrations'>
          <div>
            <span>STYLE</span>
            <h2>CSS in TypeScript.</h2>
            <p>
              Write CSS properties, compose styles, and define variants, tokens, and themes—with autocomplete and type
              checking.
            </p>
          </div>
          <div>
            <span>FRAMEWORKS</span>
            <h2>Same styles. Different frameworks.</h2>
            <p>
              Keep your styles, variants, tokens, and themes in TypeScript. Switch frameworks without rewriting
              them—only the framework integration changes how you apply styles to your UI.
            </p>
            <Link to='/docs/frameworks'>Explore framework support</Link>
          </div>
          <div>
            <span>BUILD TOOLS</span>
            <h2>Plug into your build.</h2>
            <p>
              Vite, Next.js, Webpack, Rspack, Parcel, and Farm integrations—with development source maps and static CSS
              extraction.
            </p>
            <Link to='/docs/frameworks#other-bundlers'>Find your integration</Link>
          </div>
        </section>
        <div className={styles.tourIntro}>
          <p className={styles.sectionLabel}>LEARN BY CHANGING THINGS</p>
          <h2>From your first style to a shared system.</h2>
          <p>Try the controls, read the matching code, then take an example into your app.</p>
        </div>
        <div className={styles.tour}>
          <aside className={styles.contents}>
            <nav aria-label='Tour chapters'>
              <span className={styles.navLabel}>
                THE QUICK TOUR{' '}
                <small>{chapters.findIndex((chapter) => chapter.id === activeChapter) + 1} / {chapters.length}</small>
              </span>
              {chapters.map((chapter) => (
                <button
                  type='button'
                  key={chapter.id}
                  onClick={() => document.getElementById(chapter.id)?.scrollIntoView({ block: 'start' })}
                  aria-current={activeChapter === chapter.id ? 'location' : undefined}
                >
                  {chapter.title}
                </button>
              ))}
              <Link className={styles.setupLink} to='/docs/quick-start'>Installation & setup</Link>
            </nav>
            <p>
              Examples focus on the idea.<br />Each guide includes the setup.
            </p>
          </aside>
          <div className={styles.timeline}>
            {chapters.map((chapter, chapterIndex) => (
              <section
                key={chapter.id}
                id={chapter.id}
                className={styles.chapter}
                aria-labelledby={`${chapter.id}-title`}
              >
                <div className={styles.chapterHeading}>
                  <div>
                    <h2 id={`${chapter.id}-title`} className={styles.chapterTitle}>{chapter.title}</h2>
                    <p>{chapterNotes[chapterIndex]}</p>
                  </div>
                  <span className={styles.chapterCount}>{chapter.steps.length} examples</span>
                </div>
                {chapter.steps.map((step) => (
                  <article className={styles.step} key={step.id} id={step.id}>
                    <div className={styles.explanation}>
                      <h3>
                        <InlineCode text={step.title} />
                      </h3>
                      <p>
                        <InlineCode text={step.text} />
                      </p>
                      <StylePreview
                        id={step.id}
                        compact={compact}
                        onCompactChange={setCompact}
                        swatchColor={swatchColor}
                        onColorChange={setSwatchColor}
                      />
                      <HomeDemo
                        tokens={demoOptions.tokens ?? initialDemoOptions}
                        id={step.id}
                        value={demoOptions[step.id] ?? initialDemoOptions}
                        onChange={(patch) =>
                          setDemoOptions((current) => ({
                            ...current,
                            [step.id]: { ...(current[step.id] ?? initialDemoOptions), ...patch },
                          }))}
                      />
                      <VocabularyPreview
                        id={step.id}
                        onConfig={() => {
                          showCodeTab(step.id, 1);
                          document.getElementById(`${step.id}-tab-1`)?.focus({ preventScroll: true });
                        }}
                      />
                    </div>
                    <div className={styles.example}>
                      {vocabularyFactories[step.id]
                        ? (
                          <VocabularyCode
                            step={step}
                            active={activeCodeTabs[step.id] ?? 0}
                            onChange={(tab) => showCodeTab(step.id, tab)}
                          />
                        )
                        : (
                          <>
                            <div className={styles.codeLabel}>
                              <span className={styles.fileBadge} aria-hidden='true'>TS</span>
                              <span>{step.label ?? `${step.id}.tsx`}</span>
                            </div>
                            <FocusCode id={step.id}>
                              {step.id === 'composition'
                                ? step.code.replace('<Button compact ', `<Button compact={${compact}} `)
                                : step.id === 'dynamic'
                                ? step.code.replace('#2563eb', swatchColor)
                                : demoCode(step.id, step.code, demoOptions[step.id] ?? initialDemoOptions)}
                            </FocusCode>
                          </>
                        )}
                      <div className={styles.guide}>
                        {step.advanced
                          ? (
                            <DocLink path={step.to}>
                              {step.link}
                            </DocLink>
                          )
                          : (
                            <Link to={step.to}>
                              {step.link}
                            </Link>
                          )}
                      </div>
                    </div>
                  </article>
                ))}
              </section>
            ))}
          </div>
        </div>
        <section className={styles.closing}>
          <h2>Give your next component a little Fluentic.</h2>
          <p>Try an example in the playground, then follow the setup guide when you’re ready.</p>
          <div className={styles.actions}>
            <Link className={styles.primary} to='/playground/'>Open the playground</Link>
            <Link to='/docs/quick-start'>Set up your app</Link>
            <Link to='/docs/debugging'>Debug your styles</Link>
            <DocLink path='/docs/reference/overview/'>Explore the API</DocLink>
          </div>
        </section>
      </main>
    </Layout>
  );
}
