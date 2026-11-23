import CodeBlock from '@theme/CodeBlock';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import DocLink from './DocLink';
import styles from './FeatureExplorer.module.css';

const features = [
  {
    name: 'Typed CSS-in-JS',
    icon: '{}',
    title: 'CSS properties, with autocomplete.',
    text: 'Write familiar CSS in TypeScript. Keep hover states with the style they belong to.',
    code: `import { style } from '@fluentic/style';

const button = style({ color: 'blue', padding: 12 })
  .hover({ color: 'purple' });

<button css={button}>Save changes</button>`,
    guide: 'Write your first style',
    path: '/docs/reference/style/',
  },
  {
    name: 'Tailwind utilities',
    icon: '≋',
    title: 'Familiar utilities. Composable styles.',
    text:
      'Use the Tailwind preset to configure a cx function, then combine utilities and interaction states through the same css prop.',
    code: `import { cx } from './styles'; // Tailwind preset setup

const button = cx('text-blue-500', 'px-4', 'py-2')
  .hover('text-blue-700');

<button css={button}>Save changes</button>`,
    guide: 'Configure the Tailwind preset',
    path: '/docs/presets/tailwind/class-name/',
  },
  {
    name: 'Design systems',
    icon: '◇',
    title: 'Shared values. Consistent components.',
    text: 'Keep colors and spacing in typed tokens. Reuse the same values across your app and component library.',
    code: `import { createTokens, style } from '@fluentic/style';

const tokens = createTokens({ accent: '#7c3aed', space: 16 });
const card = style({ color: tokens.accent, padding: tokens.space });`,
    guide: 'Use tokens and themes',
    path: '/docs/learn/create-themes/',
  },
  {
    name: 'Custom dialects',
    icon: '⌘',
    title: 'Your team’s shorthand, fully typed.',
    text:
      'Define a factory once to translate fields such as row and gapX into CSS. Its styles work with the same states, themes, and extraction.',
    code: `import { ui } from './styles'; // Your custom factory

const toolbar = ui({ row: true, center: true, gapX: 12 });

<header css={toolbar}>Search tools</header>`,
    guide: 'Define a custom style factory',
    path: '/docs/beyond-the-basics/custom-style-builders/',
  },
  {
    name: 'Component theming',
    icon: '◐',
    title: 'Change a component’s parts from the outside.',
    text: 'Components expose named style slots. Target just the part you need through their theme prop.',
    code: `import { style } from '@fluentic/style';
import { Card, cardStyle } from './Card';

<Card theme={style.scope([
  cardStyle.title({ color: 'purple' }),
])} />`,
    guide: 'Style component parts',
    path: '/docs/reference/style-scope/',
  },
  {
    name: 'Dynamic values',
    icon: '↔',
    title: 'Props and state stay live.',
    text:
      'Pass changing values directly into a style. With extraction, supported chains reuse prepared styles while CSS variables carry the current values.',
    code: `import { style } from '@fluentic/style';

function Swatch({ color }: { color: string }) {
  return <div css={style({ backgroundColor: color, padding: 24 })} />;
}`,
    guide: 'How dynamic styles are optimized',
    path: '/docs/design/compiler-hoisting/',
  },
  {
    name: 'CSS extraction',
    icon: '↗',
    title: 'Prepare your styles at build time.',
    text:
      'The bundler plugin extracts supported styles into CSS and prepares reusable runtime data. Dynamic values keep working.',
    code: `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { plugin as stylePlugin } from '@fluentic/style/plugin/vite';

export default defineConfig({
  plugins: [
    stylePlugin(),
    react({ jsxImportSource: '@fluentic/style/plugin/jsx' }),
  ],
});`,
    guide: 'Set up production extraction',
    path: '/docs/learn/build-for-production/',
  },
  {
    name: 'Source-mapped debugging',
    icon: '⌖',
    title: 'Find the source of a style.',
    text:
      'Development tracing connects generated styles to the code that defined them. Follow a declaration back to its source instead of guessing from a generated class name.',
    code: null,
    guide: 'Debug styles and source maps',
    path: '/docs/beyond-the-basics/devtools-and-sourcemaps/',
  },
];

