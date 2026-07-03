/* eslint-disable */
import { createExtractedTheme, createExtractedSlot, createExtractedToken } from "@fluentic/style/entry/prod/extract";
import { combineStyle, createTokens, type StyleProp } from '@fluentic/style';
const tokens = createTokens({
  color: {
    bg: '#ffffff',
    text: '#17201b',
    muted: '#5f6f67',
    accent: '#0f766e',
    accentText: '#ffffff'
  },
  radius: {
    card: 14,
    pill: 999
  },
  shadow: {
    card: '0 18px 40px rgba(34, 42, 37, 0.08)'
  }
}, "tokens-jde1gk0");
const lightTheme = createExtractedTheme("15x3t4k", "theme-15x3t4k-bdybgxr");
const darkTheme = createExtractedTheme("17quq42", "theme-17quq42-hl8zs80");
const styles = {
  card: createExtractedSlot("1813flw", [["mwx9540", "bia9b4a", [1, "--var-bj92ohf", createExtractedToken("tokens-jde1gk0--color--bg", "#ffffff", null), 1]], ["rykr7b0", "b3cpjgx"], ["109h4xq", "xrpcm00", [1, "--var-b02f5sx", createExtractedToken("tokens-jde1gk0--color--accent", "#0f766e", null), 1]], ["1aeebut", "dwqj3b0", [1, "--var-uo62oq0", createExtractedToken("tokens-jde1gk0--radius--card", 14, null), 1]], ["1qi6vb6", "bik45sb", [1, "--var-cw5jiv0", createExtractedToken("tokens-jde1gk0--shadow--card", "0 18px 40px rgba(34, 42, 37, 0.08)", null), 1]], ["18q1j80", "boivu1v", [1, "--var-bww5idk", createExtractedToken("tokens-jde1gk0--color--text", "#17201b", null), 1]], ["1nca60l", "jgp0up0"], ["1phh07j", "uazf000"], ["14q2jir", "bbrhkou"], ["1ffb9qm", "zll9qj0"]]),
  eyebrow: createExtractedSlot("1yuulhs", [["18q1j80", "igdb6z0", [1, "--var-iax9200", createExtractedToken("tokens-jde1gk0--color--accent", "#0f766e", null), 1]], ["1ut2mip", "cwxf320"], ["1pkhne0", "kfbuc00"], ["iah4wu0", "tckx800"], ["nde9im0", "bfgv0j6"]]),
  title: createExtractedSlot("12jpkrm", [["18q1j80", "o3hrpk0", [1, "--var-s9eo8d0", createExtractedToken("tokens-jde1gk0--color--text", "#17201b", null), 1]], ["1ut2mip", "w6vmo30"], ["1pkhne0", "kfbuc00"], ["670umo0", "xwgj4c0"], ["1r0p66z", "fy69b50"]]),
  body: createExtractedSlot("1o6sn49", [["18q1j80", "bit9nmw", [1, "--var-qmj3wr0", createExtractedToken("tokens-jde1gk0--color--muted", "#5f6f67", null), 1]], ["1ut2mip", "bpi985b"], ["670umo0", "b155prj"], ["1r0p66z", "fy69b50"]]),
  action: createExtractedSlot("hkvtdd0", [["mwx9540", "br81kq0", [1, "--var-ve52860", createExtractedToken("tokens-jde1gk0--color--accent", "#0f766e", null), 1]], ["1aeebut", "sr6xq10", [1, "--var-b587sfx", createExtractedToken("tokens-jde1gk0--radius--pill", 999, null), 1]], ["18q1j80", "lfg2mn0", [1, "--var-f7dii40", createExtractedToken("tokens-jde1gk0--color--accentText", "#ffffff", null), 1]], ["1ut2mip", "baks490"], ["1pkhne0", "kfbuc00"], ["1ffb9qm", "b8kk8ny"], ["1hznesf", "hjsx5a0"]])
};
function Preview(props: {
  theme: StyleProp;
  title: string;
}) {
  const css = combineStyle(styles);
  return <article css={[props.theme, css.card]}>
      <span css={css.eyebrow}>nested tokens</span>
      <h2 css={css.title}>{props.title}</h2>
      <p css={css.body}>
        Nested semantic tokens stay themeable while components read from one stable token tree.
      </p>
      <span css={css.action}>Theme ready</span>
    </article>;
}
export default function App() {
  return <main>
      <Preview theme={lightTheme} title='Light theme' />
      <Preview theme={darkTheme} title='Dark theme' />
    </main>;
}