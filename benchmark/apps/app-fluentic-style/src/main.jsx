import { base, menu, mountSingleBench, palette, rows } from '@benchmark/main';
import { style } from '@fluentic/style';
import { fluenticClassNames as c } from './fluenticStyles';

const params = new URLSearchParams(window.location.search);
const useChain = params.get('fluenticMode') !== 'simple';
const useInlineStyle = params.get('inlineStyle') === '1';
const useStressStyle = params.get('stressStyle') === '1';
const panelSlotClass = useChain ? c.panelSlotChain : c.panelSlotSimple;

function getTone(row, tick) {
  const tones = [palette.accent, '#a78bfa', '#34d399', '#fb7185', '#f59e0b', '#60a5fa'];

  return tones[(row.id + tick) % tones.length];
}

function AppLayout({ view, tick, liteStyle }) {
  if (useStressStyle) {
    return <StressAppLayout view={view} tick={tick} liteStyle={liteStyle} />;
  }

  if (useInlineStyle) {
    return <InlineAppLayout view={view} tick={tick} liteStyle={liteStyle} />;
  }

  const activeRow = tick % rows.length;
  if (view === 'details') {
    return (
      <div className={c.page}>
        <header className={c.header}>
          <strong>Fluentic Style Admin</strong>
          <select className={c.select}>
            <option>Last 7 days</option>
          </select>
        </header>
        <section className={c.detailsHero}>
          <h1 className={c.panelTitle}>Customer Detail</h1>
          <p className={c.panelDesc}>Real route view mount simulation.</p>
        </section>
      </div>
    );
  }
  return (
    <div className={c.page}>
      <header className={c.header}>
        <strong>Fluentic Style Admin</strong>
        <select className={c.select}>
          <option>Last 7 days</option>
        </select>
      </header>
      <div className={c.shell}>
        <section className={c.card}>
          {menu.map((m) => <button key={m} className={c.menuBtn}>{m}</button>)}
        </section>
        <section className={panelSlotClass}>
          <h1 className={c.panelTitle}>Admin Dashboard</h1>
          <p className={c.panelDesc}>Real world mount + update benchmark.</p>
          <table className={c.table}>
            <thead>
              <tr>
                <th className={c.thtd}>Name</th>
                <th className={c.thtd}>Plan</th>
                <th className={c.thtd}>Usage</th>
                <th className={c.thtd}>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} className={liteStyle && i === activeRow ? c.rowActive : ''}>
                  <td className={c.thtd}>{r.name}</td>
                  <td className={c.thtd}>{r.plan}</td>
                  <td className={c.thtd}>{r.usage}%</td>
                  <td className={c.thtd}>
                    <span className={c.badge}>{r.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}

function StressAppLayout({ view, tick, liteStyle }) {
  const accent = tick % 2 === 0 ? palette.accent : '#a78bfa';
  const activeRow = tick % rows.length;

  if (view === 'details') {
    return (
      <div css={style(base.page)}>
        <header
          css={style({
            ...base.header,
            borderColor: accent,
            boxShadow: `0 0 0 1px ${accent}`,
          })}
        >
          <strong>Fluentic Style Admin</strong>
          <select css={style(base.select)}>
            <option>Last 7 days</option>
          </select>
        </header>
        <section
          css={style({
            ...base.detailsHero,
            borderColor: accent,
          })}
        >
          <h1 css={style({ ...base.title, color: accent }).media('(max-width: 900px)', { fontSize: 18 })}>
            Customer Detail
          </h1>
          <p css={style(base.muted).hover({ color: accent })}>Real route view mount simulation.</p>
        </section>
      </div>
    );
  }

  return (
    <div css={style(base.page)}>
      <header
        css={style({
          ...base.header,
          borderColor: accent,
          boxShadow: `0 0 0 1px ${accent}`,
        })}
      >
        <strong>Fluentic Style Admin</strong>
        <select css={style(base.select)}>
          <option>Last 7 days</option>
        </select>
      </header>
      <div css={style(base.shell)}>
        <section css={style(base.card)}>
          {menu.map((m, index) => (
            <button
              key={m}
              css={style({
                ...base.menuBtn,
                borderColor: index === tick % menu.length ? accent : palette.border,
                transform: index === tick % menu.length ? 'translateX(2px)' : 'none',
              }).hover({ borderColor: accent })}
            >
              {m}
            </button>
          ))}
        </section>
        <section
          css={style(base.card)
            .media('(max-width: 900px)', { padding: 10 + (tick % 4) })
            .media('(min-width: 700px)', { background: tick % 2 === 0 ? palette.panel : '#0b1220' })}
        >
          <h1 css={style({ ...base.title, color: accent }).media('(max-width: 900px)', { fontSize: 18 })}>
            Admin Dashboard
          </h1>
          <p css={style(base.muted).hover({ color: accent })}>Real world mount + update benchmark.</p>
          <table css={style(base.table)}>
            <thead>
              <tr>
                <th css={style(base.thtd)}>Name</th>
                <th css={style(base.thtd)}>Plan</th>
                <th css={style(base.thtd)}>Usage</th>
                <th css={style(base.thtd)}>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const tone = getTone(row, tick);
                const active = liteStyle && index === activeRow;
                const usage = (row.usage + tick + index) % 100;

                return (
                  <tr
                    key={row.id}
                    css={style({
                      background: active ? `color-mix(in srgb, ${tone} 16%, transparent)` : 'transparent',
                      color: index % 3 === tick % 3 ? '#f8fafc' : palette.text,
                    })}
                  >
                    <td css={style({ ...base.thtd, borderColor: tone })}>{row.name}</td>
                    <td css={style(base.thtd)}>{row.plan}</td>
                    <td css={style({ ...base.thtd, color: tone })}>{usage}%</td>
                    <td css={style(base.thtd)}>
                      <span
                        css={style({
                          ...base.badge,
                          borderColor: tone,
                          color: tone,
                          background: active ? `color-mix(in srgb, ${tone} 18%, transparent)` : 'transparent',
                        })}
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}

function InlineAppLayout({ view, tick, liteStyle }) {
  const activeRow = tick % rows.length;
  const accent = tick % 2 === 0 ? palette.accent : '#a78bfa';
  const surface = tick % 3 === 0 ? '#0d1727' : '#111827';
  const compactPadding = 10 + (tick % 3);
  const pageCss = style(base.page);
  const headerCss = style({
    ...base.header,
    borderBottom: `1px solid ${accent}`,
  });
  const selectCss = style(base.select);
  const panelTitleCss = style({
    ...base.title,
    color: accent,
  }).media('(max-width: 900px)', { fontSize: 18 });
  const panelDescCss = style(base.muted).hover({ color: accent });

  if (view === 'details') {
    return (
      <div css={pageCss}>
        <header css={headerCss}>
          <strong>Fluentic Style Admin</strong>
          <select css={selectCss}>
            <option>Last 7 days</option>
          </select>
        </header>
        <section css={style(base.detailsHero)}>
          <h1 css={panelTitleCss}>Customer Detail</h1>
          <p css={panelDescCss}>Real route view mount simulation.</p>
        </section>
      </div>
    );
  }

  const panelCss = useChain
    ? style(base.card)
      .media('(max-width: 900px)', { padding: compactPadding })
      .media('(min-width: 700px)', { background: surface })
    : style(base.card).media('(max-width: 900px)', { padding: compactPadding });

  return (
    <div css={pageCss}>
      <header css={headerCss}>
        <strong>Fluentic Style Admin</strong>
        <select css={selectCss}>
          <option>Last 7 days</option>
        </select>
      </header>
      <div css={style(base.shell)}>
        <section css={style(base.card)}>
          {menu.map((m, index) => (
            <button
              key={m}
              css={style({
                ...base.menuBtn,
                borderColor: index === tick % menu.length ? accent : '#1e293b',
              }).hover({ borderColor: accent })}
            >
              {m}
            </button>
          ))}
        </section>
        <section css={panelCss}>
          <h1 css={panelTitleCss}>Admin Dashboard</h1>
          <p css={panelDescCss}>Real world mount + update benchmark.</p>
          <table css={style(base.table)}>
            <thead>
              <tr>
                <th css={style(base.thtd)}>Name</th>
                <th css={style(base.thtd)}>Plan</th>
                <th css={style(base.thtd)}>Usage</th>
                <th css={style(base.thtd)}>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={r.id}
                  css={liteStyle && i === activeRow
                    ? style({ background: `color-mix(in srgb, ${accent} 14%, transparent)` })
                    : null}
                >
                  <td css={style(base.thtd)}>{r.name}</td>
                  <td css={style(base.thtd)}>{r.plan}</td>
                  <td css={style(base.thtd)}>{r.usage}%</td>
                  <td css={style(base.thtd)}>
                    <span
                      css={style({
                        ...base.badge,
                        borderColor: r.usage > 70 ? accent : '#334155',
                      })}
                    >
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}

const lib = useInlineStyle
  ? useChain
    ? 'fluentic-style-inline-chain'
    : 'fluentic-style-inline-simple'
  : useChain
  ? 'fluentic-style-chain'
  : 'fluentic-style-simple';

mountSingleBench({ AppLayout, lib });
