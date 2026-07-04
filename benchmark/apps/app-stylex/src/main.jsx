import { getRowVars, menu, mountSingleBench, rows } from '@benchmark/main';
import React from 'react';
import './base.css';
import { stylexStyles, sx } from './stylexStyles.jsx';
const p = {
  page: sx(stylexStyles.page),
  header: sx(stylexStyles.header),
  select: sx(stylexStyles.select),
  detailsHero: sx(stylexStyles.detailsHero),
  title: sx(stylexStyles.title),
  muted: sx(stylexStyles.muted),
  shell: sx(stylexStyles.shell),
  card: sx(stylexStyles.card),
  menuBtn: sx(stylexStyles.menuBtn),
  table: sx(stylexStyles.table),
  thtd: sx(stylexStyles.thtd),
  badge: sx(stylexStyles.badge),
  badgeThemed: sx(stylexStyles.badge, stylexStyles.badgeThemed),
  rowActive: sx(stylexStyles.rowThemed, stylexStyles.rowActive),
  rowBase: sx(stylexStyles.rowThemed),
};

const tableShape = new URLSearchParams(window.location.search).get('tableShape') || 'dom';

function cx(...parts) {
  return parts.filter(Boolean).join(' ');
}

function getThemeClass(row) {
  if (row.status === 'blocked') return 'themeBlocked';
  if (row.status === 'trial') return 'themeTrial';
  return 'themeActive';
}

function getRowProps(row, active) {
  const props = active ? p.rowActive : p.rowBase;
  return {
    ...props,
    className: cx(getThemeClass(row), props.className),
  };
}

function AppLayout({ view, tick, liteStyle }) {
  if (tableShape === 'components') {
    return <ComponentAppLayout view={view} tick={tick} liteStyle={liteStyle} />;
  }

  const activeRow = tick % rows.length;
  if (view === 'details') {
    return (
      <div {...p.page}>
        <header {...p.header}>
          <strong>Fluentic Style Admin</strong>
          <select {...p.select}>
            <option>Last 7 days</option>
          </select>
        </header>
        <section {...p.detailsHero}>
          <h1 {...p.title}>Customer Detail</h1>
          <p {...p.muted}>Real route view mount simulation.</p>
        </section>
      </div>
    );
  }
  return (
    <div {...p.page}>
      <header {...p.header}>
        <strong>Fluentic Style Admin</strong>
        <select {...p.select}>
          <option>Last 7 days</option>
        </select>
      </header>
      <div {...p.shell}>
        <section {...p.card}>
          {menu.map((m) => <button key={m} {...p.menuBtn}>{m}</button>)}
        </section>
        <section {...p.card}>
          <h1 {...p.title}>Admin Dashboard</h1>
          <p {...p.muted}>Real world mount + update benchmark.</p>
          <table {...p.table}>
            <thead>
              <tr>
                <th {...p.thtd}>Name</th>
                <th {...p.thtd}>Plan</th>
                <th {...p.thtd}>Usage</th>
                <th {...p.thtd}>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={r.id}
                  {...getRowProps(r, liteStyle && i === activeRow)}
                  style={getRowVars(r, tick)}
                >
                  <td {...p.thtd}>{r.name}</td>
                  <td {...p.thtd}>{r.plan}</td>
                  <td {...p.thtd}>{r.usage}%</td>
                  <td {...p.thtd}>
                    <span {...p.badgeThemed}>{r.status}</span>
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
      <div {...p.page}>
        <header {...p.header}>
          <strong>Fluentic Style Admin</strong>
          <select {...p.select}>
            <option>Last 7 days</option>
          </select>
        </header>
        <section {...p.detailsHero}>
          <h1 {...p.title}>Customer Detail</h1>
          <p {...p.muted}>Real route view mount simulation.</p>
        </section>
      </div>
    );
  }
  return (
    <div {...p.page}>
      <header {...p.header}>
        <strong>Fluentic Style Admin</strong>
        <select {...p.select}>
          <option>Last 7 days</option>
        </select>
      </header>
      <div {...p.shell}>
        <section {...p.card}>
          {menu.map((m) => <button key={m} {...p.menuBtn}>{m}</button>)}
        </section>
        <section {...p.card}>
          <h1 {...p.title}>Admin Dashboard</h1>
          <p {...p.muted}>Real world mount + update benchmark.</p>
          <table {...p.table}>
            <thead>
              <tr>
                <th {...p.thtd}>Name</th>
                <th {...p.thtd}>Plan</th>
                <th {...p.thtd}>Usage</th>
                <th {...p.thtd}>Status</th>
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
    <tr {...getRowProps(row, active)} style={getRowVars(row, tick)}>
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
  return <td {...p.thtd}>{children}</td>;
}

function BenchBadge({ children }) {
  return <span {...p.badgeThemed}>{children}</span>;
}

mountSingleBench({ AppLayout, lib: 'stylex' });
