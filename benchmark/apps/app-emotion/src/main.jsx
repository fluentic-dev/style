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
const useStressStyle = new URLSearchParams(window.location.search).get('stressStyle') === '1';
const tones = [palette.accent, '#a78bfa', '#34d399', '#fb7185', '#f59e0b', '#60a5fa'];

function getTone(row, tick) {
  return tones[(row.id + tick) % tones.length];
}

function AppLayout({ view, tick, liteStyle }) {
  if (useStressStyle) {
    return <StressAppLayout view={view} tick={tick} liteStyle={liteStyle} />;
  }

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

function StressAppLayout({ view, tick, liteStyle }) {
  const accent = tick % 2 === 0 ? palette.accent : '#a78bfa';
  const activeRow = tick % rows.length;

  if (view === 'details') {
    return (
      <div css={s.page}>
        <header css={css({ ...base.header, borderColor: accent, boxShadow: `0 0 0 1px ${accent}` })}>
          <strong>Fluentic Style Admin</strong>
          <select css={s.select}>
            <option>Last 7 days</option>
          </select>
        </header>
        <section css={css({ ...base.detailsHero, borderColor: accent })}>
          <h1 css={css({ ...base.title, color: accent, [media900]: { fontSize: 18 } })}>Customer Detail</h1>
          <p css={css({ ...base.muted, ':hover': { color: accent } })}>Real route view mount simulation.</p>
        </section>
      </div>
    );
  }

  return (
    <div css={s.page}>
      <header css={css({ ...base.header, borderColor: accent, boxShadow: `0 0 0 1px ${accent}` })}>
        <strong>Fluentic Style Admin</strong>
        <select css={s.select}>
          <option>Last 7 days</option>
        </select>
      </header>
      <div css={s.shell}>
        <section css={s.card}>
          {menu.map((m, index) => (
            <button
              key={m}
              css={css({
                ...base.menuBtn,
                borderColor: index === tick % menu.length ? accent : palette.border,
                transform: index === tick % menu.length ? 'translateX(2px)' : 'none',
                ':hover': { borderColor: accent },
              })}
            >
              {m}
            </button>
          ))}
        </section>
        <section
          css={css({
            ...base.card,
            [media900]: { padding: 10 + (tick % 4) },
            '@media (min-width: 700px)': { background: tick % 2 === 0 ? palette.panel : '#0b1220' },
          })}
        >
          <h1 css={css({ ...base.title, color: accent, [media900]: { fontSize: 18 } })}>Admin Dashboard</h1>
          <p css={css({ ...base.muted, ':hover': { color: accent } })}>Real world mount + update benchmark.</p>
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
              {rows.map((row, index) => {
                const tone = getTone(row, tick);
                const active = liteStyle && index === activeRow;
                const usage = (row.usage + tick + index) % 100;

                return (
                  <tr
                    key={row.id}
                    css={css({
                      background: active ? `color-mix(in srgb, ${tone} 16%, transparent)` : 'transparent',
                      color: index % 3 === tick % 3 ? '#f8fafc' : palette.text,
                    })}
                  >
                    <td css={css({ ...base.thtd, borderColor: tone })}>{row.name}</td>
                    <td css={s.thtd}>{row.plan}</td>
                    <td css={css({ ...base.thtd, color: tone })}>{usage}%</td>
                    <td css={s.thtd}>
                      <span
                        css={css({
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
mountSingleBench({ AppLayout, lib: 'emotion' });
