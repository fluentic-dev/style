import type { CSSPropertyName } from '../utils/types';
import { INTERMEDIATE, LONGHAND, type PropertyTypeRecord, SHORTHAND } from './types';

type TypeMap = PropertyTypeRecord<CSSPropertyName>;

export const animation: TypeMap = {
  animation: SHORTHAND,
  animationComposition: LONGHAND,
  animationDelay: LONGHAND,
  animationDirection: LONGHAND,
  animationDuration: LONGHAND,
  animationFillMode: LONGHAND,
  animationIterationCount: LONGHAND,
  animationName: LONGHAND,
  animationPlayState: LONGHAND,
  animationRange: INTERMEDIATE,
  animationRangeEnd: LONGHAND,
  animationRangeStart: LONGHAND,
  animationTimeline: LONGHAND,
  animationTimingFunction: LONGHAND,
};

export const background: TypeMap = {
  background: SHORTHAND,
  backgroundAttachment: LONGHAND,
  backgroundBlendMode: LONGHAND,
  backgroundClip: LONGHAND,
  backgroundColor: LONGHAND,
  backgroundImage: LONGHAND,
  backgroundOrigin: LONGHAND,
  backgroundPosition: INTERMEDIATE,
  backgroundPositionX: LONGHAND,
  backgroundPositionY: LONGHAND,
  backgroundRepeat: INTERMEDIATE,
  backgroundSize: LONGHAND,
};

export const border: TypeMap = {
  border: SHORTHAND,
  borderBlock: INTERMEDIATE,
  borderBlockColor: INTERMEDIATE,
  borderBlockEnd: INTERMEDIATE,
  borderBlockEndColor: LONGHAND,
  borderBlockEndStyle: LONGHAND,
  borderBlockEndWidth: LONGHAND,
  borderBlockStart: INTERMEDIATE,
  borderBlockStartColor: LONGHAND,
  borderBlockStartStyle: LONGHAND,
  borderBlockStartWidth: LONGHAND,
  borderBlockStyle: INTERMEDIATE,
  borderBlockWidth: INTERMEDIATE,
  borderBottom: INTERMEDIATE,
  borderBottomColor: LONGHAND,
  borderBottomLeftRadius: LONGHAND,
  borderBottomRightRadius: LONGHAND,
  borderBottomStyle: LONGHAND,
  borderBottomWidth: LONGHAND,
  borderColor: INTERMEDIATE,
  borderImage: INTERMEDIATE,
  borderImageOutset: LONGHAND,
  borderImageRepeat: LONGHAND,
  borderImageSlice: LONGHAND,
  borderImageSource: LONGHAND,
  borderImageWidth: LONGHAND,
  borderInline: INTERMEDIATE,
  borderInlineColor: INTERMEDIATE,
  borderInlineEnd: INTERMEDIATE,
  borderInlineEndColor: LONGHAND,
  borderInlineEndStyle: LONGHAND,
  borderInlineEndWidth: LONGHAND,
  borderInlineStart: INTERMEDIATE,
  borderInlineStartColor: LONGHAND,
  borderInlineStartStyle: LONGHAND,
  borderInlineStartWidth: LONGHAND,
  borderInlineStyle: INTERMEDIATE,
  borderInlineWidth: INTERMEDIATE,
  borderLeft: INTERMEDIATE,
  borderLeftColor: LONGHAND,
  borderLeftStyle: LONGHAND,
  borderLeftWidth: LONGHAND,
  borderRadius: SHORTHAND,
  borderEndEndRadius: LONGHAND,
  borderEndStartRadius: LONGHAND,
  borderRight: INTERMEDIATE,
  borderRightColor: LONGHAND,
  borderRightStyle: LONGHAND,
  borderRightWidth: LONGHAND,
  borderSpacing: SHORTHAND,
  borderStartEndRadius: LONGHAND,
  borderStartStartRadius: LONGHAND,
  borderStyle: INTERMEDIATE,
  borderTop: INTERMEDIATE,
  borderTopColor: LONGHAND,
  borderTopLeftRadius: LONGHAND,
  borderTopRightRadius: LONGHAND,
  borderTopStyle: LONGHAND,
  borderTopWidth: LONGHAND,
  borderWidth: INTERMEDIATE,
};

export const columns: TypeMap = {
  columns: SHORTHAND,
  columnCount: LONGHAND,
  columnRule: INTERMEDIATE,
  columnRuleColor: LONGHAND,
  columnRuleStyle: LONGHAND,
  columnRuleWidth: LONGHAND,
  columnWidth: LONGHAND,
};

export const containIntrinsicSize: TypeMap = {
  containIntrinsicSize: SHORTHAND,
  containIntrinsicBlockSize: LONGHAND,
  containIntrinsicHeight: LONGHAND,
  containIntrinsicInlineSize: LONGHAND,
  containIntrinsicWidth: LONGHAND,
};

