import { cx } from '../style';
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
      css={cx(
        'grid',
        'gap-6',
        'items-center',
        'bg-accent',
        'text-accent-text',
        'rounded-2xl',
        'p-6',
        'overflow-hidden',
        'shadow-xl',
      ).lg(
        '[grid-template-columns:minmax(0,_1fr)_minmax(360px,_0.82fr)]',
        'gap-10',
        'min-h-112',
        'p-10',
      )}
    >
      <div css={cx('min-w-0')}>
        <span
          css={cx(
            'inline-flex',
            'items-center',
            'gap-2',
            '[background-color:color-mix(in_oklab,_currentColor_16%,_transparent)]',
            '[color:currentColor]',
            'rounded-full',
            'px-3',
            'py-1.5',
            'font-bold',
            'text-xs',
            '[text-transform:uppercase]',
          )}
        >
          Tailwind dialect
        </span>
        <h1
          css={cx(
            'm-0',
            'mt-6',
            'max-w-[48rem]',
            'text-3xl',
            'font-black',
            'leading-none',
            '[letter-spacing:0]',
          ).md('text-5xl')}
        >
          Utility classes, Fluentic chains, stable named tokens.
        </h1>
        <p
          css={cx(
            'm-0',
            'mt-4',
            'max-w-[42rem]',
            'text-base',
            'leading-relaxed',
            '[color:color-mix(in_oklab,_currentColor_78%,_transparent)]',
          ).md(
            'mt-6',
            'text-lg',
          )}
        >
          This example keeps Tailwind's familiar class-name surface while using typed Fluentic chains, responsive
          selectors, and runtime themes that override the same named token ids.
        </p>

        <div
          css={cx(
            'flex',
            'flex-wrap',
            'gap-3',
            'mt-5',
          ).md('mt-6')}
        >
          <button
            css={cx(
              'inline-flex',
              'items-center',
              'justify-center',
              'gap-2',
              'border-0',
              'rounded-full',
              'bg-panel',
              'text-accent',
              'px-5',
              'py-3',
              'font-bold',
              'cursor-pointer',
              '[box-shadow:0_18px_40px_rgb(0_0_0_/_0.16)]',
              '[transition:background-color_160ms_ease,_transform_160ms_ease]',
            ).hover(
              'bg-panel-raised',
              '[transform:translateY(-1px)]',
            ).focusVisible(
              '[outline:2px_solid_currentColor]',
              '[outline-offset:3px]',
            ).active('[transform:translateY(0)]')}
            type='button'
          >
            Ship dialect
          </button>
          <button
            css={cx(
              'inline-flex',
              'items-center',
              'justify-center',
              'rounded-full',
              '[background-color:color-mix(in_oklab,_currentColor_12%,_transparent)]',
              '[color:currentColor]',
              'border-[1px_solid]',
              '[border-color:color-mix(in_oklab,_currentColor_34%,_transparent)]',
              'px-5',
              'py-3',
              'font-bold',
              'cursor-pointer',
              '[transition:background-color_160ms_ease,_transform_160ms_ease]',
            ).hover(
              '[background-color:color-mix(in_oklab,_currentColor_18%,_transparent)]',
              '[transform:translateY(-1px)]',
            )}
            type='button'
          >
            Inspect tokens
          </button>
        </div>

        <div
          css={cx(
            'flex',
            'flex-wrap',
            'gap-2',
            'mt-5',
            '[background-color:color-mix(in_oklab,_currentColor_10%,_transparent)]',
            'border-[1px_solid]',
            '[border-color:color-mix(in_oklab,_currentColor_18%,_transparent)]',
            'rounded-full',
            'p-1',
            'w-fit',
          ).md('mt-6')}
          aria-label='Theme'
        >
          {props.themeOptions.map((option, index) => {
            const active = props.themeIndex === index;

            return (
              <button
                css={active
                  ? cx(
                    'rounded-full',
                    'border-[1px_solid]',
                    'border-panel',
                    'bg-panel',
                    'text-accent',
                    'px-3',
                    'py-2',
                    'font-bold',
                    'cursor-pointer',
                    'outline-none',
                    '[box-shadow:0_10px_24px_rgb(0_0_0_/_0.14)]',
                  ).hover(
                    'bg-panel-raised',
                    'border-panel-raised',
                    'text-accent',
                  ).focusVisible(
                    'outline-panel',
                    '[outline:2px_solid]',
                    '[outline-offset:2px]',
                  )
                  : cx(
                    'rounded-full',
                    'border-[1px_solid]',
                    'border-transparent',
                    'bg-transparent',
                    '[color:color-mix(in_oklab,_currentColor_76%,_transparent)]',
                    'px-3',
                    'py-2',
                    'font-semibold',
                    'cursor-pointer',
                    'outline-none',
                  ).hover(
                    '[color:currentColor]',
                    '[background-color:color-mix(in_oklab,_currentColor_12%,_transparent)]',
                  ).focusVisible(
                    'outline-panel',
                    '[outline:2px_solid]',
                    '[outline-offset:2px]',
                  )}
                key={option.name}
                type='button'
                aria-pressed={active}
                onClick={() => props.onThemeChange(index)}
              >
                {option.name}
              </button>
            );
          })}
        </div>
      </div>

      <aside
        css={cx(
          'w-full',
          'max-w-[34rem]',
          'justify-self-end',
          'grid',
          'gap-4',
          'bg-panel',
          'border-[1px_solid]',
          'border-border',
          'rounded-2xl',
          'p-4',
          'shadow-xl',
          'text-fg',
        ).md('p-6')}
      >
        <div
          css={cx(
            'grid',
            'gap-3',
            '[grid-template-columns:repeat(3,_minmax(0,_1fr))]',
          )}
        >
          <Metric value='3' label='themes' />
          <Metric value='px-4' label='spacing ref' />
          <Metric value='md' label='chain' />
        </div>
        <pre
          css={cx(
            'm-0',
            'mt-8',
            'overflow-auto',
            'rounded-2xl',
            'bg-slate-950',
            'text-slate-50',
            'p-5',
            'text-sm',
            'leading-relaxed',
          )}
        >{`cx('px-4', 'bg-accent')
  .hover('bg-accent-hover')
  .md('px-6')`}</pre>
      </aside>
    </section>
  );
}
