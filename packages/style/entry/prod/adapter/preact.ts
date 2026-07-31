import { createMergeJsxProps } from '../../../runtime/adapter/utils';
import { getClassName } from '../../../runtime/extract/getClassName';

export const mergeJsxProps = createMergeJsxProps(getClassName, {
  classProp: 'class',
  styleProp: 'style',
  styleMode: 'react',
});
