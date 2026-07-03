import type { Features, Targets, TransformOptions } from 'lightningcss';

export type CssOutputTargets = Targets | string | string[];

export type CssOutputOptions = {
  targets?: CssOutputTargets;
  vendorPrefixes?: boolean;
  minify?: boolean;
  lightningcss?: Partial<
    Omit<
      TransformOptions<Record<string, never>>,
      'code' | 'filename' | 'minify' | 'targets'
    >
  >;
};

export type PluginCssOutputOptions = boolean | CssOutputOptions;

export async function transformCssOutput(
  css: string,
  options: PluginCssOutputOptions | undefined,
  filename: string,
): Promise<string> {
  if (!css || !options) return css;

  const outputOptions = options === true ? {} : options;
  const lightningcss = await import('lightningcss');
  const targets = getLightningTargets(
    lightningcss.browserslistToTargets,
    outputOptions.targets ?? 'defaults',
  );
  const exclude = getLightningExclude(lightningcss.Features, outputOptions);

  const result = lightningcss.transform({
    filename,
    code: new TextEncoder().encode(css),
    ...outputOptions.lightningcss,
    targets,
    minify: outputOptions.minify,
    exclude,
  });

  return new TextDecoder().decode(result.code);
}

function getLightningTargets(
  browserslistToTargets: (browserslist: string[]) => Targets,
  targets: CssOutputTargets | undefined,
): Targets | undefined {
  if (!targets) return undefined;
  if (typeof targets === 'string') return browserslistToTargets([targets]);
  if (Array.isArray(targets)) return browserslistToTargets(targets);
  return targets;
}

function getLightningExclude(
  features: typeof Features,
  options: CssOutputOptions,
) {
  const exclude = options.lightningcss?.exclude ?? 0;

  return options.vendorPrefixes === false
    ? exclude | features.VendorPrefixes
    : exclude;
}
