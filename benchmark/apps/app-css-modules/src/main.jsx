import { getRowVars, menu, mountSingleBench, rows } from '@benchmark/main';
import React from 'react';
import s from './styles.module.css';

const tableShape = new URLSearchParams(window.location.search).get('tableShape') || 'dom';

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

mountSingleBench({ AppLayout, lib: 'css-modules' });
