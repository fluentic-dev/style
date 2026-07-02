import { bindScope, combineStyle } from '@fluentic/style';
import type { StyleTheme } from '@fluentic/style';
import styles from './styles';

type Metric = {
  label: string;
  value: string;
};

type CardProps = {
  label: string;
  metrics: readonly Metric[];
  tag: string;
  theme?: StyleTheme;
};

export function Card(props: CardProps) {
  const css = combineStyle(
    styles,
    bindScope(styles.root, props.theme),
  );

  return (
    <section css={css.root}>
      <span css={css.chrome} aria-hidden />
      <div css={css.header}>
        <span css={css.badge}>{props.label}</span>
        <span css={css.badge}>{props.tag}</span>
      </div>
      <div css={css.metricGrid}>
        {props.metrics.map((metric) => (
          <article css={css.metric} key={metric.label}>
            <span css={css.metricLabel}>{metric.label}</span>
            <strong css={css.metricValue}>{metric.value}</strong>
          </article>
        ))}
      </div>
      <div css={css.actionRow}>
        <button css={css.primaryAction} type='button'>Publish</button>
        <button css={css.secondaryAction} type='button'>Compare</button>
      </div>
    </section>
  );
}
