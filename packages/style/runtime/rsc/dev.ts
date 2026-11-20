import { ServerInsertedHTMLContext, useServerInsertedHTML } from 'next/navigation';
import { createElement, useContext, useEffect, useState } from 'react';
import { enableStyleDevUtils, type StyleDevUtilsOptions } from '../../dev';
import type { SheetRule } from '../../sheet';
import { globalData } from '../../utils/global';
import { hashString } from '../../utils/hash';
import { SEED_STYLE_TAG_ATTR, SEED_STYLE_TAG_HREF } from './constants';
import type { GlobalRuleBatch } from './globalSheet';
import { startRscDevObserver } from './observer';
import { getRscStyleRules, serializeRscRules } from './styleStore';

type StyleDevProps = StyleDevUtilsOptions & {
  enableStyleDevUtils?: StyleDevUtilsOptions | boolean;
  /** @internal Carries RSC request globals into Next's HTML renderer. */
  globalRules?: GlobalRuleBatch[];
  /** @internal Registers seed data without another observer or devtools instance. */
  seedOnly?: boolean;
};
type SeedState = { css: string; globals: Map<string, SheetRule[]>; };
// Next supplies one registrar per response, shared by all SSR client components.
// A WeakMap bridges the RSC/SSR renderers without mixing concurrent requests.
const requestSeeds = globalData('runtime.rsc.htmlSeeds', () => new WeakMap<object, SeedState>());

export function StyleDev(props: StyleDevProps) {
  const registrar = useContext(ServerInsertedHTMLContext);
  const [fallback] = useState<SeedState>(() => ({ css: '', globals: new Map() }));
  let seedState = registrar ? requestSeeds.get(registrar) : fallback;
  if (!seedState) {
    seedState = fallback;
    requestSeeds.set(registrar!, seedState);
  }
  for (const batch of props.globalRules ?? []) seedState.globals.set(batch.owner, batch.rules);
  const [devUtils] = useState(() => props.enableStyleDevUtils ?? true);

  useEffect(() => {
    if (props.seedOnly) return;
    startRscDevObserver();
    if (devUtils) enableStyleDevUtils(devUtils === true ? {} : devUtils);
  }, [devUtils, props.seedOnly]);

  useServerInsertedHTML(() => {
    const css = serializeRscRules([...getRscStyleRules(), ...[...seedState.globals.values()].flat()]);
    if (!css || css === seedState.css) return null;
    seedState.css = css;
    return createElement('style', {
      [SEED_STYLE_TAG_ATTR]: '',
      href: SEED_STYLE_TAG_HREF + '-' + hashString(css),
      precedence: 'default',
      dangerouslySetInnerHTML: { __html: css.replace(/<\/style/gi, '<\\/style') },
      suppressHydrationWarning: true,
    });
  });
  return null;
}
