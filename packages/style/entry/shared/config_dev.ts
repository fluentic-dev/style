import { setBuildConfig } from '../../config/build';
import { readEntryJsonDefine } from './utils';

declare const FLUENTIC_STYLE_BUILD_CONFIG: string;

setBuildConfig(
  readEntryJsonDefine(
    'FLUENTIC_STYLE_BUILD_CONFIG',
    () => FLUENTIC_STYLE_BUILD_CONFIG,
    { hoist: true, css: {} },
  ),
);
