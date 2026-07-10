import { tw } from '../style';
import { Metric } from './Metric';
import type { ThemeOption } from './theme';

type HeroProps = {
  themeOptions: ThemeOption[];
  themeIndex: number;
  onThemeChange: (index: number) => void;
};

export function Hero(props: HeroProps) {
  return (
    <section
      css={tw({
        grid: true,
        gap: '$6',
        items: 'center',
        minH: 'auto',
        bg: '$accent',
        text: '$accentText',
        rounded: '$2xl',
        p: '$6',
        overflow: 'hidden',
        shadow: '$xl',
      }).lg({
        gridTemplateColumns: 'minmax(0, 1fr) minmax(360px, 0.82fr)',
        gap: '$10',
        minH: '$112',
        p: '$10',
      })}
    >
      <div
        css={tw({
          minW: 0,
        })}
      >
        <span
          css={tw({
            inlineFlex: true,
            items: 'center',
            gap: '$2',
            bg: 'color-mix(in oklab, currentColor 16%, transparent)',
            color: 'currentColor',
            rounded: '$full',
            px: '$3',
            py: '$1.5',
            font: '$bold',
            textSize: '$xs',
            textTransform: 'uppercase',
          })}
        >
          Tailwind dialect
        </span>
        <h1
          css={tw({
            m: '$0',
            mt: '$6',
            maxW: '48rem',
            text: '$3xl',
            font: '$black',
            leading: '$none',
            letterSpacing: 0,
          }).md({
            text: '$5xl',
          })}
        >
          Utility props, Fluentic chains, stable named tokens.
        </h1>
        <p
          css={tw({
            m: '$0',
            mt: '$4',
            maxW: '42rem',
            text: '$base',
            leading: '$relaxed',
            color: 'color-mix(in oklab, currentColor 78%, transparent)',
          }).md({
            mt: '$6',
            text: '$lg',
          })}
        >
          This example keeps Tailwind's familiar scale refs while using object fields, typed values, responsive chains,
          and runtime themes that override the same named token ids.
        </p>

        <div
          css={tw({
            flex: true,
            wrap: true,
            gap: '$3',
            mt: '$5',
          }).md({
            mt: '$6',
          })}
        >
          <button
            css={tw({
              inlineFlex: true,
              items: 'center',
              justify: 'center',
              gap: '$2',
              border: 0,
              rounded: '$full',
              bg: '$panel',
              text: '$accent',
              px: '$5',
              py: '$3',
              font: '$bold',
              cursor: 'pointer',
              boxShadow: '0 18px 40px rgb(0 0 0 / 0.16)',
              transition: 'background-color 160ms ease, transform 160ms ease',
            }).hover({
              bg: '$panelRaised',
              transform: 'translateY(-1px)',
            }).focusVisible({
              outline: '2px solid currentColor',
              outlineOffset: 3,
            }).active({
              transform: 'translateY(0)',
            })}
            type='button'
          >
            Ship dialect
          </button>
          <button
            css={tw({
              inlineFlex: true,
              items: 'center',
              justify: 'center',
              rounded: '$full',
              bg: 'color-mix(in oklab, currentColor 12%, transparent)',
              color: 'currentColor',
              border: '1px solid',
              borderColor: 'color-mix(in oklab, currentColor 34%, transparent)',
              px: '$5',
              py: '$3',
              font: '$bold',
              cursor: 'pointer',
              transition: 'background-color 160ms ease, transform 160ms ease',
            }).hover({
              bg: 'color-mix(in oklab, currentColor 18%, transparent)',
              transform: 'translateY(-1px)',
            })}
            type='button'
          >
            Inspect tokens
          </button>
        </div>

        <div
          css={tw({
            flex: true,
            wrap: true,
            gap: '$2',
            mt: '$5',
            bg: 'color-mix(in oklab, currentColor 10%, transparent)',
            border: '1px solid',
            borderColor: 'color-mix(in oklab, currentColor 18%, transparent)',
            rounded: '$full',
            p: '$1',
            w: 'fit-content',
          }).md({
            mt: '$6',
          })}
          aria-label='Theme'
        >
          {props.themeOptions.map((option, index) => (
            <button
              css={[
                props.themeIndex === index
                  ? tw({
                    rounded: '$full',
                    border: '1px solid',
                    borderColor: '$panel',
                    bg: '$panel',
                    text: '$accent',
                    px: '$3',
                    py: '$2',
                    font: '$bold',
                    cursor: 'pointer',
                    outline: 'none',
                    boxShadow: '0 10px 24px rgb(0 0 0 / 0.14)',
                  }).hover({
                    bg: '$panelRaised',
                    borderColor: '$panelRaised',
                    text: '$accent',
                  }).focusVisible({
                    outline: '2px solid',
                    outlineColor: '$panel',
                    outlineOffset: 2,
                  })
                  : tw({
                    rounded: '$full',
                    border: '1px solid',
                    borderColor: 'transparent',
                    bg: 'transparent',
                    color: 'color-mix(in oklab, currentColor 76%, transparent)',
                    px: '$3',
                    py: '$2',
                    font: '$semibold',
                    cursor: 'pointer',
                    outline: 'none',
                  }).hover({
                    color: 'currentColor',
                    bg: 'color-mix(in oklab, currentColor 12%, transparent)',
                  }).focusVisible({
                    outline: '2px solid',
                    outlineColor: '$panel',
                    outlineOffset: 2,
                  }),
              ]}
              key={option.name}
              type='button'
              aria-pressed={props.themeIndex === index}
              onClick={() => props.onThemeChange(index)}
            >
              {option.name}
            </button>
          ))}
        </div>
      </div>

      <aside
        css={tw({
          w: '100%',
          maxW: '34rem',
          justifySelf: 'end',
          grid: true,
          gap: '$4',
          bg: '$panel',
          border: '1px solid',
          borderColor: '$border',
          rounded: '$2xl',
          p: '$4',
          shadow: '$xl',
          text: '$text',
        }).md({
          p: '$6',
        })}
      >
        <div
          css={tw({
            grid: true,
            gap: '$3',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          })}
        >
          <Metric value='3' label='themes' />
          <Metric value='$4' label='spacing ref' />
          <Metric value='md' label='chain' />
        </div>
        <pre
          css={tw({
            mt: '$8',
            overflow: 'auto',
            rounded: '$2xl',
            bg: '$slate.950',
            text: '$slate.50',
            p: '$5',
            textSize: '$sm',
            leading: '$relaxed',
          })}
        >{`tw({ px: '$4', bg: '$accent' })
  .hover({ bg: '$accentHover' })
  .md({ px: '$6' })`}</pre>
      </aside>
    </section>
  );
}
