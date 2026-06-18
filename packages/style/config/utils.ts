export const SIDECAR_URL_GLOBAL_SYMBOL = 'FLUENTIC_STYLE_SIDECAR_URL';

export function getCacheTTL(cache: boolean | number) {
  return cache === true ? 300_000 : cache === false ? 0 : Math.max(cache, 0);
}
