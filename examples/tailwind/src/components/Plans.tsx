import { tw } from '../style';
import { Colors } from '../style/colors';

const plans = [
  ['Starter', '$24', 'For teams proving the first flow', Colors.blue[600]],
  ['Scale', '$68', 'For systems that need live theming', Colors.emerald[600]],
  ['Enterprise', '$144', 'For multi-brand product surfaces', Colors.violet[600]],
] as const;

export function Plans() {
  return (
    <section
      css={tw({
        grid: true,
        gap: '$4',
        mt: '$6',
      }).lg({
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
      })}
    >
      {plans.map(([title, price, body, swatch]) => {
        const featured = title === 'Scale';

        return (
          <article
            css={tw({
              flex: true,
              direction: 'col',
              gap: '$4',
              bg: featured ? '$accentSoft' : '$panel',
              border: '1px solid',
              borderColor: featured ? '$accent' : '$border',
              rounded: '$2xl',
              p: '$5',
              minH: '$card',
              shadow: '$lg',
              overflow: 'hidden',
              transition: 'background-color 160ms ease, border-color 160ms ease, transform 160ms ease',
            }).hover({
              bg: featured ? '$panelRaised' : '$panel',
              borderColor: featured ? '$accentHover' : '$accent',
              transform: 'translateY(-3px)',
            })}
            key={title}
          >
            <span
              css={[
                tw({
                  block: true,
                  size: '$12',
                  rounded: '$2xl',
                  flexShrink: 0,
                  boxShadow: '0 16px 32px rgb(0 0 0 / 0.14)',
                }),
                tw({ bg: swatch }),
              ]}
            />
            <div>
              <h2
                css={tw({
                  m: '$0',
                  text: '$xl',
                  font: '$black',
                  letterSpacing: 0,
                })}
              >
                {title}
              </h2>
              <p
                css={tw({
                  m: '$0',
                  text: '$sm',
                  leading: '$relaxed',
                  color: 'color-mix(in oklab, currentColor 66%, transparent)',
                })}
              >
                {body}
              </p>
            </div>
            <strong
              css={tw({
                mt: 'auto',
                text: '$3xl',
                font: '$black',
                leading: '$none',
                letterSpacing: 0,
              })}
            >
              {price}
            </strong>
          </article>
        );
      })}
    </section>
  );
}
