import { createElement, useState } from 'react';
import { useEffect } from 'react';
import { enableStyleDevUtils, type StyleDevUtilsOptions } from '../../dev';
import { SEED_STYLE_TAG_ATTR, SEED_STYLE_TAG_HREF } from './constants';
import { startRscDevObserver } from './observer';
import { getRscStyleCss } from './styleStore';

type StyleDevProps = StyleDevUtilsOptions & {
  enableStyleDevUtils?: StyleDevUtilsOptions | boolean;
};

export function StyleDev(props: StyleDevProps) {
  const [devUtils] = useState(() => props.enableStyleDevUtils ?? true);

  useEffect(() => {
    startRscDevObserver();

    if (devUtils) {
      enableStyleDevUtils(devUtils === true ? {} : devUtils);
    }
  }, [devUtils]);

  const css = getRscStyleCss();
  if (!css) return null;

  return createElement('style', {
    [SEED_STYLE_TAG_ATTR]: '',
    href: SEED_STYLE_TAG_HREF,
    precedence: 'default',
    dangerouslySetInnerHTML: { __html: css },
    suppressHydrationWarning: true,
  });
}
