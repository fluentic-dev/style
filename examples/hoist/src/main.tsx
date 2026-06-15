import { combineStyle, createToken, style } from '@fluentic/style';
import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

function readAccent() {
  return new URLSearchParams(window.location.search).get('accent') ?? '#2563eb';
}

const accents = ['#2563eb', '#059669', '#c2410c', '#7c3aed'];
const cardTones = ['#2563eb', '#059669', '#c2410c', '#7c3aed', '#0891b2', '#be123c'];

const surfaceToken = createToken('#ffffff');
const accentToken = createToken('#2563eb');

const cardStyles = {
  root: style.slot({
    display: 'grid',
    gap: 12,
    padding: 16,
    border: '1px solid',
    borderColor: accentToken,
    borderRadius: 14,
    backgroundColor: surfaceToken,
    boxShadow: '0 14px 40px rgba(15, 23, 42, 0.08)',
  }).hover({
    transform: 'translateY(-1px)',
  }),
  title: style.slot({
    margin: 0,
    color: accentToken,
    fontSize: 17,
  }),
};

const staticCardScope = style.scope([
  surfaceToken('#ffffff'),
  accentToken('#2563eb'),
  cardStyles.root({
    transition: 'transform 160ms ease, border-color 160ms ease',
  }),
]);

function createItems(seed = 0) {
  return Array.from({ length: 24 }, (_, index) => {
    const value = (index * 17 + seed * 31) % 100;

    return {
      id: index + 1,
      title: `Inline Card ${index + 1}`,
      score: Math.max(value, 8),
      tone: cardTones[(index + seed) % cardTones.length],
    };
  });
}

function InlineCard(props: ReturnType<typeof createItems>[number]) {
  const cardScope = style.scope([
    accentToken('#2563eb'),
    cardStyles.root({
      borderColor: props.tone,
    }),
    cardStyles.title({
      color: props.tone,
    }),
  ]);
  const css = combineStyle(
    cardStyles,
    staticCardScope(cardStyles.root),
    cardScope(cardStyles.root),
  );

  return (
    <article css={css.root}>
      <h2 css={css.title}>
        {props.title}
      </h2>
      <div
        css={style({
          height: 8,
          overflow: 'hidden',
          borderRadius: 999,
          backgroundColor: '#e2e8f0',
        })}
      >
        <span
          css={style({
            display: 'block',
            height: '100%',
            width: `${props.score}%`,
            backgroundColor: props.tone,
          })}
        />
      </div>
      <p
        css={style({
          margin: 0,
          color: '#475569',
          fontSize: 13,
        })}
      >
        Score {props.score}
      </p>
    </article>
  );
}

function App() {
  const [accent, setAccent] = useState(readAccent);
  const [items, setItems] = useState(() => createItems());

  useEffect(() => {
    const handlePopState = () => setAccent(readAccent());

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const changeAccent = () => {
    const nextIndex = Math.max(accents.indexOf(accent), 0) + 1;
    const nextAccent = accents[nextIndex % accents.length];
    const url = new URL(window.location.href);

    url.searchParams.set('accent', nextAccent);
    history.pushState(null, '', url);
    setAccent(readAccent());
    setItems(createItems(nextIndex));
  };

  return (
    <main
      css={style({
        minHeight: '100vh',
        boxSizing: 'border-box',
        padding: 32,
        backgroundColor: '#f8fafc',
        color: '#0f172a',
        fontFamily: 'system-ui, sans-serif',
      })}
    >
      <section
        css={style({
          maxWidth: 1080,
          margin: '0 auto',
          display: 'grid',
          gap: 18,
        })}
      >
        <header
          css={style({
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 16,
            padding: 18,
            border: `1px solid ${accent}`,
            borderRadius: 16,
            backgroundColor: '#ffffff',
            boxShadow: '0 20px 70px rgba(15, 23, 42, 0.10)',
          })}
        >
          <div>
            <p
              css={style({
                margin: 0,
                color: accent,
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              })}
            >
              Hoist example
            </p>
            <h1
              css={style({
                margin: '4px 0 0',
                fontSize: 34,
                lineHeight: 1,
              })}
            >
              Inline dynamic styles
            </h1>
          </div>
          <button
            type='button'
            onClick={changeAccent}
            css={style({
              color: '#ffffff',
              backgroundColor: accent,
              border: 0,
              borderRadius: 999,
              padding: '10px 14px',
              fontSize: 13,
              fontWeight: 800,
              cursor: 'pointer',
              textDecoration: 'none',
            }).hover({
              opacity: 0.86,
            })}
          >
            Randomize
          </button>
        </header>

        <div
          css={style({
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 14,
          })}
        >
          {items.map((item) => <InlineCard key={item.id} {...item} />)}
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