export const container: TypeMap = {
  container: SHORTHAND,
  containerName: LONGHAND,
  containerType: LONGHAND,
};

export const flex: TypeMap = {
  flex: SHORTHAND,
  flexBasis: LONGHAND,
  flexDirection: LONGHAND,
  flexFlow: INTERMEDIATE,
  flexGrow: LONGHAND,
  flexShrink: LONGHAND,
  flexWrap: LONGHAND,
};

export const font: TypeMap = {
  font: SHORTHAND,
  fontFamily: LONGHAND,
  fontFeatureSettings: LONGHAND,
  fontKerning: LONGHAND,
  fontLanguageOverride: LONGHAND,
  fontOpticalSizing: LONGHAND,
  fontPalette: LONGHAND,
  fontSize: LONGHAND,
  fontSizeAdjust: LONGHAND,
  fontStretch: LONGHAND,
  fontStyle: LONGHAND,
  fontSynthesis: INTERMEDIATE,
  fontSynthesisSmallCaps: LONGHAND,
  fontSynthesisStyle: LONGHAND,
  fontSynthesisWeight: LONGHAND,
  fontVariant: INTERMEDIATE,
  fontVariantAlternates: LONGHAND,
  fontVariantCaps: LONGHAND,
  fontVariantEastAsian: LONGHAND,
  fontVariantEmoji: LONGHAND,
  fontVariantLigatures: LONGHAND,
  fontVariantNumeric: LONGHAND,
  fontVariantPosition: LONGHAND,
  fontVariationSettings: LONGHAND,
  fontWeight: LONGHAND,
  lineHeight: LONGHAND,
};

export const gap: TypeMap = {
  gap: SHORTHAND,
  columnGap: LONGHAND,
  rowGap: LONGHAND,
};

export const grid: TypeMap = {
  grid: SHORTHAND,
  gridArea: INTERMEDIATE,
  gridAutoColumns: LONGHAND,
  gridAutoFlow: LONGHAND,
  gridAutoRows: LONGHAND,
  gridColumn: INTERMEDIATE,
  gridColumnEnd: LONGHAND,
  gridColumnStart: LONGHAND,
  gridRow: INTERMEDIATE,
  gridRowEnd: LONGHAND,
  gridRowStart: LONGHAND,
  gridTemplate: INTERMEDIATE,
  gridTemplateAreas: LONGHAND,
  gridTemplateColumns: LONGHAND,
  gridTemplateRows: LONGHAND,
};

export const inset: TypeMap = {
  inset: SHORTHAND,
  insetBlock: INTERMEDIATE,
  insetBlockEnd: LONGHAND,
  insetBlockStart: LONGHAND,
  insetInline: INTERMEDIATE,
  insetInlineEnd: LONGHAND,
  insetInlineStart: LONGHAND,
  bottom: LONGHAND,
  left: LONGHAND,
  right: LONGHAND,
  top: LONGHAND,
};

export const listStyle: TypeMap = {
  listStyle: SHORTHAND,
  listStyleImage: LONGHAND,
  listStylePosition: LONGHAND,
  listStyleType: LONGHAND,
};

export const margin: TypeMap = {
  margin: SHORTHAND,
  marginBlock: INTERMEDIATE,
  marginBlockEnd: LONGHAND,
  marginBlockStart: LONGHAND,
  marginBottom: LONGHAND,
  marginInline: INTERMEDIATE,
  marginInlineEnd: LONGHAND,
  marginInlineStart: LONGHAND,
  marginLeft: LONGHAND,
  marginRight: LONGHAND,
  marginTop: LONGHAND,
};

export const mask: TypeMap = {
  mask: SHORTHAND,
  maskBorder: INTERMEDIATE,
  maskBorderMode: LONGHAND,
  maskBorderOutset: LONGHAND,
  maskBorderRepeat: LONGHAND,
  maskBorderSlice: LONGHAND,
  maskBorderSource: LONGHAND,
  maskBorderWidth: LONGHAND,
  maskClip: LONGHAND,
  maskComposite: LONGHAND,
  maskImage: LONGHAND,
  maskMode: LONGHAND,
  maskOrigin: LONGHAND,
  maskPosition: LONGHAND,
  maskRepeat: LONGHAND,
  maskSize: LONGHAND,
  maskType: LONGHAND,
  WebkitMask: SHORTHAND,
  WebkitMaskBoxImage: INTERMEDIATE,
  WebkitMaskBoxImageOutset: LONGHAND,
  WebkitMaskBoxImageRepeat: LONGHAND,
  WebkitMaskBoxImageSlice: LONGHAND,
  WebkitMaskBoxImageSource: LONGHAND,
  WebkitMaskBoxImageWidth: LONGHAND,
  WebkitMaskClip: LONGHAND,
  WebkitMaskComposite: LONGHAND,
  WebkitMaskImage: LONGHAND,
  WebkitMaskOrigin: LONGHAND,
  WebkitMaskPosition: LONGHAND,
  WebkitMaskPositionX: LONGHAND,
  WebkitMaskPositionY: LONGHAND,
  WebkitMaskRepeat: LONGHAND,
  WebkitMaskRepeatX: LONGHAND,
  WebkitMaskRepeatY: LONGHAND,
  WebkitMaskSize: LONGHAND,
};

