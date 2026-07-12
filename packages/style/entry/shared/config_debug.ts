import { setBuildConfig } from '../../config/build';
import { setBuildDebugClassName } from '../../config/config/debug';

declare const FLUENTIC_STYLE_BUILD_CONFIG: string;

const buildConfig = JSON.parse(FLUENTIC_STYLE_BUILD_CONFIG);

setBuildConfig(buildConfig);
setBuildDebugClassName(buildConfig.css?.debugClassName, false);
