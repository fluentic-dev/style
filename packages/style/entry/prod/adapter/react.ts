import { createMergeJsxProps } from '../../../runtime/adapter/utils';
import { getClassName } from '../../../runtime/extract/getClassName';

export const mergeJsxProps = createMergeJsxProps(getClassName, {
  classProp: 'className',
  styleProp: 'style',
  styleMode: 'react',
});
