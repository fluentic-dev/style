import { base, menu, mountSingleBench, palette, rows } from '@benchmark/main';
import { css } from '@emotion/react';
import React from 'react';
const media900 = '@media (max-width: 900px)';
const s = {
  page: css(base.page),
  header: css(base.header),
  shell: css(base.shell),
  card: css(base.card),
  title: css({ ...base.title, [media900]: { fontSize: 18 } }),
  muted: css({ ...base.muted, ':hover': { color: '#cbd5e1' } }),
  table: css(base.table),
  thtd: css(base.thtd),
  badge: css(base.badge),
  menuBtn: css({ ...base.menuBtn, ':hover': { borderColor: palette.accent } }),
  select: css(base.select),
  detailsHero: css(base.detailsHero),
  rowActive: css({ background: 'rgba(34,211,238,0.08)' }),
};
function AppLayout({ view, tick, liteStyle }) {
  const activeRow = tick % rows.length;
  if (view === 'details') {
    return (
      <div css={s.page}>
        <header css={s.header}>
          <strong>Fluentic Style Admin</strong>
          <select css={s.select}>
            <option>Last 7 days</option>
          </select>
        </header>
        <section css={s.detailsHero}>
          <h1 css={s.title}>Customer Detail</h1>
          <p css={s.muted}>Real route view mount simulation.</p>
        </section>
      </div>
    );
  }
  return (
    <div css={s.page}>
      <header css={s.header}>
        <strong>Fluentic Style Admin</strong>
        <select css={s.select}>
          <option>Last 7 days</option>
        </select>
      </header>
      <div css={s.shell}>
        <section css={s.card}>
          {menu.map((m) => <button key={m} css={s.menuBtn}>{m}</button>)}
        </section>
        <section css={s.card}>
          <h1 css={s.title}>Admin Dashboard</h1>
          <p css={s.muted}>Real world mount + update benchmark.</p>
          <table css={s.table}>
            <thead>
              <tr>
                <th css={s.thtd}>Name</th>
                <th css={s.thtd}>Plan</th>
                <th css={s.thtd}>Usage</th>
                <th css={s.thtd}>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} css={liteStyle && i === activeRow ? s.rowActive : undefined}>
                  <td css={s.thtd}>{r.name}</td>
                  <td css={s.thtd}>{r.plan}</td>
                  <td css={s.thtd}>{r.usage}%</td>
                  <td css={s.thtd}>
                    <span css={s.badge}>{r.status}</span>
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
mountSingleBench({ AppLayout, lib: 'emotion' });
