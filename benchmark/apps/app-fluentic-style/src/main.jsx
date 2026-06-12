import 'virtual:fluentic-styles';
import { menu, mountSingleBench, rows } from '@benchmark/main';
import { fluenticClassNames as c } from './fluenticStyles';

const useChain = new URLSearchParams(window.location.search).get('fluenticMode') !== 'simple';
const panelSlotClass = useChain ? c.panelSlotChain : c.panelSlotSimple;

function AppLayout({ view, tick, liteStyle }) {
  const activeRow = tick % rows.length;
  if (view === 'details') {
    return (
      <div className={c.page}>
        <header className={c.header}>
          <strong>Fluentic Style Admin</strong>
          <select className={c.select}>
            <option>Last 7 days</option>
          </select>
        </header>
        <section className={c.detailsHero}>
          <h1 className={c.panelTitle}>Customer Detail</h1>
          <p className={c.panelDesc}>Real route view mount simulation.</p>
        </section>
      </div>
    );
  }
  return (
    <div className={c.page}>
      <header className={c.header}>
        <strong>Fluentic Style Admin</strong>
        <select className={c.select}>
          <option>Last 7 days</option>
        </select>
      </header>
      <div className={c.shell}>
        <section className={c.card}>
          {menu.map((m) => <button key={m} className={c.menuBtn}>{m}</button>)}
        </section>
        <section className={panelSlotClass}>
          <h1 className={c.panelTitle}>Admin Dashboard</h1>
          <p className={c.panelDesc}>Real world mount + update benchmark.</p>
          <table className={c.table}>
            <thead>
              <tr>
                <th className={c.thtd}>Name</th>
                <th className={c.thtd}>Plan</th>
                <th className={c.thtd}>Usage</th>
                <th className={c.thtd}>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} className={liteStyle && i === activeRow ? c.rowActive : ''}>
                  <td className={c.thtd}>{r.name}</td>
                  <td className={c.thtd}>{r.plan}</td>
                  <td className={c.thtd}>{r.usage}%</td>
                  <td className={c.thtd}>
                    <span className={c.badge}>{r.status}</span>
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

mountSingleBench({ AppLayout, lib: useChain ? 'fluentic-style-chain' : 'fluentic-style-simple' });
