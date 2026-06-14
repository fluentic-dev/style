import { style } from '@fluentic/style';
import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

function readAccent() {
  return new URLSearchParams(window.location.search).get('accent') ?? '#2563eb';
}

const accents = ['#2563eb', '#059669', '#c2410c', '#7c3aed'];
const cardTones = ['#2563eb', '#059669', '#c2410c', '#7c3aed', '#0891b2', '#be123c'];

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
          {items.map((item) => (
            <article
              key={item.id}
              css={style({
                display: 'grid',
                gap: 12,
                padding: 16,
                border: `1px solid ${item.tone}`,
                borderRadius: 14,
                backgroundColor: '#ffffff',
                boxShadow: '0 14px 40px rgba(15, 23, 42, 0.08)',
              }).hover({
                transform: 'translateY(-1px)',
              })}
            >
              <h2
                css={style({
                  margin: 0,
                  color: item.tone,
                  fontSize: 17,
                })}
              >
                {item.title}
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
                    width: `${item.score}%`,
                    backgroundColor: item.tone,
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
                Score {item.score}
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
