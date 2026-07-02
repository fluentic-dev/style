/* eslint-disable */
import { createExtractedSlot } from '@fluentic/style/entry/prod/extract';
import { combineStyle } from '@fluentic/style/entry/prod/runtime';
const styles = {
  card: createExtractedSlot('14csclw', [
    ['mwx9540', 'e6qzud0'],
    ['rykr7b0', 'bm51732'],
    ['1aeebut', 'jrzq530'],
    ['18q1j80', 'b7zf07f'],
    ['1ffb9qm', 'bc96cl8'],
    ['19uc4fd', 'ba4ofrg'],
    ['1nca60l', 'fruelm0'],
    ['1a6hjt3', 'oez5rp0'],
    ['1cyo51p', 'lljp0o0'],
    ['1gc9zxu', 'bu59zhw'],
    ['1qi6vb6', 'bwkz73g'],
  ]),
  row: createExtractedSlot('1pp84le', [
    ['1nca60l', 'fruelm0'],
    ['1a6hjt3', 's4ciid0'],
    ['w7kw820', 'i8h0vn0'],
    ['120ot0w', 'b3ihqkd'],
    ['1vlsvq1', 'bi3gqc0'],
    ['16jklu7', 'bxdjbts'],
  ]),
  badge: createExtractedSlot('1rnp0lk', [
    ['18q1j80', 'v8177j0'],
    ['1ut2mip', 'cwxf320'],
    ['1pkhne0', 'kfbuc00'],
    ['1ffb9qm', 'x9wtnj0'],
    ['1aeebut', 'bydd33m'],
    ['lokpo10', 'b8m588o'],
  ]),
  action: createExtractedSlot('6mn65x0', [
    ['mwx9540', 'lly6fb0'],
    ['rykr7b0', 'hhd5lx0'],
    ['18q1j80', 'bfko2p9'],
    ['1ffb9qm', 'emvk5m0'],
    ['1aeebut', 'bydd33m'],
    ['1e7v1fv', 'xco3ay0'],
    ['hbne4a0', 'bw9jzo5'],
  ]),
};
export default function App() {
  const css = combineStyle(styles);
  return (
    <article css={css.card}>
      <div css={css.row}>
        <strong>Design system</strong>
        <span css={css.badge} data-tone='brand'>merged</span>
      </div>
      <button css={css.action} aria-pressed='false'>Action</button>
    </article>
  );
}
