/* eslint-disable */
import {
  createExtractedStyle,
  createExtractedTheme,
  createExtractedToken,
  createExtractedValues,
} from '@fluentic/style/entry/prod/extract';
import { combineStyle } from '@fluentic/style/entry/prod/runtime';
const accent = /*#__PURE__*/ createExtractedToken(
  'accent-1bsav5l',
  '#2563eb',
  null,
  'accent',
  '--token-accent-bmmt3w4',
);
const anonymous = /*#__PURE__*/ createExtractedToken(
  'anonymous-1bd3bhg',
  '0 18px 48px rgba(15, 23, 42, 0.14)',
  null,
  'anonymous',
  '--token-anonymous-b23vvnq',
);
const theme = {
  'background': {
    'page': /*#__PURE__*/ createExtractedToken(
      'theme-c3pmnw0--background--page',
      '#ffffff',
      null,
      'theme--background--page',
      '--token-theme--background--page-bdjkju2',
    ),
    'panel': /*#__PURE__*/ createExtractedToken(
      'theme-c3pmnw0--background--panel',
      '#f8fafc',
      null,
      'theme--background--panel',
      '--token-theme--background--panel-tur8950',
    ),
  },
  'text': {
    'body': /*#__PURE__*/ createExtractedToken(
      'theme-c3pmnw0--text--body',
      '#111827',
      null,
      'theme--text--body',
      '--token-theme--text--body-oh170e0',
    ),
    'muted': /*#__PURE__*/ createExtractedToken(
      'theme-c3pmnw0--text--muted',
      '#64748b',
      null,
      'theme--text--muted',
      '--token-theme--text--muted-ctbal00',
    ),
  },
};
const space = /*#__PURE__*/ createExtractedValues([[
  '12 | sm',
  createExtractedToken('space-yla1bj0--1gbzra2', 12, null, 'space--sm', '--token-space--sm-btx10n4'),
], ['24 | lg', createExtractedToken('space-yla1bj0--1rbqk30', 24, null, 'space--lg', '--token-space--lg-e2nksp0')]]);
const tone = /*#__PURE__*/ createExtractedValues([[
  '#ffffff | Surface',
  createExtractedToken('tone-t4adr30--l5s9j10', '#ffffff', null, 'tone--Surface', '--token-tone--Surface-skmlya0'),
], [
  '#111827; Text',
  createExtractedToken('tone-t4adr30--yj3jwy0', '#111827', null, 'tone--Text', '--token-tone--Text-bnpp9c2'),
]]);
export const lightTheme = createExtractedTheme('1r16f2a', 'theme-b856vls');
export const brandTheme = createExtractedTheme('1cpw4jw', 'theme-h8vdof0');
const styles = {
  card: createExtractedStyle([
    ['mwx9540', 'background-color--cmumn10', [1, '--var-bepsfze', theme.background.page, 1]],
    ['109h4xq', 'border-color--d5g8aa0', [1, '--var-fslapi0', accent, 1]],
    ['1qi6vb6', 'box-shadow--fdbd6w0', [1, '--var-paagj10', anonymous, 1]],
    ['18q1j80', 'color--ogr3n30', [1, '--var-dvpw3k0', theme.text.body, 1]],
    ['1r0p66z', 'margin--bat0zow', [1, '--var-j97jm70', space('12 | sm'), 1]],
    ['1ffb9qm', 'padding--ejv5v70', [1, '--var-b0ouidu', space('24 | lg'), 1]],
    ['d1c10h0', 'background-color-hover--gn58000', [1, '--var-bomxsyk', tone('#ffffff | Surface'), 1]],
    ['1qmb2bt', 'color-hover--o61f760', [1, '--var-byhryrv', tone('#111827; Text'), 1]],
  ]),
};
export default function TokenThemeNames() {
  return (
    <section css={[lightTheme, brandTheme, combineStyle(styles).card]}>
      token and theme names
    </section>
  );
}
