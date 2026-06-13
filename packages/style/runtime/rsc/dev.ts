import { createElement } from 'react';
import { useEffect } from 'react';
import { SEED_STYLE_TAG_ATTR, SEED_STYLE_TAG_HREF } from './constants';
import { startRscDevObserver } from './observer';
import { getRscStyleCss } from './styleStore';

export function StyleDev() {
  useEffect(() => {
    startRscDevObserver();
  }, []);

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
