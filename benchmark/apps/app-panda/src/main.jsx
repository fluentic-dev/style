import { getRowVars, menu, mountSingleBench, rows } from '@benchmark/main';
import React from 'react';
import { pandaStyles } from './pandaStyles';
import '../styled-system/styles.css';

const tableShape = new URLSearchParams(window.location.search).get('tableShape') || 'dom';

function cx(...parts) {
  return parts.filter(Boolean).join(' ');
}

function getThemeClass(row) {
  if (row.status === 'blocked') return pandaStyles.themeBlocked;
  if (row.status === 'trial') return pandaStyles.themeTrial;
  return pandaStyles.themeActive;
}

function getRowClass(row, active) {
  return cx(getThemeClass(row), pandaStyles.rowThemed, active && pandaStyles.rowActive);
}

function AppLayout({ view, tick, liteStyle }) {
  if (tableShape === 'components') {
    return <ComponentAppLayout view={view} tick={tick} liteStyle={liteStyle} />;
  }

  const activeRow = tick % rows.length;
  if (view === 'details') {
    return (
      <div className={pandaStyles.page}>
        <header className={pandaStyles.header}>
          <strong>Fluentic Style Admin</strong>
          <select className={pandaStyles.select}>
            <option>Last 7 days</option>
          </select>
        </header>
        <section className={pandaStyles.detailsHero}>
          <h1 className={pandaStyles.title}>Customer Detail</h1>
          <p className={pandaStyles.muted}>Real route view mount simulation.</p>
        </section>
      </div>
    );
  }
  return (
    <div className={pandaStyles.page}>
      <header className={pandaStyles.header}>
        <strong>Fluentic Style Admin</strong>
        <select className={pandaStyles.select}>
          <option>Last 7 days</option>
        </select>
      </header>
      <div className={pandaStyles.shell}>
        <section className={pandaStyles.card}>
          {menu.map((m) => <button key={m} className={pandaStyles.menuBtn}>{m}</button>)}
        </section>
        <section className={pandaStyles.card}>
          <h1 className={pandaStyles.title}>Admin Dashboard</h1>
          <p className={pandaStyles.muted}>Real world mount + update benchmark.</p>
          <table className={pandaStyles.table}>
            <thead>
              <tr>
                <th className={pandaStyles.thtd}>Name</th>
                <th className={pandaStyles.thtd}>Plan</th>
                <th className={pandaStyles.thtd}>Usage</th>
                <th className={pandaStyles.thtd}>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={r.id}
                  className={getRowClass(r, liteStyle && i === activeRow)}
                  style={getRowVars(r, tick)}
                >
                  <td className={pandaStyles.thtd}>{r.name}</td>
                  <td className={pandaStyles.thtd}>{r.plan}</td>
                  <td className={pandaStyles.thtd}>{r.usage}%</td>
                  <td className={pandaStyles.thtd}>
                    <span className={cx(pandaStyles.badge, pandaStyles.badgeThemed)}>{r.status}</span>
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
      <div className={pandaStyles.page}>
        <header className={pandaStyles.header}>
          <strong>Fluentic Style Admin</strong>
          <select className={pandaStyles.select}>
            <option>Last 7 days</option>
          </select>
        </header>
        <section className={pandaStyles.detailsHero}>
          <h1 className={pandaStyles.title}>Customer Detail</h1>
          <p className={pandaStyles.muted}>Real route view mount simulation.</p>
        </section>
      </div>
    );
  }
  return (
    <div className={pandaStyles.page}>
      <header className={pandaStyles.header}>
        <strong>Fluentic Style Admin</strong>
        <select className={pandaStyles.select}>
          <option>Last 7 days</option>
        </select>
      </header>
      <div className={pandaStyles.shell}>
        <section className={pandaStyles.card}>
          {menu.map((m) => <button key={m} className={pandaStyles.menuBtn}>{m}</button>)}
        </section>
        <section className={pandaStyles.card}>
          <h1 className={pandaStyles.title}>Admin Dashboard</h1>
          <p className={pandaStyles.muted}>Real world mount + update benchmark.</p>
          <table className={pandaStyles.table}>
            <thead>
              <tr>
                <th className={pandaStyles.thtd}>Name</th>
                <th className={pandaStyles.thtd}>Plan</th>
                <th className={pandaStyles.thtd}>Usage</th>
                <th className={pandaStyles.thtd}>Status</th>
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
  return <td className={pandaStyles.thtd}>{children}</td>;
}

function BenchBadge({ children }) {
  return <span className={cx(pandaStyles.badge, pandaStyles.badgeThemed)}>{children}</span>;
}

mountSingleBench({ AppLayout, lib: 'panda-static-css' });
