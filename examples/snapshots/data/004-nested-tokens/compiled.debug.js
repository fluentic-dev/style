/* eslint-disable */
import { createExtractedTheme, createExtractedSlot, createExtractedToken } from "@fluentic/style/entry/prod/extract";
import { combineStyle, createTokens } from '@fluentic/style';
const _fluenticStyle = createExtractedSlot("1813flw", [["mwx9540", "background-color-x4o5xe0", [1, "--var-bj92ohf", createExtractedToken("tokens-jde1gk0--color--bg", "#ffffff", null), 1]], ["rykr7b0", "border-bln4xk0"], ["109h4xq", "border-color-o6j3xc0", [1, "--var-b02f5sx", createExtractedToken("tokens-jde1gk0--color--accent", "#0f766e", null), 1]], ["1aeebut", "radius-ab3hgw0", [1, "--var-uo62oq0", createExtractedToken("tokens-jde1gk0--radius--card", 14, null), 1]], ["1qi6vb6", "box-shadow-gqygcd0", [1, "--var-cw5jiv0", createExtractedToken("tokens-jde1gk0--shadow--card", "0 18px 40px rgba(34, 42, 37, 0.08)", null), 1]], ["18q1j80", "color-eohwby0", [1, "--var-bww5idk", createExtractedToken("tokens-jde1gk0--color--text", "#17201b", null), 1]], ["1nca60l", "display-grid-zrfo410"], ["1phh07j", "gap-ndnqyp0"], ["14q2jir", "max-width-butuml2"], ["1ffb9qm", "padding-t6ebay0"]]);
const _fluenticStyle2 = createExtractedSlot("1yuulhs", [["18q1j80", "color-bgvto2a", [1, "--var-iax9200", createExtractedToken("tokens-jde1gk0--color--accent", "#0f766e", null), 1]], ["1ut2mip", "font-size-bo354be"], ["1pkhne0", "font-800-v8puet0"], ["iah4wu0", "letter-spacing-dvqlwq0"], ["nde9im0", "text-transform-uppercase-hgombt0"]]);
const _fluenticStyle3 = createExtractedSlot("12jpkrm", [["18q1j80", "color-dzqgy60", [1, "--var-s9eo8d0", createExtractedToken("tokens-jde1gk0--color--text", "#17201b", null), 1]], ["1ut2mip", "font-size-ba36czr"], ["1pkhne0", "font-800-hm6p090"], ["670umo0", "line-height-hhnglg0"], ["1r0p66z", "margin-baup26c"]]);
const _fluenticStyle4 = createExtractedSlot("1o6sn49", [["18q1j80", "color-cvx8b80", [1, "--var-qmj3wr0", createExtractedToken("tokens-jde1gk0--color--muted", "#5f6f67", null), 1]], ["1ut2mip", "font-size-b6045ee"], ["670umo0", "line-height-bj0oknn"], ["1r0p66z", "margin-bsw6qq0"]]);
const _fluenticStyle5 = createExtractedSlot("hkvtdd0", [["mwx9540", "background-color-bvjtu0j", [1, "--var-ve52860", createExtractedToken("tokens-jde1gk0--color--accent", "#0f766e", null), 1]], ["1aeebut", "radius-bf7orp5", [1, "--var-b587sfx", createExtractedToken("tokens-jde1gk0--radius--pill", 999, null), 1]], ["18q1j80", "color-bn8ksb6", [1, "--var-f7dii40", createExtractedToken("tokens-jde1gk0--color--accentText", "#ffffff", null), 1]], ["1ut2mip", "font-size-bb5t2dr"], ["1pkhne0", "font-800-bxni3kx"], ["1ffb9qm", "padding-bif5qe4"], ["1hznesf", "width-fit-content-bw784wl"]]);
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
    card: _fluenticStyle,
    eyebrow: _fluenticStyle2,
    title: _fluenticStyle3,
    body: _fluenticStyle4,
    action: _fluenticStyle5
};
function Preview(props) {
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
      <Preview theme={lightTheme} title='Light theme'/>
      <Preview theme={darkTheme} title='Dark theme'/>
    </main>;
}
