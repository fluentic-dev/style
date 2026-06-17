import type { NextConfig } from 'next';
import type { PHASE_TYPE } from 'next/constants';
import type { OmitProps } from '../../utils/type';
import type { PluginOptions as BasePluginOptions } from '../utils';

export type PluginOptions = OmitProps<BasePluginOptions, 'devSourcemap'>;

export type MaybePromise<T> = Promise<T> | T;

export type NextConfigContext = {
  defaultConfig: NextConfig;
};

export type NextConfigFunction = (
  phase: PHASE_TYPE,
  context: NextConfigContext,
) => MaybePromise<NextConfig>;

export type NextConfigInput = NextConfig | NextConfigFunction;

type WebpackConfigHook = NonNullable<NextConfig['webpack']>;

export type WebpackConfiguration = Parameters<WebpackConfigHook>[0];
export type WebpackConfigContext = Parameters<WebpackConfigHook>[1];

export type TurbopackConfig = NonNullable<NextConfig['turbopack']>;
export type TurbopackRules = NonNullable<TurbopackConfig['rules']>;
export type TurbopackResolveAlias = NonNullable<TurbopackConfig['resolveAlias']>;
export type TurbopackLoaderItem = { loader: string; options?: unknown; };
