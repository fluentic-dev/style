import { combineStyle } from '@fluentic/style';
import { Chrome } from '../../lib/Chrome';
import { page } from '../../lib/styles';
import { ClientPanel } from './ClientPanel';

export default function ClientPage() {
  const css = combineStyle(page);

  return (
    <Chrome>
      <section css={css.hero}>
        <span css={css.eyebrow}>Client component / extracted hook styles</span>
        <h1 css={css.heading}>Client hook route</h1>
        <p css={css.intro}>
          This route shows the client-side hook path while keeping the output aligned with the server-rendered pages.
        </p>
      </section>
      <ClientPanel />
    </Chrome>
  );
}
