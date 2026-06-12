import { createElement } from 'react';
import { useEffect } from 'react';
import { CSS_DEV_STYLE_ATTR, CSS_DEV_STYLE_HREF } from './constants';
import { startRscDevObserver } from './observer';
import { getRscDevSeedCss } from './seed';

export function StyleDev() {
  useEffect(() => {
    startRscDevObserver();
  }, []);

  const css = getRscDevSeedCss();
  if (!css) return null;

  return createElement('style', {
    [CSS_DEV_STYLE_ATTR]: '',
    href: CSS_DEV_STYLE_HREF,
    precedence: 'default',
    dangerouslySetInnerHTML: { __html: css },
    suppressHydrationWarning: true,
  });
}
