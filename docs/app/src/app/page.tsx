import Link from 'next/link';
import './home.css';

const basePath = process.env.NEXT_PUBLIC_DOCS_BASE ?? '';

const previewCode = `import {
  createTokens,
  style,
} from '@fluentic/style';

export const tokens = createTokens({
  color: {
    surface: '#ffffff',
    text: '#111827',
    accent: '#2563eb',
    accentHover: '#1d4ed8',
    accentText: '#ffffff',
  },
  radius: {
    control: '10px',
  },
});

export const button = {
  root: style.slot({
    alignItems: 'center',
    backgroundColor: 'transparent',
    border: '1px solid transparent',
    borderRadius: tokens.radius.control,
    color: tokens.color.text,
    cursor: 'pointer',
    display: 'inline-flex',
    fontWeight: 700,
    gap: '8px',
    minHeight: '40px',
    padding: '0 14px',
  })
    .hover({
      transform: 'translateY(-1px)',
    })
    .media('(max-width: 640px)', {
      width: '100%',
    }),
  icon: style.slot({
    height: 16,
    width: 16,
  }),
};

export const primary = style.scope([
  button.root({
    backgroundColor: tokens.color.accent,
    color: tokens.color.accentText,
  }),
  button.root.hover({
    backgroundColor: tokens.color.accentHover,
  }),
  button.icon({
    opacity: 0.9,
  }),
]);`;

const previewCodeHtml = highlightPreviewCode(previewCode);

