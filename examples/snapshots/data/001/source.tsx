import { bindScope, combineStyle, createToken, style } from '@fluentic/style';
import bg from './bg.png';
import { Fonts } from './constants';

const token = createToken('blue');

const styles = {
  container: style.slot({
    fontFamily: Fonts.Default,
    width: [1, 18],
    display: style.priority('flex', 1),
  }).hover({
    width: 20,
    backgroundColor: token,
  }),
  container2: style.slot({
    width: 20,
    display: 'none',
  }).hover({
    width: 22,
  }),
  text: style.slot({
    color: 'red',
  }),
  icon: style.slot({
    opacity: 0.5,
  }),
};

export const extraStyles = {
  container: style({
    backgroundColor: 'coral',
    backgroundImage: 'url(' + bg + ')',
  }),
};

const scope = style
  .scope([
    styles.container({
      color: 'pink',
    }),
    styles.text({
      border: 'pink',
    }),
    styles.icon({
      backgroundColor: 'pink',
    }),
  ]).hover([
    styles.container({
      width: 20,
    }).active({
      outlineColor: 'yellow',
    }),
    styles.text({
      color: 'blue',
    }),
    styles.icon({
      opacity: 0.8,
    }),
  ]).media('(max-width: 600px)', [
    styles.container({
      width: 16,
    }),
    styles.text({
      color: 'green',
    }),
    styles.icon({
      opacity: 0.3,
    }),
  ]);

export default () => {
  const css = combineStyle(styles, bindScope(styles.container, scope));
  const extraCss = combineStyle(extraStyles);

  return (
    <div css={[css.container, extraCss.container]}>
      <div css={css.text}>text</div>
      <div css={css.icon}>icon</div>
    </div>
  );
};
