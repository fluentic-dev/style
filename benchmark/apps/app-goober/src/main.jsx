import { base, getRowVars, menu, mountSingleBench, palette, rows } from '@benchmark/main';
import { css, setup } from 'goober';
import React from 'react';

setup(React.createElement);

const s = {
  page: css(base.page),
  header: css(base.header),
  shell: css(base.shell),
  card: css(base.card),
  title: css`
    margin: 0;
    font-size: 20px;
    @media (max-width: 900px) {
      font-size: 18px;
    }
  `,
  muted: css({ ...base.muted, '&:hover': { color: '#cbd5e1' } }),
  table: css(base.table),
  thtd: css(base.thtd),
  badge: css(base.badge),
  menuBtn: css({ ...base.menuBtn, '&:hover': { borderColor: palette.accent } }),
  select: css(base.select),
  detailsHero: css(base.detailsHero),
  rowThemed: css({
    background: 'var(--bench-row-surface, var(--bench-token-surface, #111827))',
    borderLeft: '3px solid transparent',
    borderLeftColor: 'var(--bench-row-ring, var(--bench-token-ring, rgba(34,211,238,0.20)))',
  }),
  rowActive: css({ background: 'rgba(34,211,238,0.08)' }),
  badgeThemed: css({ color: 'var(--bench-badge-accent, var(--bench-token-accent, #22d3ee))' }),
  themeActive: css({
    '--bench-token-accent': '#0f766e',
    '--bench-token-surface': 'rgba(240,253,250,0.92)',
    '--bench-token-ring': 'rgba(15,118,110,0.24)',
  }),
  themeTrial: css({
    '--bench-token-accent': '#b45309',
    '--bench-token-surface': 'rgba(255,251,235,0.92)',
    '--bench-token-ring': 'rgba(180,83,9,0.22)',
  }),
  themeBlocked: css({
    '--bench-token-accent': '#dc2626',
    '--bench-token-surface': 'rgba(254,242,242,0.92)',
    '--bench-token-ring': 'rgba(220,38,38,0.22)',
  }),
};

const useStressStyle = new URLSearchParams(window.location.search).get('stressStyle') === '1';
const tableShape = new URLSearchParams(window.location.search).get('tableShape') || 'dom';

const tones = [palette.accent, '#a78bfa', '#34d399', '#fb7185', '#f59e0b', '#60a5fa'];

function getTone(row, tick) {
  return tones[(row.id + tick) % tones.length];
}

function cx(...parts) {
  return parts.filter(Boolean).join(' ');
}

function getThemeClass(row) {
  if (row.status === 'blocked') return s.themeBlocked;
  if (row.status === 'trial') return s.themeTrial;
  return s.themeActive;
}

function getRowClass(row, active) {
  return cx(getThemeClass(row), s.rowThemed, active && s.rowActive);
}

function AppLayout({ view, tick, liteStyle }) {
  if (useStressStyle) {
    return <StressAppLayout view={view} tick={tick} liteStyle={liteStyle} />;
  }
  if (tableShape === 'components') {
    return <ComponentAppLayout view={view} tick={tick} liteStyle={liteStyle} />;
  }

  const activeRow = tick % rows.length;
  if (view === 'details') {
    return (
      <div className={s.page}>
        <header className={s.header}>
          <strong>Fluentic Style Admin</strong>
          <select className={s.select}>
            <option>Last 7 days</option>
          </select>
        </header>
        <section className={s.detailsHero}>
          <h1 className={s.title}>Customer Detail</h1>
          <p className={s.muted}>Real route view mount simulation.</p>
        </section>
      </div>
    );
  }
  return (
    <div className={s.page}>
      <header className={s.header}>
        <strong>Fluentic Style Admin</strong>
        <select className={s.select}>
          <option>Last 7 days</option>
        </select>
      </header>
      <div className={s.shell}>
        <section className={s.card}>
          {menu.map((m) => <button key={m} className={s.menuBtn}>{m}</button>)}
        </section>
        <section className={s.card}>
          <h1 className={s.title}>Admin Dashboard</h1>
          <p className={s.muted}>Real world mount + update benchmark.</p>
          <table className={s.table}>
            <thead>
              <tr>
                <th className={s.thtd}>Name</th>
                <th className={s.thtd}>Plan</th>
                <th className={s.thtd}>Usage</th>
                <th className={s.thtd}>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} className={getRowClass(r, liteStyle && i === activeRow)} style={getRowVars(r, tick)}>
                  <td className={s.thtd}>{r.name}</td>
                  <td className={s.thtd}>{r.plan}</td>
                  <td className={s.thtd}>{r.usage}%</td>
                  <td className={s.thtd}>
                    <span className={cx(s.badge, s.badgeThemed)}>{r.status}</span>
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

function ComponentAppLayout({ view, tick, liteStyle }) {
  const activeRow = tick % rows.length;
  if (view === 'details') {
    return (
      <div className={s.page}>
        <header className={s.header}>
          <strong>Fluentic Style Admin</strong>
          <select className={s.select}>
            <option>Last 7 days</option>
          </select>
        </header>
        <section className={s.detailsHero}>
          <h1 className={s.title}>Customer Detail</h1>
          <p className={s.muted}>Real route view mount simulation.</p>
        </section>
      </div>
    );
  }
  return (
    <div className={s.page}>
      <header className={s.header}>
        <strong>Fluentic Style Admin</strong>
        <select className={s.select}>
          <option>Last 7 days</option>
        </select>
      </header>
      <div className={s.shell}>
        <section className={s.card}>
          {menu.map((m) => <button key={m} className={s.menuBtn}>{m}</button>)}
        </section>
        <section className={s.card}>
          <h1 className={s.title}>Admin Dashboard</h1>
          <p className={s.muted}>Real world mount + update benchmark.</p>
          <table className={s.table}>
            <thead>
              <tr>
                <th className={s.thtd}>Name</th>
                <th className={s.thtd}>Plan</th>
                <th className={s.thtd}>Usage</th>
                <th className={s.thtd}>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => <BenchRow key={r.id} row={r} active={liteStyle && i === activeRow} tick={tick} />)}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}

