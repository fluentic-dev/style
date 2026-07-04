import { getRowVars, menu, mountSingleBench, rows } from '@benchmark/main';
import React from 'react';
import s from './styles.module.css';
function AppLayout({ view, tick, liteStyle }) {
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
                <tr key={r.id} className={liteStyle && i === activeRow ? s.rowActive : ''} style={getRowVars(r, tick)}>
                  <td className={s.thtd}>{r.name}</td>
                  <td className={s.thtd}>{r.plan}</td>
                  <td className={s.thtd}>{r.usage}%</td>
                  <td className={s.thtd}>
                    <span className={s.badge}>{r.status}</span>
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
mountSingleBench({ AppLayout, lib: 'css-modules' });
