import { tw } from '../style';

type MetricProps = {
  value: string;
  label: string;
};

export function Metric(props: MetricProps) {
  return (
    <div
      css={tw({
        rounded: '$xl',
        bg: '$panelRaised',
        p: '$5',
        border: '1px solid',
        borderColor: '$border',
        minW: 0,
        shadow: '$sm',
        text: '$text',
      })}
    >
      <strong
        css={tw({
          block: true,
          text: '$3xl',
          font: '$black',
          leading: '$none',
        })}
      >
        {props.value}
      </strong>
      <span
        css={tw({
          block: true,
          mt: '$2',
          text: '$sm',
          color: 'color-mix(in oklab, currentColor 64%, transparent)',
        })}
      >
        {props.label}
      </span>
    </div>
  );
}
