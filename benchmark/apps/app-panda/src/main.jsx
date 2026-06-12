import { menu, mountSingleBench, rows } from '@benchmark/main';
import React from 'react';
// oxlint-disable-next-line import/no-unassigned-import -- Panda emits generated CSS consumed for its class names.
import '../styled-system/styles.css';
import { pandaStyles } from './pandaStyles';
function AppLayout({ view, tick, liteStyle }) {
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
                  className={liteStyle && i === activeRow ? pandaStyles.rowActive : ''}
                >
                  <td className={pandaStyles.thtd}>{r.name}</td>
                  <td className={pandaStyles.thtd}>{r.plan}</td>
                  <td className={pandaStyles.thtd}>{r.usage}%</td>
                  <td className={pandaStyles.thtd}>
                    <span className={pandaStyles.badge}>{r.status}</span>
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
mountSingleBench({ AppLayout, lib: 'panda-static-css' });
