import { bindScope, style, combineStyle, type CombinedStyle, type CssTheme } from '@fluentic/style';

const parentStyles = {
  shell: style({
    display: 'grid',
    gap: 12,
    padding: 16,
  }),
};

const childStyles = {
  root: style.slot({
    color: 'black',
    padding: 8,
  }),
  label: style.slot({
    fontWeight: 700,
  }),
};

const childTheme = style.scope([
  childStyles.root({
    color: 'purple',
  }),
  childStyles.label({
    color: 'teal',
  }),
]);

const combineChildStyle = combineStyle.for(childStyles);

type ChildStyle = CombinedStyle<typeof combineChildStyle>;

function Child(props: { styles?: ChildStyle; theme?: CssTheme }) {
  const css = combineChildStyle(
    props.styles,
    ...bindScope(childStyles.root, props.theme),
  );

  return (
    <article css={css.root}>
      <span css={css.label}>Explicit scope</span>
    </article>
  );
}

export default function Parent() {
  const parentCss = combineStyle(parentStyles);
  const childCss = combineChildStyle(...bindScope(childStyles.root, childTheme));

  return (
    <section css={parentCss.shell}>
      <Child styles={childCss} />
    </section>
  );
}
