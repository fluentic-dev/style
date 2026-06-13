import Link from 'next/link';
import './home.css';

const basePath = process.env.NEXT_PUBLIC_DOCS_BASE ?? '';

const features = [
  ['slot', 'Typed override contracts', 'Expose stable component parts as TypeScript slots, so consumers style the API you publish.'],
  ['atom', 'Predictable atomic CSS', 'Reuse one class per declaration with deterministic order across runtime and extracted builds.'],
  ['chain', 'Fluent selector chains', 'Author hover, focus, media, container, and scoped selectors where the component styles live.'],
  ['css', 'Runtime first, CSS later', 'Iterate with runtime feedback, then extract static styles when the component library ships.'],
];

const reasons = [
  ['01', 'Public styling surface', 'Slots make override points explicit, typed, and versionable instead of asking users to target internals.'],
  ['02', 'Calm cascade behavior', 'Atomic rules stay small, while scopes define intentional override order without specificity games.'],
  ['03', 'Fast authoring loop', 'Use runtime styles while designing components, stories, tests, and local prototypes.'],
  ['04', 'Scoped composition', 'Carry themes and variants through a subtree without extra providers or generated class leaks.'],
];

export default function HomePage() {
  return (
    <main className="home-shell">
      <header className="home-nav">
        <div className="home-nav-inner">
          <Link className="home-brand" href="/">
            <img src={`${basePath}/logo.png`} alt="" width={48} height={48} />
            <span>Fluentic Style</span>
          </Link>
          <nav aria-label="Primary">
            <Link href="/docs/">Docs</Link>
            <Link className="home-nav-cta" href="/playground/">Playground</Link>
          </nav>
        </div>
      </header>

      <section className="home-hero">
        <div className="home-copy">
          <p className="home-kicker">Typed slots, scoped themes, atomic output.</p>
          <h1>Styles compose like components do.</h1>
          <p className="home-lede">
            Give developers named override points, selectors that stay close to the
            component code, themes that compose across subtrees, and atomic CSS that
            keeps delivery predictable as the system grows.
          </p>
          <div className="home-install" aria-label="Install command">
            <span>$</span>
            <code>npm install @fluentic/style</code>
          </div>
          <div className="home-actions">
            <Link className="home-primary" href="/docs/getting-started/quick-start/">
              Start with slots
            </Link>
            <Link className="home-secondary" href="/playground/">
              Open playground
            </Link>
          </div>
        </div>

        <div className="home-stage" aria-label="Fluentic Style code preview">
          <div className="home-stage-bar">
            <span className="home-window-dots" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span>button.styles.ts</span>
          </div>
          <pre className="home-code"><code>
            <span className="tok-key">import</span>{' { '}<span className="tok-id">style</span>{', '}<span className="tok-id">token</span>{' } '}<span className="tok-key">from</span>{' '}
            <span className="tok-str">'@fluentic/style'</span>;
            {'\n\n'}<span className="tok-key">const</span>{' '}<span className="tok-var">button</span>{' = {'}
            {'\n  '}root: <span className="tok-id">style</span>.<span className="tok-call">slot</span>({'{'}
            {'\n    '}display: <span className="tok-str">'inline-flex'</span>,
            {'\n    '}borderRadius: <span className="tok-num">8</span>,
            {'\n    '}padding: <span className="tok-str">'8px 12px'</span>,
            {'\n  }'}).<span className="tok-call">hover</span>({'{'} opacity: <span className="tok-num">0.88</span> {'}'}),
            {'\n  '}label: <span className="tok-id">style</span>.<span className="tok-call">slot</span>({'{'} fontWeight: <span className="tok-num">650</span> {'}'}),
            {'\n};\n\n'}<span className="tok-com">{'// Compose a scope for variants and themes'}</span>
            {'\n'}<span className="tok-key">const</span>{' '}<span className="tok-var">primary</span>{' = '}<span className="tok-id">style</span>.<span className="tok-call">scope</span>([
            {'\n  '}button.root({'{'} backgroundColor: token.accent {'}'}),
            {'\n  '}button.label({'{'} fontWeight: <span className="tok-num">760</span> {'}'}),
            {'\n'}]);
          </code></pre>
        </div>
      </section>

      <section className="home-features" aria-label="Highlights">
        {features.map(([tag, title, body]) => (
          <article key={title}>
            <span>{tag}</span>
            <h2>{title}</h2>
            <p>{body}</p>
          </article>
        ))}
      </section>

      <section className="home-reasons">
        <div className="home-section-head">
          <h2>Built for design-system styling</h2>
          <p>
            Component styling is a contract between authors and consumers. Fluentic Style
            keeps that contract visible while preserving a fast development loop.
          </p>
        </div>
        <div className="home-reason-grid">
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

      <footer className="home-footer">
        <div className="home-footer-inner">
          <Link className="home-footer-brand" href="/">
            <img src={`${basePath}/logo.png`} alt="" width={32} height={32} />
            <span>Fluentic Style</span>
          </Link>
          <p>Typed slots, scoped themes, atomic output.</p>
          <nav aria-label="Footer">
            <Link href="/docs/getting-started/quick-start/">Quick start</Link>
            <Link href="/playground/">Playground</Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
