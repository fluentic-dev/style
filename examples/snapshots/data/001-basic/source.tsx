import { bindScope, combineStyle, createToken, style } from '@fluentic/style';
import bg from './bg.png';
import { ContainerWidth, Fonts, IconAlpha } from './constants';

const compact = !!(window as any)['compact'];
const density = compact ? 8 : 12;

const dynamicStyle = style({
  gap: density,
  padding: density * 2,
});

enum TextTone {
  Danger = 'red',
  Hover = 'blue',
  Mobile = 'green',
}

const token = createToken('blue');

const containerBase = style.raw({
  gap: density * 4,
});

const containerHover = style.raw({
  gap: density * 3,
  backgroundColor: token,
});

const styles = {
  container: style.slot({
    fontFamily: Fonts.Default,
    width: [1, ContainerWidth.Base],
    display: style.value('flex', 1),
    ...containerBase,
  }).hover({
    width: ContainerWidth.Hover,
    ...containerHover,
  }),
  container2: style.slot({
    width: 20,
    display: 'none',
  }).hover({
    width: 22,
  }),
  text: style.slot({
    color: TextTone.Danger,
  }),
  icon: style.slot({
    opacity: IconAlpha.Rest,
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
      width: ContainerWidth.Hover,
    }).active({
      outlineColor: 'yellow',
    }),
    styles.text({
      color: TextTone.Hover,
    }),
    styles.icon({
      opacity: IconAlpha.Hover,
    }),
  ]).media('(max-width: 600px)', [
    styles.container({
      width: ContainerWidth.Compact,
    }),
    styles.text({
      color: TextTone.Mobile,
    }),
    styles.icon({
      opacity: IconAlpha.Mobile,
    }),
  ]);

export default ({ color = 'purple' }: { color?: string; }) => {
  const localStatic = style({
    padding: 4,
  }).hover({
    padding: 8,
  });

  const localDynamic = style({
    color,
    backgroundColor: 'white',
  }).hover({
    borderColor: color,
  }).merge(dynamicStyle);

  const css = combineStyle(styles, bindScope(styles.container, scope));
  const extraCss = combineStyle(extraStyles);

  console.log('containerHover:', containerHover);

  return (
    <div css={[css.container, extraCss.container, localStatic, localDynamic]}>
      <div css={css.text}>text</div>
      <div css={css.icon}>icon</div>
    </div>
  );
};
