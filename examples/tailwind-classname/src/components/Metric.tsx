import { cx } from '../style';

type MetricProps = {
  value: string;
  label: string;
};

export function Metric(props: MetricProps) {
  return (
    <div
      css={cx(
        'rounded-xl',
        'bg-panel-raised',
        'p-5',
        'border-[1px_solid]',
        'border-border',
        'min-w-0',
        'shadow-sm',
        'text-fg',
      )}
    >
      <strong
        css={cx(
          'block',
          'text-3xl',
          'font-black',
          'leading-none',
        )}
      >
        {props.value}
      </strong>
      <span
        css={cx(
          'block',
          'mt-2',
          'text-sm',
          '[color:color-mix(in_oklab,_currentColor_64%,_transparent)]',
        )}
      >
        {props.label}
      </span>
    </div>
  );
}
