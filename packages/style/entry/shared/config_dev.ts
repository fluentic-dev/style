import { type BuildConfig, setBuildConfig } from '../../config/build';
import { setBuildDebugClassName } from '../../config/config/debug';
import { readEntryJsonDefine } from './utils';

declare const FLUENTIC_STYLE_BUILD_CONFIG: string;

const buildConfig = readEntryJsonDefine<BuildConfig>(
  'FLUENTIC_STYLE_BUILD_CONFIG',
  () => FLUENTIC_STYLE_BUILD_CONFIG,
  { hoist: true, css: {} } satisfies BuildConfig,
);

setBuildConfig(buildConfig);
setBuildDebugClassName(buildConfig.css?.debugClassName, false);
