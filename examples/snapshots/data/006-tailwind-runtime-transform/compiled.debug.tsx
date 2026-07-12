/* eslint-disable */
import { createExtractedStyle, createExtractedToken, withTokens } from '@fluentic/style/entry/prod/extract';
import { Colors } from './style';
const _fluenticToken = createExtractedToken('14c7omo', null);
const _fluenticToken2 = createExtractedToken('14m7abn', null);
const _fluenticStyle = createExtractedStyle([['18q1j80', 'color--lm9gi00', [1, '--var-o2cnu50', _fluenticToken, 1]], [
  'mwx9540',
  'background-color-white--h44xih0',
], ['1omoamz', 'border-color-hover--bfptscc', [1, '--var-cns3eo0', _fluenticToken2, 1]]]);
const _fluenticStyle2 = createExtractedStyle([['1nca60l', 'display-grid--jgp0up0'], ['1phh07j', 'gap--j550dy0']]);
const _fluenticToken3 = createExtractedToken('14w6w0m', null);
const _fluenticToken4 = createExtractedToken('1566hpl', null);
const _fluenticToken5 = createExtractedToken('15g63ek', null);
const _fluenticToken6 = createExtractedToken('15q5p3j', null);
const _fluenticStyle3 = createExtractedStyle([
  ['1nca60l', 'display-flex--fruelm0'],
  ['1a6hjt3', 'flex-column--oez5rp0'],
  ['1phh07j', 'gap--j550dy0'],
  ['mwx9540', 'background-color--m1p2pp0', [1, '--var-g9wr0z0', _fluenticToken3, 1]],
  ['rykr7b0', 'border--b3cpjgx'],
  ['109h4xq', 'border-color--g0t7pm0', [1, '--var-n5tknl0', _fluenticToken4, 1]],
  ['6hmhi80', 'min-height--bc7gmho'],
  ['1ffb9qm', 'padding--yy6azw0'],
  ['d1c10h0', 'background-color-hover--c4ao1t0', [1, '--var-qh45190', _fluenticToken5, 1]],
  ['1omoamz', 'border-color-hover--d64fkt0', [1, '--var-bl6zn73', _fluenticToken6, 1]],
]);
const _fluenticToken7 = createExtractedToken('1605asi', null);
const _fluenticStyle4 = createExtractedStyle([['1nca60l', 'display-block--irneu20'], ['1hznesf', 'width--m72p5c0'], [
  '2521q20',
  'height--bpm7y8x',
], ['mwx9540', 'background-color--btdi9x7', [1, '--var-rvckzo0', _fluenticToken7, 1]]]);
const topLevelFeatured = !!(window as any).snapshotFeatured;
export const topLevelDynamic = createExtractedStyle([
  ['mwx9540', 'background-color--b0bjfj4', [
    1,
    '--var-gcu4580',
    topLevelFeatured
      ? 'var(--token-snapshot-tailwind-color-blue-600-a6vq1y0, #2563eb)'
      : 'var(--token-snapshot-tailwind-color-emerald-600-bkbhka4, #059669)',
    1,
  ]],
  ['rykr7b0', 'border--b3cpjgx'],
  ['109h4xq', 'border-color--fve7pl0', [
    1,
    '--var-i7awe00',
    topLevelFeatured
      ? 'var(--token-snapshot-tailwind-color-accent-b7ev0p7, #0f766e)'
      : 'var(--token-snapshot-tailwind-color-border-bai0r5n, #d8e5e0)',
    1,
  ]],
  ['1ffb9qm', 'padding--o7dkd70'],
]);
const plans = [['Starter', Colors.blue[600]], ['Scale', Colors.emerald[600]]] as const;
export function TailwindRuntimeTransform({
  color = 'purple',
}: {
  color?: string;
}) {
  const plainDynamic = withTokens(_fluenticStyle, [_fluenticToken(color), _fluenticToken2(color)]);
  return (
    <section css={_fluenticStyle2}>
      {plans.map(([title, swatch]) => {
        const featured = title === 'Scale';
        return (
          <article
            css={[
              plainDynamic,
              withTokens(_fluenticStyle3, [
                _fluenticToken3(
                  featured
                    ? 'var(--token-snapshot-tailwind-color-accentSoft-b30u4on, #d9f4ee)'
                    : 'var(--token-snapshot-tailwind-color-panel-bweossh, #ffffff)',
                ),
                _fluenticToken4(
                  featured
                    ? 'var(--token-snapshot-tailwind-color-accent-b7ev0p7, #0f766e)'
                    : 'var(--token-snapshot-tailwind-color-border-bai0r5n, #d8e5e0)',
                ),
                _fluenticToken5(
                  featured
                    ? 'var(--token-snapshot-tailwind-color-panelRaised-b0vvzg1, #eef7f4)'
                    : 'var(--token-snapshot-tailwind-color-panel-bweossh, #ffffff)',
                ),
                _fluenticToken6(
                  featured
                    ? 'var(--token-snapshot-tailwind-color-accentHover-kgd6ob0, #115e59)'
                    : 'var(--token-snapshot-tailwind-color-accent-b7ev0p7, #0f766e)',
                ),
              ]),
            ]}
            key={title}
          >
            <span css={withTokens(_fluenticStyle4, [_fluenticToken7(swatch)])} />
            {title}
          </article>
        );
      })}
    </section>
  );
}
