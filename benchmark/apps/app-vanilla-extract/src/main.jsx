import { getRowVars, menu, mountSingleBench, rows } from '@benchmark/main';
import React from 'react';
import * as vx from './extracted.css';
function AppLayout({ view, tick, liteStyle }) {
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
                  className={liteStyle && i === activeRow ? vx.vRowActive : ''}
                  style={getRowVars(r, tick)}
                >
                  <td className={vx.vThTd}>{r.name}</td>
                  <td className={vx.vThTd}>{r.plan}</td>
                  <td className={vx.vThTd}>{r.usage}%</td>
                  <td className={vx.vThTd}>
                    <span className={vx.vBadge}>{r.status}</span>
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
mountSingleBench({ AppLayout, lib: 'vanilla-extract' });