export const offset: TypeMap = {
  offset: SHORTHAND,
  offsetAnchor: LONGHAND,
  offsetDistance: LONGHAND,
  offsetPath: LONGHAND,
  offsetPosition: LONGHAND,
  offsetRotate: LONGHAND,
};

export const outline: TypeMap = {
  outline: SHORTHAND,
  outlineColor: LONGHAND,
  outlineOffset: LONGHAND,
  outlineStyle: LONGHAND,
  outlineWidth: LONGHAND,
};

export const overflow: TypeMap = {
  overflow: SHORTHAND,
  overflowBlock: LONGHAND,
  overflowClipMargin: SHORTHAND,
  overflowInline: LONGHAND,
  overflowWrap: LONGHAND,
  overflowX: LONGHAND,
  overflowY: LONGHAND,
};

export const overscrollBehavior: TypeMap = {
  overscrollBehavior: SHORTHAND,
  overscrollBehaviorBlock: LONGHAND,
  overscrollBehaviorInline: LONGHAND,
  overscrollBehaviorX: LONGHAND,
  overscrollBehaviorY: LONGHAND,
};

export const padding: TypeMap = {
  padding: SHORTHAND,
  paddingBlock: INTERMEDIATE,
  paddingBlockEnd: LONGHAND,
  paddingBlockStart: LONGHAND,
  paddingBottom: LONGHAND,
  paddingInline: INTERMEDIATE,
  paddingInlineEnd: LONGHAND,
  paddingInlineStart: LONGHAND,
  paddingLeft: LONGHAND,
  paddingRight: LONGHAND,
  paddingTop: LONGHAND,
};

export const place: TypeMap = {
  placeContent: SHORTHAND,
  alignContent: LONGHAND,
  justifyContent: LONGHAND,
  placeItems: SHORTHAND,
  alignItems: LONGHAND,
  justifyItems: LONGHAND,
  placeSelf: SHORTHAND,
  alignSelf: LONGHAND,
  justifySelf: LONGHAND,
};

export const scrollMargin: TypeMap = {
  scrollMargin: SHORTHAND,
  scrollMarginBlock: INTERMEDIATE,
  scrollMarginBlockEnd: LONGHAND,
  scrollMarginBlockStart: LONGHAND,
  scrollMarginBottom: LONGHAND,
  scrollMarginInline: INTERMEDIATE,
  scrollMarginInlineEnd: LONGHAND,
  scrollMarginInlineStart: LONGHAND,
  scrollMarginLeft: LONGHAND,
  scrollMarginRight: LONGHAND,
  scrollMarginTop: LONGHAND,
};

export const scrollPadding: TypeMap = {
  scrollPadding: SHORTHAND,
  scrollPaddingBlock: INTERMEDIATE,
  scrollPaddingBlockEnd: LONGHAND,
  scrollPaddingBlockStart: LONGHAND,
  scrollPaddingBottom: LONGHAND,
  scrollPaddingInline: INTERMEDIATE,
  scrollPaddingInlineEnd: LONGHAND,
  scrollPaddingInlineStart: LONGHAND,
  scrollPaddingLeft: LONGHAND,
  scrollPaddingRight: LONGHAND,
  scrollPaddingTop: LONGHAND,
};

export const scrollTimeline: TypeMap = {
  scrollTimeline: SHORTHAND,
  scrollTimelineAxis: LONGHAND,
  scrollTimelineName: LONGHAND,
};

export const text: TypeMap = {
  textDecoration: SHORTHAND,
  textDecorationColor: LONGHAND,
  textDecorationLine: LONGHAND,
  textDecorationSkip: LONGHAND,
  textDecorationSkipInk: LONGHAND,
  textDecorationStyle: LONGHAND,
  textDecorationThickness: LONGHAND,
  textEmphasis: SHORTHAND,
  textEmphasisColor: LONGHAND,
  textEmphasisPosition: LONGHAND,
  textEmphasisStyle: LONGHAND,
};

export const transition: TypeMap = {
  transition: SHORTHAND,
  transitionBehavior: LONGHAND,
  transitionDelay: LONGHAND,
  transitionDuration: LONGHAND,
  transitionProperty: LONGHAND,
  transitionTimingFunction: LONGHAND,
};

export const viewTimeline: TypeMap = {
  viewTimeline: SHORTHAND,
  viewTimelineAxis: LONGHAND,
  viewTimelineInset: LONGHAND,
  viewTimelineName: LONGHAND,
};

export const whiteSpace: TypeMap = {
  whiteSpace: SHORTHAND,
  whiteSpaceCollapse: LONGHAND,
};
