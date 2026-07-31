import 'preact';

declare module 'preact' {
  namespace JSX {
    interface FluenticRuntimeAttributes {
      css?: import('../../runtime/types').StyleProp;
    }

    // oxlint-disable-next-line no-unused-vars
    interface HTMLAttributes<RefType extends EventTarget = EventTarget> extends FluenticRuntimeAttributes {}
    // oxlint-disable-next-line no-unused-vars
    interface SVGAttributes<Target extends EventTarget = SVGElement> extends FluenticRuntimeAttributes {}
  }
}
