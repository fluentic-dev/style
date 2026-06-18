import type { CssConfig } from '../../config/config/css';
import type { DevRuntimeOptions } from '../../config/config/dev';
import type { CheckSelectorMode } from '../../config/types';
import type { ReplaceProps } from '../../utils/type';
import type { CssExtractRule } from '../extract';
import type { BabelTransformSourceMap } from '../transform/utils/babel';
import type { ImportSource } from '../utils/import_source';
import type { GetSourcemapFilePathFn } from '../utils/sourcemap';

export type CompilerCssOptions = Partial<CssConfig>;

export type CompilerDevOptions = ReplaceProps<DevRuntimeOptions, {
  checkSelector?: CheckSelectorMode;
}>;

export type DevSourcemapMode = 'sourceUrl' | 'sourceContent' | 'sidecarServer';

export type CompilerOptions = {
  hoist?: boolean;
  css?: CompilerCssOptions;
  dev?: CompilerDevOptions;

  importSources?: ImportSource[];

  getSourcemapFilePath?: GetSourcemapFilePathFn;
  devSourcemap?: DevSourcemapMode;
};

export type TransformDebugArgs = {
  code: string;
  sourcemap: BabelTransformSourceMap;
  filePath: string;
};

export type TransformDebugResult = {
  code: string;
  sourcemap: string | null;
};

export type TransformDebugRscResult = TransformDebugResult & {
  css: string;
  rules: CssExtractRule[];
};

export type TransformExtractArgs = {
  code: string;
  sourcemap: BabelTransformSourceMap;
  filePath: string;
};

export type TransformExtractResult = {
  code: string;
  rules: CssExtractRule[];
  sourcemap: string | null;
};

export type CompilerInvalidateFileInfo = {
  filePath: string;
};
