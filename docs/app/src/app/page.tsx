import Link from 'next/link';
import './home.css';

const basePath = process.env.NEXT_PUBLIC_DOCS_BASE ?? '';

const previewCode = `import {
  style, type StyleProp, type StyleTheme,
  combineStyle, bindScope,
} from '@fluentic/style';

const card = {
  container: style({
    borderRadius: 16,
    padding: 20,
  }),
  title: style({
    fontSize: 20,
    fontWeight: 700,
  }),
  body: style({
    lineHeight: 1.6,
  }),
};

const productCard = style.scope([
  card.container({
    backgroundColor: '#111827',
    color: 'white',
  }),
  card.title({
    letterSpacing: 0.2,
  }),
]);

function Card(props: {
  title: string;
  css?: StyleProp;
  theme?: StyleTheme;
  children: React.ReactNode;
}) {
  const css = combineStyle(
    card,
    bindScope(card.container, props.theme),
  );

  return (
    <article css={[css.container, props.css]}>
      <h2 css={css.title}>{props.title}</h2>
      <div css={css.body}>{props.children}</div>
    </article>
  );
}

<Card theme={productCard} title="Revenue">
  ...
</Card>`;

const previewCodeHtml = highlightPreviewCode(previewCode);
const ownershipOutsideCode = `const productCard = style.scope([
  card.container({
    backgroundColor: '#111827',
    color: 'white',
  }),
]);

const dashboardCard = style({
  marginBlock: 24,
});

<Card
  theme={productCard}
  css={dashboardCard}
  title="Revenue"
/>`;
const ownershipInsideCode = `type CardProps = {
  theme?: StyleTheme;
  css?: StyleProp;
};

function Card(props: CardProps) {
  const css = combineStyle(
    card,
    bindScope(card.container, props.theme),
  );

  return (
    <article css={[css.container, props.css]}>
      ...
    </article>
  );
}`;

const ownershipOutsideCodeHtml = highlightPreviewCode(ownershipOutsideCode);
const ownershipInsideCodeHtml = highlightPreviewCode(ownershipInsideCode);