export default function FeatureExplorer() {
  const [selected, setSelected] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const triggers = useRef<(HTMLButtonElement | null)[]>([]);
  const featureList = useRef<HTMLDivElement>(null);
  const id = useId();
  const feature = selected === null ? null : features[selected];
  const close = useCallback((restoreFocus = true) => {
    dialog.current?.close();
    if (restoreFocus && selected !== null) triggers.current[selected]?.focus({ preventScroll: true });
    setSelected(null);
  }, [selected]);
  useEffect(() => {
    if (selected === null || !dialog.current) return;
    const panel = dialog.current;
    const mobile = window.matchMedia('(max-width: 700px)');
    const position = () => {
      if (mobile.matches) {
        panel.style.removeProperty('left');
        panel.style.removeProperty('top');
        panel.style.removeProperty('max-height');
        return;
      }
      const anchor = triggers.current[selected]?.getBoundingClientRect();
      if (!anchor) return;
      const below = anchor.bottom + 8;
      const roomBelow = window.innerHeight - below - 12;
      const placeBelow = roomBelow >= 240 || roomBelow >= anchor.top - 20;
      const available = placeBelow ? roomBelow : anchor.top - 20;
      const height = Math.max(120, Math.min(panel.scrollHeight + 2, 480, available));
      panel.style.maxHeight = `${height}px`;
      panel.style.left = `${Math.max(12, Math.min(anchor.left, window.innerWidth - panel.offsetWidth - 12))}px`;
      panel.style.top = `${Math.max(12, placeBelow ? below : anchor.top - height - 8)}px`;
    };
    const present = () => {
      panel.close();
      if (mobile.matches) panel.showModal();
      else panel.show();
      position();
    };
    const outside = (event: PointerEvent) => {
      if (
        !mobile.matches && !panel.contains(event.target as Node) && !featureList.current?.contains(event.target as Node)
      ) close(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !mobile.matches) close();
    };
    present();
    mobile.addEventListener('change', present);
    window.addEventListener('resize', position);
    window.addEventListener('scroll', position, true);
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      panel.close();
      mobile.removeEventListener('change', present);
      window.removeEventListener('resize', position);
      window.removeEventListener('scroll', position, true);
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [selected, close]);
  return (
    <div className={styles.explorer}>
      <div ref={featureList} className={styles.features} aria-label='Explore styling features'>
        {features.map((item, index) => (
          <button
            key={item.name}
            ref={(element) => {
              triggers.current[index] = element;
            }}
            type='button'
            aria-expanded={selected === index}
            aria-haspopup='dialog'
            aria-controls={feature ? `${id}-detail` : undefined}
            onClick={() => setSelected(selected === index ? null : index)}
          >
            <span className={styles.icon} aria-hidden='true'>{item.icon}</span>
            <span className={styles.label}>{item.name}</span>
            <span className={styles.info} aria-hidden='true'>i</span>
          </button>
        ))}
      </div>
      {feature && (
        <dialog
          ref={dialog}
          id={`${id}-detail`}
          className={styles.detail}
          aria-labelledby={`${id}-title`}
          onCancel={(event) => {
            event.preventDefault();
            close();
          }}
          onClick={(event) => {
            if (event.target === event.currentTarget) close();
          }}
        >
          <div className={styles.content}>
            <div className={styles.heading}>
              <span>{feature.name}</span>
              <button type='button' aria-label='Close feature details' onClick={() => close()}>×</button>
            </div>
            <h2 id={`${id}-title`}>{feature.title}</h2>
            <p>{feature.text}</p>
            {feature.code
              ? <CodeBlock language='tsx'>{feature.code}</CodeBlock>
              : (
                <ol className={styles.debugSteps} aria-label='Debugging workflow'>
                  <li>
                    <span>01</span> Inspect the rendered element
                  </li>
                  <li>
                    <span>02</span> Find the generated CSS declaration
                  </li>
                  <li>
                    <span>03</span> Follow its source mapping
                  </li>
                </ol>
              )}
            <DocLink path={feature.path}>
              {feature.guide} <span aria-hidden='true'>→</span>
            </DocLink>
          </div>
        </dialog>
      )}
    </div>
  );
}