function BenchRow({ row, active, tick }) {
  return (
    <tr className={getRowClass(row, active)} style={getRowVars(row, tick)}>
      <BenchCell>{row.name}</BenchCell>
      <BenchCell>{row.plan}</BenchCell>
      <BenchCell>{row.usage}%</BenchCell>
      <BenchCell>
        <BenchBadge>{row.status}</BenchBadge>
      </BenchCell>
    </tr>
  );
}

function BenchCell({ children }) {
  return <td className={s.thtd}>{children}</td>;
}

function BenchBadge({ children }) {
  return <span className={cx(s.badge, s.badgeThemed)}>{children}</span>;
}

function StressAppLayout({ view, tick, liteStyle }) {
  const accent = tick % 2 === 0 ? palette.accent : '#a78bfa';
  const activeRow = tick % rows.length;

  if (view === 'details') {
    return (
      <div className={s.page}>
        <header className={css({ ...base.header, borderColor: accent, boxShadow: `0 0 0 1px ${accent}` })}>
          <strong>Fluentic Style Admin</strong>
          <select className={s.select}>
            <option>Last 7 days</option>
          </select>
        </header>
        <section className={css({ ...base.detailsHero, borderColor: accent })}>
          <h1 className={css({ ...base.title, color: accent, '@media (max-width: 900px)': { fontSize: 18 } })}>
            Customer Detail
          </h1>
          <p className={css({ ...base.muted, '&:hover': { color: accent } })}>Real route view mount simulation.</p>
        </section>
      </div>
    );
  }

  return (
    <div className={s.page}>
      <header className={css({ ...base.header, borderColor: accent, boxShadow: `0 0 0 1px ${accent}` })}>
        <strong>Fluentic Style Admin</strong>
        <select className={s.select}>
          <option>Last 7 days</option>
        </select>
      </header>
      <div className={s.shell}>
        <section className={s.card}>
          {menu.map((m, index) => (
            <button
              key={m}
              className={css({
                ...base.menuBtn,
                borderColor: index === tick % menu.length ? accent : palette.border,
                transform: index === tick % menu.length ? 'translateX(2px)' : 'none',
                '&:hover': { borderColor: accent },
              })}
            >
              {m}
            </button>
          ))}
        </section>
        <section
          className={css({
            ...base.card,
            '@media (max-width: 900px)': { padding: 10 + (tick % 4) },
            '@media (min-width: 700px)': { background: tick % 2 === 0 ? palette.panel : '#0b1220' },
          })}
        >
          <h1 className={css({ ...base.title, color: accent, '@media (max-width: 900px)': { fontSize: 18 } })}>
            Admin Dashboard
          </h1>
          <p className={css({ ...base.muted, '&:hover': { color: accent } })}>Real world mount + update benchmark.</p>
          <table className={s.table}>
            <thead>
              <tr>
                <th className={s.thtd}>Name</th>
                <th className={s.thtd}>Plan</th>
                <th className={s.thtd}>Usage</th>
                <th className={s.thtd}>Status</th>
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
                    className={css({
                      background: active ? `color-mix(in srgb, ${tone} 16%, transparent)` : 'transparent',
                      color: index % 3 === tick % 3 ? '#f8fafc' : palette.text,
                    })}
                  >
                    <td className={css({ ...base.thtd, borderColor: tone })}>{row.name}</td>
                    <td className={s.thtd}>{row.plan}</td>
                    <td className={css({ ...base.thtd, color: tone })}>{usage}%</td>
                    <td className={s.thtd}>
                      <span
                        className={css({
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
mountSingleBench({ AppLayout, lib: 'goober' });
