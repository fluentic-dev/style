import { menu, mountSingleBench, rows } from '@benchmark/main';
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
  rowActive: sx(stylexStyles.rowActive),
  rowBase: sx(null),
};
function AppLayout({ view, tick, liteStyle }) {
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
                <tr key={r.id} {...(liteStyle && i === activeRow ? p.rowActive : p.rowBase)}>
                  <td {...p.thtd}>{r.name}</td>
                  <td {...p.thtd}>{r.plan}</td>
                  <td {...p.thtd}>{r.usage}%</td>
                  <td {...p.thtd}>
                    <span {...p.badge}>{r.status}</span>
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
mountSingleBench({ AppLayout, lib: 'stylex' });
