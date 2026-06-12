import * as babel from '@babel/core';

export type BabelTransformArgs = {
  code: string;
  sourcemap?: BabelTransformSourceMap;
  filePath: string;
  plugins: BabelTransformPlugins;
  retainLines?: boolean;
  errorLabel?: string;
};

export type BabelTransformResult = {
  code: string;
  sourcemap: string | null;
};

export type BabelTransformPlugins = NonNullable<
  babel.TransformOptions['plugins']
>;

export type BabelTransformSourceMap =
  | NonNullable<babel.TransformOptions['inputSourceMap']>
  | string
  | null;

export function babelPlugin<State extends babel.PluginPass>(
  factory: (api: typeof babel) => babel.PluginObj<State>,
) {
  return factory;
}

export function babelTransform(args: BabelTransformArgs): BabelTransformResult | null {
  let result: babel.BabelFileResult | null = null;

  try {
    const inputSourceMap = parseInputSourceMap(args.sourcemap);

    result = babel.transformSync(args.code, {
      ...babelTransformOptions(),
      inputSourceMap,
      filename: args.filePath,
      sourceFileName: args.filePath,
      plugins: args.plugins,
      sourceMaps: true,
      generatorOpts: {
        retainLines: args.retainLines ?? false,
      },
    });
  } catch (err: unknown) {
    if (!args.errorLabel) throw err;

    throw new Error(getBabelError(err, args));
  }

  if (!result || !result.code) return null;

  return {
    code: result.code,
    sourcemap: result.map ? JSON.stringify(result.map) : null,
  };
}

export function babelTransformOptions(): babel.TransformOptions {
  return {
    configFile: false,
    babelrc: false,
    parserOpts: {
      plugins: ['typescript', 'jsx'],
      strictMode: false,
      allowImportExportEverywhere: true,
    },
  };
}

function parseInputSourceMap(sourcemap: BabelTransformSourceMap | undefined) {
  if (!sourcemap) return undefined;
  if (typeof sourcemap !== 'string') return sourcemap;

  return JSON.parse(sourcemap) as Exclude<
    babel.TransformOptions['inputSourceMap'],
    boolean | undefined
  >;
}

function getBabelError(err: unknown, args: BabelTransformArgs) {
  const babelErr = err as (Error & { codeFrame?: string; }) | null;
  const msg = babelErr instanceof Error ? babelErr.message : String(err);
  const codeFrame = babelErr?.codeFrame;
  const suffix = codeFrame ? `\n\n${codeFrame}` : '';

  return `${args.errorLabel} in ${args.filePath}:\n${msg}${suffix}`;
}
