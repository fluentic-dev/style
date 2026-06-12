import { base, menu, mountSingleBench, palette, rows } from '@benchmark/main';
import { style, useCss } from '@fluentic/style';

const styles = {
  page: style.slot(base.page),
  header: style.slot(base.header),
  shell: style.slot(base.shell),
  card: style.slot(base.card),
  table: style.slot(base.table),
  thtd: style.slot(base.thtd),
  badge: style.slot(base.badge),
  menuBtn: style.slot(base.menuBtn).hover({ borderColor: palette.accent }),
  select: style.slot(base.select),
  detailsHero: style.slot(base.detailsHero),
  rowActive: style.slot({ background: 'rgba(34,211,238,0.08)' }),
  panelSlot: style.slot(base.card).media('(max-width: 900px)', { padding: 10 }),
  panelTitle: style.slot(base.title).media('(max-width: 900px)', { fontSize: 18 }),
  panelDesc: style.slot(base.muted).hover({ color: '#cbd5e1' }),
};

function AppLayout({ view, tick, liteStyle }) {
  const css = useCss(styles);
  const activeRow = tick % rows.length;

  if (view === 'details') {
    return (
      <div css={css.page}>
        <header css={css.header}>
          <strong>Fluentic Style Admin</strong>
          <select css={css.select}>
            <option>Last 7 days</option>
          </select>
        </header>
        <section css={css.detailsHero}>
          <h1 css={css.panelTitle}>Customer Detail</h1>
          <p css={css.panelDesc}>Real route view mount simulation.</p>
        </section>
      </div>
    );
  }

  return (
    <div css={css.page}>
      <header css={css.header}>
        <strong>Fluentic Style Admin</strong>
        <select css={css.select}>
          <option>Last 7 days</option>
        </select>
      </header>
      <div css={css.shell}>
        <section css={css.card}>
          {menu.map((m) => <button key={m} css={css.menuBtn}>{m}</button>)}
        </section>
        <section css={css.panelSlot}>
          <h1 css={css.panelTitle}>Admin Dashboard</h1>
          <p css={css.panelDesc}>Real world mount + update benchmark.</p>
          <table css={css.table}>
            <thead>
              <tr>
                <th css={css.thtd}>Name</th>
                <th css={css.thtd}>Plan</th>
                <th css={css.thtd}>Usage</th>
                <th css={css.thtd}>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} css={liteStyle && i === activeRow ? css.rowActive : undefined}>
                  <td css={css.thtd}>{r.name}</td>
                  <td css={css.thtd}>{r.plan}</td>
                  <td css={css.thtd}>{r.usage}%</td>
                  <td css={css.thtd}>
                    <span css={css.badge}>{r.status}</span>
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

mountSingleBench({ AppLayout, lib: 'fluentic-runtime-css-prop' });
