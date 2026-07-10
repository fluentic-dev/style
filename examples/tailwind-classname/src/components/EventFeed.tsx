import { cx } from '../style';

const events = [
  ['Named tokens', 'Stable runtime theme overrides from accent values.', 'Clean'],
  ['Optional palette', 'blue-600 and slate-50 work after palette opt-in.', 'Opt in'],
  ['Extraction', 'Static utility declarations still travel through the compiler.', 'Fast'],
] as const;

export function EventFeed() {
  return (
    <section
      css={cx(
        'grid',
        'gap-3',
        'mt-4',
      )}
    >
      {events.map(([title, text, tag]) => (
        <article
          css={cx(
            'grid',
            'gap-3',
            'items-center',
            '[grid-template-columns:12px_minmax(0,_1fr)_auto]',
            'bg-panel',
            'border-[1px_solid]',
            'border-border',
            'rounded-xl',
            'p-4',
            'shadow-sm',
            '[transition:border-color_160ms_ease,_transform_160ms_ease]',
          ).hover(
            'border-accent',
            '[transform:translateY(-1px)]',
          )}
          key={title}
        >
          <span
            css={cx(
              'block',
              'size-3',
              'rounded-full',
              'bg-accent',
            )}
          />
          <span>
            <strong
              css={cx(
                'block',
                'font-bold',
              )}
            >
              {title}
            </strong>
            <span
              css={cx(
                'block',
                'mt-1',
                'text-sm',
                '[color:color-mix(in_oklab,_currentColor_64%,_transparent)]',
              )}
            >
              {text}
            </span>
          </span>
          <span
            css={cx(
              'rounded-full',
              'bg-warning-soft',
              'text-warning',
              'px-3',
              'py-1.5',
              'text-xs',
              'font-bold',
              'whitespace-nowrap',
            )}
          >
            {tag}
          </span>
        </article>
      ))}
    </section>
  );
}
