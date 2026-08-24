import { Chrome } from '../../lib/Chrome';
import s from '../../lib/classNameStyles';

const taskItems = [
  ['M', 'Messages', '14 handled', 'Ready'],
  ['V', 'Maintenance', '2 coordinated', 'Queued'],
  ['R', 'Reports', '3 sent', 'Sent'],
];

export default function ClassNamePage() {
  return (
    <main css={s.page}>
      <Chrome>
        <section css={[s.shell, s.hero]}>
          <div css={s.heroCopy}>
            <span css={s.eyebrow}>Class-name import source</span>
            <h1 css={s.h1}>Tailwind class-name chain</h1>
            <p css={s.lead}>
              A compact route shaped like Urio: a custom class-name preset, named tokens, local responsive selectors,
              and dynamic grid utilities that still sourcemap back to source.
            </p>
            <div css={s.actions}>
              <a css={s.cta} href='#tasks'>Primary action</a>
              <a css={s.secondaryCta} href='#notes'>Secondary action</a>
            </div>
          </div>

          <aside css={s.visual}>
            <div css={s.visualHeader}>
              <h2 css={s.visualTitle}>Operations queue</h2>
              <span css={s.statusPill}><span css={s.statusDot} /> Live</span>
            </div>
            <div css={s.list}>
              {taskItems.map(([icon, label, value, state]) => (
                <article key={label} css={s.row}>
                  <span css={s.rowIcon}>{icon}</span>
                  <div css={s.rowBody}>
                    <h3 css={s.cardTitle}>{label}</h3>
                    <p css={s.rowMeta}>{value}</p>
                  </div>
                  <strong css={s.rowState}>{state}</strong>
                </article>
              ))}
            </div>
            <p css={s.note}>Breakpoint utilities are generated through the same class-name chain as the page shell.</p>
          </aside>
        </section>

        <section css={s.section} id='tasks'>
          <div css={[s.shell, s.grid]} data-testid='class-name-grid'>
            {taskItems.map(([, label, value, state]) => (
              <article key={label} css={s.card}>
                <h2 css={s.cardTitle}>{label}</h2>
                <p css={s.cardText}>{value} - {state}</p>
              </article>
            ))}
          </div>
        </section>
      </Chrome>
    </main>
  );
}
