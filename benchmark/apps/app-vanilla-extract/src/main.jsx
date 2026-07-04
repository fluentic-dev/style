import { getRowVars, menu, mountSingleBench, rows } from '@benchmark/main';
import React from 'react';
import * as vx from './extracted.css';

const tableShape = new URLSearchParams(window.location.search).get('tableShape') || 'dom';

function cx(...parts) {
  return parts.filter(Boolean).join(' ');
}

function getThemeClass(row) {
  if (row.status === 'blocked') return vx.vThemeBlocked;
  if (row.status === 'trial') return vx.vThemeTrial;
  return vx.vThemeActive;
}

function getRowClass(row, active) {
  return cx(getThemeClass(row), vx.vRowThemed, active && vx.vRowActive);
}

function AppLayout({ view, tick, liteStyle }) {
  if (tableShape === 'components') {
    return <ComponentAppLayout view={view} tick={tick} liteStyle={liteStyle} />;
  }

  const activeRow = tick % rows.length;
  if (view === 'details') {
    return (
      <div className={vx.vPage}>
        <header className={vx.vHeader}>
          <strong>Fluentic Style Admin</strong>
          <select className={vx.vSelect}>
            <option>Last 7 days</option>
          </select>
        </header>
        <section className={vx.vDetailsHero}>
          <h1 className={vx.vTitle}>Customer Detail</h1>
          <p className={vx.vMuted}>Real route view mount simulation.</p>
        </section>
      </div>
    );
  }
  return (
    <div className={vx.vPage}>
      <header className={vx.vHeader}>
        <strong>Fluentic Style Admin</strong>
        <select className={vx.vSelect}>
          <option>Last 7 days</option>
        </select>
      </header>
      <div className={vx.vShell}>
        <section className={vx.vCard}>
          {menu.map((m) => <button key={m} className={`${vx.vMenuBtn} ${vx.vMenuBtnHover}`}>{m}</button>)}
        </section>
        <section className={vx.vCard}>
          <h1 className={vx.vTitle}>Admin Dashboard</h1>
          <p className={vx.vMuted}>Real world mount + update benchmark.</p>
          <table className={vx.vTable}>
            <thead>
              <tr>
                <th className={vx.vThTd}>Name</th>
                <th className={vx.vThTd}>Plan</th>
                <th className={vx.vThTd}>Usage</th>
                <th className={vx.vThTd}>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={r.id}
                  className={getRowClass(r, liteStyle && i === activeRow)}
                  style={getRowVars(r, tick)}
                >
                  <td className={vx.vThTd}>{r.name}</td>
                  <td className={vx.vThTd}>{r.plan}</td>
                  <td className={vx.vThTd}>{r.usage}%</td>
                  <td className={vx.vThTd}>
                    <span className={cx(vx.vBadge, vx.vBadgeThemed)}>{r.status}</span>
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
      <div className={vx.vPage}>
        <header className={vx.vHeader}>
          <strong>Fluentic Style Admin</strong>
          <select className={vx.vSelect}>
            <option>Last 7 days</option>
          </select>
        </header>
        <section className={vx.vDetailsHero}>
          <h1 className={vx.vTitle}>Customer Detail</h1>
          <p className={vx.vMuted}>Real route view mount simulation.</p>
        </section>
      </div>
    );
  }
  return (
    <div className={vx.vPage}>
      <header className={vx.vHeader}>
        <strong>Fluentic Style Admin</strong>
        <select className={vx.vSelect}>
          <option>Last 7 days</option>
        </select>
      </header>
      <div className={vx.vShell}>
        <section className={vx.vCard}>
          {menu.map((m) => <button key={m} className={`${vx.vMenuBtn} ${vx.vMenuBtnHover}`}>{m}</button>)}
        </section>
        <section className={vx.vCard}>
          <h1 className={vx.vTitle}>Admin Dashboard</h1>
          <p className={vx.vMuted}>Real world mount + update benchmark.</p>
          <table className={vx.vTable}>
            <thead>
              <tr>
                <th className={vx.vThTd}>Name</th>
                <th className={vx.vThTd}>Plan</th>
                <th className={vx.vThTd}>Usage</th>
                <th className={vx.vThTd}>Status</th>
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
  return <td className={vx.vThTd}>{children}</td>;
}

function BenchBadge({ children }) {
  return <span className={cx(vx.vBadge, vx.vBadgeThemed)}>{children}</span>;
}

mountSingleBench({ AppLayout, lib: 'vanilla-extract' });
