import { cx } from '../style';

const planStyle = {
  default: cx(
    'flex',
    'flex-col',
    'gap-4',
    'bg-panel',
    'border-[1px_solid]',
    'border-border',
    'rounded-2xl',
    'p-5',
    'min-h-card',
    'shadow-lg',
    'overflow-hidden',
    '[transition:background-color_160ms_ease,_border-color_160ms_ease,_transform_160ms_ease]',
  ).hover(
    'bg-panel',
    'border-accent',
    '[transform:translateY(-3px)]',
  ),
  featured: cx(
    'flex',
    'flex-col',
    'gap-4',
    'bg-accent-soft',
    'border-[1px_solid]',
    'border-accent',
    'rounded-2xl',
    'p-5',
    'min-h-card',
    'shadow-lg',
    'overflow-hidden',
    '[transition:background-color_160ms_ease,_border-color_160ms_ease,_transform_160ms_ease]',
  ).hover(
    'bg-panel-raised',
    'border-accent-hover',
    '[transform:translateY(-3px)]',
  ),
};

const swatchStyle = {
  blue: cx(
    'block',
    'size-12',
    'rounded-2xl',
    'shrink-0',
    '[box-shadow:0_16px_32px_rgb(0_0_0_/_0.14)]',
    'bg-blue-600',
  ),
  emerald: cx(
    'block',
    'size-12',
    'rounded-2xl',
    'shrink-0',
    '[box-shadow:0_16px_32px_rgb(0_0_0_/_0.14)]',
    'bg-emerald-600',
  ),
  violet: cx(
    'block',
    'size-12',
    'rounded-2xl',
    'shrink-0',
    '[box-shadow:0_16px_32px_rgb(0_0_0_/_0.14)]',
    'bg-violet-600',
  ),
};

const plans = [
  ['Starter', '$24', 'For teams proving the first flow', planStyle.default, swatchStyle.blue],
  ['Scale', '$68', 'For systems that need live theming', planStyle.featured, swatchStyle.emerald],
  ['Enterprise', '$144', 'For multi-brand product surfaces', planStyle.default, swatchStyle.violet],
] as const;

export function Plans() {
  return (
    <section
      css={cx(
        'grid',
        'gap-4',
        'mt-6',
      ).lg('[grid-template-columns:repeat(3,_minmax(0,_1fr))]')}
    >
      {plans.map(([title, price, body, cardStyle, swatch]) => (
          <article
            css={cardStyle}
            key={title}
          >
            <span css={swatch} />
            <div>
              <h2
                css={cx(
                  'm-0',
                  'text-xl',
                  'font-black',
                  '[letter-spacing:0]',
                )}
              >
                {title}
              </h2>
              <p
                css={cx(
                  'm-0',
                  'text-sm',
                  'leading-relaxed',
                  '[color:color-mix(in_oklab,_currentColor_66%,_transparent)]',
                )}
              >
                {body}
              </p>
            </div>
            <strong
              css={cx(
                'mt-auto',
                'text-3xl',
                'font-black',
                'leading-none',
                '[letter-spacing:0]',
              )}
            >
              {price}
            </strong>
          </article>
        ))}
    </section>
  );
}
