import { base, menu, mountSingleBench, palette, rows } from '@benchmark/main';
import { combineStyle, style } from '@fluentic/style';

const styles = {
  page: style.slot(base.page),
  header: style.slot(base.header),
  shell: style.slot(base.shell),
  card: style.slot(base.card),
  table: style.slot(base.table),
  thtd: style.slot(base.thtd),
  badge: style.slot(base.badge),
  menuBtn: style.slot(base.menuBtn).hover({ borderColor: palette.accent }),
  select: style.slot(base.select),
  detailsHero: style.slot(base.detailsHero),
  rowActive: style.slot({ background: 'rgba(34,211,238,0.08)' }),
  panelSlot: style.slot(base.card).media('(max-width: 900px)', { padding: 10 }),
  panelTitle: style.slot(base.title).media('(max-width: 900px)', { fontSize: 18 }),
  panelDesc: style.slot(base.muted).hover({ color: '#cbd5e1' }),
};
const useStressStyle = new URLSearchParams(window.location.search).get('stressStyle') === '1';
const tones = [palette.accent, '#a78bfa', '#34d399', '#fb7185', '#f59e0b', '#60a5fa'];

function getTone(row, tick) {
  return tones[(row.id + tick) % tones.length];
}

function AppLayout({ view, tick, liteStyle }) {
  if (useStressStyle) {
    return <StressAppLayout view={view} tick={tick} liteStyle={liteStyle} />;
  }

  const css = combineStyle(styles);
  const activeRow = tick % rows.length;

  if (view === 'details') {
    return (
      <div css={css.page}>
        <header css={css.header}>
          <strong>Fluentic Style Admin</strong>
          <select css={css.select}>
            <option>Last 7 days</option>
          </select>
        </header>
        <section css={css.detailsHero}>
          <h1 css={css.panelTitle}>Customer Detail</h1>
          <p css={css.panelDesc}>Real route view mount simulation.</p>
        </section>
      </div>
    );
  }

  return (
    <div css={css.page}>
      <header css={css.header}>
        <strong>Fluentic Style Admin</strong>
        <select css={css.select}>
          <option>Last 7 days</option>
        </select>
      </header>
      <div css={css.shell}>
        <section css={css.card}>
          {menu.map((m) => <button key={m} css={css.menuBtn}>{m}</button>)}
        </section>
        <section css={css.panelSlot}>
          <h1 css={css.panelTitle}>Admin Dashboard</h1>
          <p css={css.panelDesc}>Real world mount + update benchmark.</p>
          <table css={css.table}>
            <thead>
              <tr>
                <th css={css.thtd}>Name</th>
                <th css={css.thtd}>Plan</th>
                <th css={css.thtd}>Usage</th>
                <th css={css.thtd}>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} css={liteStyle && i === activeRow ? css.rowActive : undefined}>
                  <td css={css.thtd}>{r.name}</td>
                  <td css={css.thtd}>{r.plan}</td>
                  <td css={css.thtd}>{r.usage}%</td>
                  <td css={css.thtd}>
                    <span css={css.badge}>{r.status}</span>
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
        <section css={style({ ...base.detailsHero, borderColor: accent })}>
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

mountSingleBench({ AppLayout, lib: 'fluentic-runtime-css-prop' });
