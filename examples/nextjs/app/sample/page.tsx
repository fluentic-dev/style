import { combineStyle } from '@fluentic/style';
import { Chrome } from '../../lib/Chrome';
import { page } from '../../lib/styles';
import { Sample } from './Sample';

export default function SharedPage() {
  const css = combineStyle(page);

  return (
    <Chrome>
      <section css={css.hero}>
        <span css={css.eyebrow}>Standalone shared display / client component</span>
      </section>
      <Sample />
    </Chrome>
  );
}