function highlightPreviewCode(code: string) {
  const tokenPattern =
    /(\/\/.*|\/\*[\s\S]*?\*\/|'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`|\b(?:import|from|const|export|function|return|type|true|false)\b|\b\d+(?:\.\d+)?\b|\b[A-Za-z_$][\w$]*(?=\s*\()|\b[A-Za-z_$][\w$]*\b)/g;

  let html = '';
  let lastIndex = 0;

  code.replace(tokenPattern, (token, _match, offset: number, source: string) => {
    html += escapeHtml(source.slice(lastIndex, offset));

    const className = getTokenClassName(token, offset, source);
    html += className ? `<span class="${className}">${escapeHtml(token)}</span>` : escapeHtml(token);
    lastIndex = offset + token.length;

    return token;
  });

  html += escapeHtml(code.slice(lastIndex));

  return html;
}

function getTokenClassName(token: string, offset: number, source: string) {
  if (token.startsWith('//') || token.startsWith('/*')) return 'tok-com';
  if (token.startsWith("'") || token.startsWith('"') || token.startsWith('`')) return 'tok-str';
  if (/^\d/.test(token)) return 'tok-num';
  if (/^(import|from|const|export|function|return|type|true|false)$/.test(token)) return 'tok-key';
  if (/^[A-Za-z_$][\w$]*$/.test(token)) {
    const jsxClassName = getJsxTokenClassName(token, offset, source);
    if (jsxClassName) return jsxClassName;

    const next = source.slice(offset + token.length).trimStart()[0];
    return next === '(' ? 'tok-call' : 'tok-id';
  }
  return null;
}

function getJsxTokenClassName(token: string, offset: number, source: string) {
  const lineStart = source.lastIndexOf('\n', offset - 1) + 1;
  const beforeOnLine = source.slice(lineStart, offset);
  const lastOpen = beforeOnLine.lastIndexOf('<');
  const lastClose = beforeOnLine.lastIndexOf('>');

  if (lastOpen <= lastClose) return null;

  const afterOpen = beforeOnLine.slice(lastOpen + 1).trimStart();
  const tagPrefix = afterOpen.startsWith('/') ? afterOpen.slice(1).trimStart() : afterOpen;
  const isTagName = tagPrefix === '';
  const next = source.slice(offset + token.length).trimStart()[0];

  if (isTagName) return 'tok-jsx-tag';
  if (next === '=') return 'tok-jsx-attr';
  return null;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

const situations = [
  [
    '01',
    'Another product wants this component.',
    'A Button built in one app is reused by another product with different branding.',
  ],
  [
    '02',
    "A theme shouldn't know the DOM.",
    "A product theme should not need to know the component's markup to change how it looks.",
  ],
  [
    '03',
    'The safe change is unclear',
    'A small tweak feels risky, so the team adds one more override instead of changing the original.',
  ],
  [
    '04',
    'The browser shows the result',
    'DevTools shows the final CSS rule, but the team still needs to know which source decision created it.',
  ],
];

const modelSteps = [
  [
    'Style',
    'Local styles',
    'Keep style data close to the element or component that owns it.',
    'style({ padding: 20 })',
  ],
  [
    'Slot',
    'Styleable parts',
    'Reusable components name the parts callers may style.',
    'title: style({ ... })',
  ],
  [
    'Scope',
    'Outside styling',
    'External code describes changes without depending on private markup.',
    'style.scope([title({ ... })])',
  ],
  [
    'Resolve',
    'Component decides',
    'The component brings those styles together where it owns the DOM.',
    'bindScope(container, theme)',
  ],
];

const readingCards = [
  [
    'Why Fluentic',
    'Start with the idea: React solved UI composition. What would style composition look like?',
    '/docs/why-fluentic/',
  ],
  [
    'Learn',
    'Build from local styles to reusable components, themes, overrides, and debugging.',
    '/docs/learn/start-here/',
  ],
  [
    'Beyond the Basics',
    'See what the same model unlocks for debugging, custom selectors, extraction, and runtime behavior.',
    '/docs/beyond-the-basics/tracing-styles-in-real-apps/',
  ],
  [
    'Design',
    'Read why the model has this shape, from authoring to runtime and extraction.',
    '/docs/design/start-from-the-problem/',
  ],
];

const productionCards = [
  [
    'Typed style APIs',
    'Write styles, slots, scopes, and tokens in TypeScript with names your editor can follow.',
  ],
  [
    'Extracted CSS',
    'Static styles compile to ordered atomic CSS, so the browser gets plain stylesheets.',
  ],
  [
    'Runtime values',
    'Keep values that depend on props, state, or data without switching to a second styling pattern.',
  ],
  [
    'Debuggable output',
    'Follow a generated class back to the slot, scope, or source value that created it.',
  ],
  [
    'Integrations',
    'Use it with Next.js, Vite, Webpack, Rspack, Babel, or your own compiler pipeline.',
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
          <p className='home-kicker'>Component style composition for React</p>
          <h1>What if styling composed like React components do?</h1>
          <p className='home-lede'>
            Build your own styling language on top of a stable React styling model. Fluentic gives teams composable
            style data, component-owned styling boundaries, and userland chains and transforms that still work with
            runtime resolution and extraction.
          </p>
          <p className='home-tagline'>
            Most developers no longer struggle writing styles. The difficult part is confidently changing them months
            later.
          </p>
          <div className='home-actions'>
            <Link className='home-primary' href='/docs/fluentic-approach/from-elements-to-components/'>
              See the idea
            </Link>
            <Link className='home-secondary' href='https://fluenticstack.com/style/docs/learn/start-here/'>
              Build your first component
            </Link>
          </div>
        </div>

        <div className='home-stage' aria-label='Component style composition code preview'>
          <div className='home-stage-bar'>
            <span className='home-window-dots' aria-hidden='true'>
              <i />
              <i />
              <i />
            </span>
            <span>card-style.tsx</span>
          </div>
          <pre className='home-code'><code dangerouslySetInnerHTML={{ __html: previewCodeHtml }} /></pre>
        </div>
      </section>

      <section className='home-composition' aria-labelledby='composition-title'>
        <div className='home-section-head'>
          <h2 id='composition-title'>Change is easier when ownership is clear.</h2>
          <p>
            Component code usually gives change a place to live: markup belongs to a component, props describe what
            callers can change, and context moves values through a tree. Styling needs the same clarity once themes,
            overrides, and shared components enter the picture.
          </p>
        </div>
        <div className='home-compare' aria-label='Composition comparison'>
          <article>
            <span>React</span>
            <ul>
              <li>Components</li>
              <li>Props</li>
              <li>Context</li>
              <li>Hooks</li>
            </ul>
            <p>Components keep implementation details inside.</p>
          </article>
          <article>
            <span>Styling</span>
            <ul>
              <li>Reuse</li>
              <li>Theming</li>
              <li>Overrides</li>
              <li>Debugging</li>
            </ul>
            <p>Styles often need to change across component boundaries.</p>
          </article>
        </div>
      </section>

      <section className='home-features' aria-label='Familiar development situations'>
        {situations.map(([tag, title, body]) => (
          <article key={title}>
            <span>{tag}</span>
            <h2>{title}</h2>
            <p>{body}</p>
          </article>
        ))}
      </section>

      <section className='home-ownership'>
        <div className='home-section-head'>
          <h2>Components decide where styling attaches.</h2>
          <p>
            A theme should not need to know how a component is built. It only describes what should change. The
            component decides where those changes attach.
          </p>
        </div>
        <div className='home-ownership-grid'>
          <article>
            <span>Caller</span>
            <p>The caller passes styling through a public prop.</p>
            <pre><code dangerouslySetInnerHTML={{ __html: ownershipOutsideCodeHtml }} /></pre>
          </article>
          <article>
            <span>Component</span>
            <p>The component resolves theme data and attaches the result where it owns the DOM.</p>
            <pre><code dangerouslySetInnerHTML={{ __html: ownershipInsideCodeHtml }} /></pre>
          </article>
        </div>
      </section>

      <section className='home-reasons'>
        <div className='home-section-head'>
          <h2>One styling path from component code to CSS.</h2>
          <p>
            Local styles, public slots, outside themes, and final CSS all stay connected through the same component
            styling flow.
          </p>
        </div>
        <div className='home-style-flow' aria-label='Styling flow'>
          <span>Style data</span>
          <i aria-hidden='true' />
          <span>Public slots</span>
          <i aria-hidden='true' />
          <span>Scoped changes</span>
          <i aria-hidden='true' />
          <span>Component resolves</span>
          <i aria-hidden='true' />
          <code>.padding-a8f3c2d {'{'} padding: 20px {'}'}</code>
        </div>
        <div className='home-reason-grid'>
          {modelSteps.map(([tag, title, body, code]) => (
            <article key={title}>
              <div>
                <span>{tag}</span>
                <h3>{title}</h3>
              </div>
              <p>{body}</p>
              <code dangerouslySetInnerHTML={{ __html: highlightPreviewCode(code) }} />
            </article>
          ))}
        </div>
      </section>

      <section className='home-production' aria-labelledby='production-title'>
        <div className='home-section-head'>
          <h2 id='production-title'>From TypeScript to production CSS.</h2>
          <p>
            Write component styles in TypeScript, extract the static parts to CSS, and keep runtime values working when
            they depend on props or state.
          </p>
        </div>
        <div className='home-production-grid'>
          {productionCards.map(([title, body]) => (
            <article key={title}>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className='home-trace'>
        <div className='home-section-head'>
          <div>
            <h2>Debug generated CSS from the source.</h2>
            <p>
              Inspect a generated class and see where it came from: the TypeScript file, the style call, and the line
              that produced the rule.
            </p>
          </div>
          <Link className='home-trace-link' href='/playground/'>
            Open playground
          </Link>
        </div>
        <div className='home-trace-demo' aria-label='Mini trace playground'>
          <div className='home-trace-map'>
            <article>
              <div className='home-trace-demo-head'>
                <span>Property trace</span>
                <code>card.styles.ts:24:5</code>
              </div>
              <div className='home-trace-path-line'>
                <span>.background-color-f7gmmz0</span>
                <i aria-hidden='true' />
                <span>backgroundColor</span>
              </div>
              <div className='home-trace-code'>
                <span>
                  container: <span className='tok-call'>style</span>({'{'}
                </span>
                <span className='is-target'>
                  <span className='tok-id'>backgroundColor</span>: <span className='tok-str'>'#ffffff'</span>,
                </span>
                <span>{'}'});</span>
              </div>
            </article>
            <article>
              <div className='home-trace-demo-head'>
                <span>Element marker</span>
                <code>Card.tsx:44:5</code>
              </div>
              <div className='home-trace-path-line'>
                <span>@container-a8f3c2d</span>
                <i aria-hidden='true' />
                <span>{'<article css>'}</span>
              </div>
              <div className='home-trace-code'>
                <span>
                  <span className='tok-key'>return</span> (
                </span>
                <span className='is-target'>
                  &lt;<span className='tok-jsx-tag'>article</span> <span className='tok-jsx-attr'>css</span>={'{'}
                  [css.container, props.css]
                  {'}'} /&gt;
                </span>
                <span>);</span>
              </div>
            </article>
            <article>
              <div className='home-trace-demo-head'>
                <span>Spread value trace</span>
                <code>card-base.ts:7:3</code>
              </div>
              <div className='home-trace-path-line'>
                <span>.padding-a8f3c2d</span>
                <i aria-hidden='true' />
                <span>base.padding</span>
              </div>
              <div className='home-trace-code'>
                <span className='home-trace-code-label'>card-base.ts</span>
                <span>
                  <span className='tok-key'>const</span> base = {'{'}
                </span>
                <span className='is-target'>
                  <span className='tok-id'>padding</span>: <span className='tok-num'>20</span>,
                </span>
                <span>{'}'};</span>
                <span className='home-trace-code-label'>card.styles.ts</span>
                <span>
                  container: <span className='tok-call'>style</span>({'{'}
                </span>
                <span>...base,</span>
                <span>{'}'});</span>
              </div>
            </article>
            <article>
              <div className='home-trace-demo-head'>
                <span>Spread usage trace</span>
                <code>card.styles.ts:24:18</code>
              </div>
              <div className='home-trace-path-line'>
                <span>.padding-a8f3c2d</span>
                <i aria-hidden='true' />
                <span>...base</span>
              </div>
              <div className='home-trace-code'>
                <span className='home-trace-code-label'>card-base.ts</span>
                <span>
                  <span className='tok-key'>const</span> base = {'{'}
                </span>
                <span>
                  <span className='tok-id'>padding</span>: <span className='tok-num'>20</span>,
                </span>
                <span>{'}'};</span>
                <span className='home-trace-code-label'>card.styles.ts</span>
                <span>
                  container: <span className='tok-call'>style</span>({'{'}
                </span>
                <span className='is-target'>...base,</span>
                <span>{'}'});</span>
              </div>
            </article>
          </div>
        </div>
        <div className='home-trace-flow' aria-label='Debug trace'>
          <span>Generated rule</span>
          <i aria-hidden='true' />
          <span>Style call</span>
          <i aria-hidden='true' />
          <span>Source file</span>
          <i aria-hidden='true' />
          <span>Line number</span>
        </div>
      </section>

      <section className='home-growing'>
        <div className='home-section-head'>
          <div>
            <h2>When styling systems grow.</h2>
            <p>
              Growing systems rarely struggle writing another style. They struggle understanding the styles they already
              have. Styleable parts, composition, traceability, and predictable theming make later changes easier to
              review and maintain.
            </p>
          </div>
          <ul aria-label='Style system growth needs'>
            <li>Styleable parts</li>
            <li>Traceability</li>
            <li>Reviewable output</li>
          </ul>
        </div>
      </section>

      <section className='home-reading' aria-labelledby='reading-title'>
        <div className='home-section-head'>
          <h2 id='reading-title'>Continue reading.</h2>
          <p>
            The homepage only introduces the question. The docs walk through the model, how to use it, and why it has
            this shape.
          </p>
        </div>
        <div className='home-reading-grid'>
          {readingCards.map(([title, body, href]) => (
            <Link href={href} key={title}>
              <h3>{title}</h3>
              <p>{body}</p>
            </Link>
          ))}
        </div>
      </section>

      <footer className='home-footer'>
        <div className='home-footer-inner'>
          <Link className='home-footer-brand' href='/'>
            <img src={`${basePath}/logo.png`} alt='' width={32} height={32} />
            <span>Fluentic Style</span>
          </Link>
          <nav aria-label='Footer'>
            <Link href='/docs/reference/style/'>Reference</Link>
            <Link href='/playground/'>Playground</Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
