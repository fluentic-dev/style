import { style } from '@fluentic/style';
import { render } from 'preact';

const page = style({
  minHeight: '100vh',
  margin: 0,
  padding: '48px 24px',
  backgroundColor: '#f4f0e8',
  color: '#18212f',
  fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
});

const card = style({
  backgroundColor: '#ffffff',
  border: '1px solid rgb(24 33 47 / 0.12)',
  borderRadius: 8,
  boxShadow: '0 18px 44px rgb(24 33 47 / 0.14)',
  display: 'grid',
  gap: 18,
  margin: '0 auto',
  maxWidth: 620,
  padding: 28,
}).hover({
  borderColor: 'rgb(15 118 110 / 0.5)',
});

const eyebrow = style({
  color: '#0f766e',
  fontSize: 13,
  fontWeight: 760,
  textTransform: 'uppercase',
});

const title = style({
  fontSize: 'clamp(34px, 7vw, 56px)',
  fontWeight: 820,
  lineHeight: 1,
  margin: 0,
});

const copy = style({
  color: '#536071',
  fontSize: 17,
  lineHeight: 1.7,
  margin: 0,
});

const button = style({
  backgroundColor: '#173b35',
  border: 0,
  borderRadius: 8,
  color: '#ffffff',
  cursor: 'pointer',
  font: 'inherit',
  fontWeight: 760,
  justifySelf: 'start',
  minHeight: 42,
  padding: '0 14px',
}).hover({
  backgroundColor: '#0f766e',
});

function App() {
  return (
    <main css={page}>
      <section css={card} class='preact-card'>
        <span css={eyebrow}>Preact adapter</span>
        <h1 css={title}>Fluentic css prop on Preact JSX.</h1>
        <p css={copy}>
          This example uses the Vite css-prop transform with a Preact adapter. Fluentic keeps the same style data model
          and lowers the result to Preact's normal class and style props.
        </p>
        <button css={button} type='button'>
          Looks native
        </button>
      </section>
    </main>
  );
}

render(<App />, document.getElementById('app')!);
