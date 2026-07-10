import { style } from '@fluentic/style';
import { Colors, tw } from './style';

const topLevelFeatured = !!(window as any).snapshotFeatured;

export const topLevelDynamic = tw({
  bg: topLevelFeatured ? '$blue.600' : '$emerald.600',
  border: '1px solid',
  borderColor: topLevelFeatured ? '$accent' : '$border',
  p: '$4',
});

const plans = [
  ['Starter', Colors.blue[600]],
  ['Scale', Colors.emerald[600]],
] as const;

export function TailwindRuntimeTransform({
  color = 'purple',
}: {
  color?: string;
}) {
  const plainDynamic = style({
    color,
    backgroundColor: 'white',
  }).hover({
    borderColor: color,
  });

  return (
    <section css={tw({ grid: true, gap: '$4' })}>
      {plans.map(([title, swatch]) => {
        const featured = title === 'Scale';

        return (
          <article
            css={[
              plainDynamic,
              tw({
                flex: true,
                direction: 'col',
                gap: '$4',
                bg: featured ? '$accentSoft' : '$panel',
                border: '1px solid',
                borderColor: featured ? '$accent' : '$border',
                minH: '$card',
                p: '$5',
              }).hover({
                bg: featured ? '$panelRaised' : '$panel',
                borderColor: featured ? '$accentHover' : '$accent',
              }),
            ]}
            key={title}
          >
            <span css={tw({ block: true, size: '$12', bg: swatch })} />
            {title}
          </article>
        );
      })}
    </section>
  );
}