function highlightPreviewCode(code: string) {
  const tokenPattern =
    /(\/\/.*|\/\*[\s\S]*?\*\/|'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`|\b(?:import|from|const|export|function|return|type|true|false)\b|\b\d+(?:\.\d+)?\b|\b[A-Za-z_$][\w$]*(?=\s*\()|\b[A-Za-z_$][\w$]*\b)/g;

  return code.replace(tokenPattern, (token, _match, offset: number, source: string) => {
    const className = getTokenClassName(token, offset, source);
    return className ? `<span class="${className}">${escapeHtml(token)}</span>` : escapeHtml(token);
  });
}

function getTokenClassName(token: string, offset: number, source: string) {
  if (token.startsWith('//') || token.startsWith('/*')) return 'tok-com';
  if (token.startsWith("'") || token.startsWith('"') || token.startsWith('`')) return 'tok-str';
  if (/^\d/.test(token)) return 'tok-num';
  if (/^(import|from|const|export|function|return|type|true|false)$/.test(token)) return 'tok-key';
  if (/^[A-Za-z_$][\w$]*$/.test(token)) {
    const next = source.slice(offset + token.length).trimStart()[0];
    return next === '(' ? 'tok-call' : 'tok-id';
  }
  return null;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

const features = [
  [
    'ts',
    'Write styles in TypeScript',
    'Use objects, constants, functions, and imports. Add tokens only when a value needs to be shared or overridden.',
  ],
  [
    'slot',
    'Name the parts callers can style',
    'Define slots like container, icon, or label. Callers override those slots instead of reaching for generated class names.',
  ],
  [
    'theme',
    'Apply variants with scopes',
    'Set a theme or variant once around a section, and every nested component can pick up the right tokens and overrides.',
  ],
  [
    'css',
    'Atomic CSS, dynamic values',
    'Extract static styles to ordered atomic rules, and keep render-time values working without changing APIs.',
  ],
];

const reasons = [
  [
    '01',
    'Start with plain TypeScript',
    'Use constants, token objects, or scoped themes in the same file. Add structure only where reuse needs it.',
  ],
  [
    '02',
    'Keep overrides explicit',
    'Slots name the parts consumers can style. Selectors, media rules, and variants stay attached to those slots.',
  ],
  [
    '03',
    'Handle render-time values',
    'Pass values that only exist during render without moving the whole component to handwritten CSS.',
  ],
  [
    '04',
    'Keep emitted CSS boring',
    'Static rules extract to ordered atomic CSS. Runtime rules use the same ordering model, so composition stays predictable.',
  ],
];

export default function HomePage() {
  return (
    <main className='home-shell'>
      <header className='home-nav'>
        <div className='home-nav-inner'>
          <Link className='home-brand' href='/'>
            <img src={`${basePath}/logo.png`} alt='' width={48} height={48} />
            <span>Fluentic Style</span>
          </Link>
          <nav aria-label='Primary'>
            <Link href='/docs/'>Docs</Link>
            <Link className='home-nav-cta' href='/playground/'>Playground</Link>
            <a
              className='home-nav-github'
              href='https://github.com/fluentic-dev/style'
              rel='noreferrer'
              target='_blank'
            >
              <svg aria-hidden='true' viewBox='0 0 24 24'>
                <path
                  d='M12 2C6.48 2 2 6.58 2 12.22c0 4.51 2.87 8.34 6.84 9.69.5.1.68-.22.68-.49 0-.24-.01-1.04-.01-1.89-2.78.62-3.37-1.22-3.37-1.22-.45-1.18-1.11-1.49-1.11-1.49-.91-.64.07-.63.07-.63 1 .07 1.53 1.05 1.53 1.05.9 1.56 2.35 1.11 2.92.85.09-.66.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.05 0-1.12.39-2.03 1.03-2.74-.1-.26-.45-1.3.1-2.71 0 0 .84-.27 2.75 1.05A9.33 9.33 0 0 1 12 6.99c.85 0 1.7.12 2.5.34 1.91-1.32 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.71 1.03 1.62 1.03 2.74 0 3.92-2.34 4.78-4.57 5.04.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .27.18.59.69.49A10.12 10.12 0 0 0 22 12.22C22 6.58 17.52 2 12 2Z'
                  fill='currentColor'
                />
              </svg>
              <span>GitHub</span>
            </a>
          </nav>
        </div>
      </header>

      <section className='home-hero'>
        <div className='home-copy'>
          <p className='home-kicker'>Typesafe styles, scoped theme, atomic output.</p>
          <h1>Styles compose like components do.</h1>
          <p className='home-lede'>
            Give developers named override points, selectors that stay close to component code, themes that compose
            across subtrees, and atomic CSS that keeps delivery predictable as the system grows.
          </p>
          <p className='home-tagline'>
            Write normal TypeScript. Ship styles that scale.
          </p>
          <div className='home-install' aria-label='Install command'>
            <span>$</span>
            <code>npm install @fluentic/style</code>
          </div>
          <div className='home-actions'>
            <Link className='home-primary' href='/docs/getting-started/quick-start/'>
              Read quick start
            </Link>
            <Link className='home-secondary' href='/playground/'>
              Try playground
            </Link>
          </div>
        </div>

        <div className='home-stage' aria-label='Fluentic Style code preview'>
          <div className='home-stage-bar'>
            <span className='home-window-dots' aria-hidden='true'>
              <i />
              <i />
              <i />
            </span>
            <span>button.styles.ts</span>
          </div>
          <pre className='home-code'><code dangerouslySetInnerHTML={{ __html: previewCodeHtml }} /></pre>
        </div>
      </section>

      <section className='home-features' aria-label='Highlights'>
        {features.map(([tag, title, body]) => (
          <article key={title}>
            <span>{tag}</span>
            <h2>{title}</h2>
            <p>{body}</p>
          </article>
        ))}
      </section>

      <section className='home-reasons'>
        <div className='home-section-head'>
          <h2>Keep component styles readable</h2>
          <p>
            Put the style definitions next to the component, expose the parts callers may override, and let the compiler
            extract the CSS it can prove is static.
          </p>
        </div>
        <div className='home-reason-grid'>
          {reasons.map(([tag, title, body]) => (
            <article key={title}>
              <span>{tag}</span>
              <div>
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <footer className='home-footer'>
        <div className='home-footer-inner'>
          <Link className='home-footer-brand' href='/'>
            <img src={`${basePath}/logo.png`} alt='' width={32} height={32} />
            <span>Fluentic Style</span>
          </Link>
          <p>Typesafe styles, scoped theme, atomic output.</p>
          <nav aria-label='Footer'>
            <Link href='/docs/getting-started/quick-start/'>Quick start</Link>
            <Link href='/playground/'>Playground</Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
