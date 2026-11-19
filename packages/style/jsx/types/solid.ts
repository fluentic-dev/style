import 'solid-js/jsx-runtime';
import type { StyleProp } from '../../runtime/types';

declare module 'solid-js/jsx-runtime' {
  namespace JSX {
    // oxlint-disable-next-line no-unused-vars
    interface HTMLAttributes<T> {
      css?: StyleProp;
    }
    // oxlint-disable-next-line no-unused-vars
    interface CoreSVGAttributes<T> {
      css?: StyleProp;
    }
  }
}
