import { setBuildConfig } from '../../config/build';

declare const FLUENTIC_STYLE_BUILD_CONFIG: string;

setBuildConfig(JSON.parse(FLUENTIC_STYLE_BUILD_CONFIG));
