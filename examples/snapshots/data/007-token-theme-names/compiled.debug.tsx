/* eslint-disable */
import { combineStyle, createToken, createTokens, createValues } from '@fluentic/style';
import { createExtractedStyle, createExtractedTheme, createExtractedToken } from '@fluentic/style/entry/prod/extract';
const accent = createToken('#2563eb', 'accent-1bsav5l');
const anonymous = createToken('0 18px 48px rgba(15, 23, 42, 0.14)', 'anonymous-1bd3bhg');
const theme = createTokens({
  background: {
    page: '#ffffff',
    panel: '#f8fafc',
  },
  text: {
    body: '#111827',
    muted: '#64748b',
  },
}, 'theme-c3pmnw0');
const space = createValues(Number, ['12 | sm', '24 | lg'], 'space-yla1bj0');
const tone = createValues(['#ffffff | Surface', '#111827; Text'], 'tone-t4adr30');
export const lightTheme = createExtractedTheme('1r16f2a', 'theme-b856vls');
export const brandTheme = createExtractedTheme('1cpw4jw', 'theme-h8vdof0');
const styles = {
  card: createExtractedStyle([['mwx9540', 'background-color--cmumn10', [
    1,
    '--var-bepsfze',
    createExtractedToken(
      'theme-c3pmnw0--background--page',
      '#ffffff',
      null,
      'theme--background--page',
      '--token-theme--background--page-bdjkju2',
    ),
    1,
  ]], ['109h4xq', 'border-color--d5g8aa0', [
    1,
    '--var-fslapi0',
    createExtractedToken('accent-1bsav5l', '#2563eb', null, 'accent', '--token-accent-bmmt3w4'),
    1,
  ]], ['1qi6vb6', 'box-shadow--fdbd6w0', [
    1,
    '--var-paagj10',
    createExtractedToken(
      'anonymous-1bd3bhg',
      '0 18px 48px rgba(15, 23, 42, 0.14)',
      null,
      'anonymous',
      '--token-anonymous-b23vvnq',
    ),
    1,
  ]], ['18q1j80', 'color--ogr3n30', [
    1,
    '--var-dvpw3k0',
    createExtractedToken(
      'theme-c3pmnw0--text--body',
      '#111827',
      null,
      'theme--text--body',
      '--token-theme--text--body-oh170e0',
    ),
    1,
  ]], ['1r0p66z', 'margin--bat0zow', [
    1,
    '--var-j97jm70',
    createExtractedToken('space-yla1bj0--1gbzra2', 12, null, 'space--sm', '--token-space--sm-btx10n4'),
    1,
  ]], ['1ffb9qm', 'padding--ejv5v70', [
    1,
    '--var-b0ouidu',
    createExtractedToken('space-yla1bj0--1rbqk30', 24, null, 'space--lg', '--token-space--lg-e2nksp0'),
    1,
  ]], ['d1c10h0', 'background-color-hover--gn58000', [
    1,
    '--var-bomxsyk',
    createExtractedToken('tone-t4adr30--l5s9j10', '#ffffff', null, 'tone--Surface', '--token-tone--Surface-skmlya0'),
    1,
  ]], ['1qmb2bt', 'color-hover--o61f760', [
    1,
    '--var-byhryrv',
    createExtractedToken('tone-t4adr30--yj3jwy0', '#111827', null, 'tone--Text', '--token-tone--Text-bnpp9c2'),
    1,
  ]]]),
};
export default function TokenThemeNames() {
  return (
    <section css={[lightTheme, brandTheme, combineStyle(styles).card]}>
      token and theme names
    </section>
  );
}
