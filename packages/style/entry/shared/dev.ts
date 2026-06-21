import { setBuildDevConfig } from '../../config/config/dev';
import { RUNTIME_CONFIG } from '../../config/config/runtime';
import { SIDECAR_URL_GLOBAL_SYMBOL } from '../../config/utils';
import { set } from '../../utils/object';

declare const FLUENTIC_STYLE_SIDECAR_SERVER_URL: string;
declare const FLUENTIC_STYLE_DEV_CONFIG: string;

set(
  globalThis,
  Symbol.for(SIDECAR_URL_GLOBAL_SYMBOL),
  FLUENTIC_STYLE_SIDECAR_SERVER_URL || '',
);

setBuildDevConfig(
  JSON.parse(FLUENTIC_STYLE_DEV_CONFIG),
);

RUNTIME_CONFIG.isPlugin = true;
