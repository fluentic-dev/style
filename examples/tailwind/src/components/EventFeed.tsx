import { tw } from '../style';

const events = [
  ['Named tokens', 'Stable runtime theme overrides from $accent values.', 'Clean'],
  ['Optional palette', '$blue.600 and $slate.50 work after palette opt-in.', 'Opt in'],
  ['Extraction', 'Static utility declarations still travel through the compiler.', 'Fast'],
] as const;

export function EventFeed() {
  return (
    <section
      css={tw({
        grid: true,
        gap: '$3',
        mt: '$4',
      })}
    >
      {events.map(([title, text, tag]) => (
        <article
          css={tw({
            grid: true,
            gap: '$3',
            items: 'center',
            gridTemplateColumns: '12px minmax(0, 1fr) auto',
            bg: '$panel',
            border: '1px solid',
            borderColor: '$border',
            rounded: '$xl',
            p: '$4',
            shadow: '$sm',
            transition: 'border-color 160ms ease, transform 160ms ease',
          }).hover({
            borderColor: '$accent',
            transform: 'translateY(-1px)',
          })}
          key={title}
        >
          <span
            css={tw({
              block: true,
              size: '$3',
              rounded: '$full',
              bg: '$accent',
            })}
          />
          <span>
            <strong
              css={tw({
                block: true,
                font: '$bold',
              })}
            >
              {title}
            </strong>
            <span
              css={tw({
                block: true,
                mt: '$1',
                text: '$sm',
                color: 'color-mix(in oklab, currentColor 64%, transparent)',
              })}
            >
              {text}
            </span>
          </span>
          <span
            css={tw({
              rounded: '$full',
              bg: '$warningSoft',
              text: '$warning',
              px: '$3',
              py: '$1.5',
              textSize: '$xs',
              font: '$bold',
              whiteSpace: 'nowrap',
            })}
          >
            {tag}
          </span>
        </article>
      ))}
    </section>
  );
}
