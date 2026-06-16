import { globalData } from '../../utils/global';
import { createSourceMapComment, type SourcemapRule } from '../sourcemap';
import type { SheetRule } from '../types';
import { createStyleTag, insertStyleTagAfter } from '../utils';

export type DevRuleTag = {
  tag: HTMLStyleElement;
  rules: SourcemapRule[];
  sourceMapNode: Text | null;
  insertBeforeNode: Text | null;
  count: number;
  updateSourceMap(): void;
};

const SOURCEMAP_TAGS = globalData<DevRuleTag[]>(
  'sheet.dev.sourcemapTags',
  () => [],
);

export function getDevSourcemapTags() {
  return SOURCEMAP_TAGS;
}

export function refreshDevSourcemapTags() {
  for (let i = 0, len = SOURCEMAP_TAGS.length; i < len; i++) {
    SOURCEMAP_TAGS[i].updateSourceMap();
  }
}

export function pruneDevSourcemapTags() {
  for (let i = SOURCEMAP_TAGS.length - 1; i >= 0; i--) {
    if (!SOURCEMAP_TAGS[i].tag.parentNode) {
      SOURCEMAP_TAGS.splice(i, 1);
    }
  }
}

export function createDevTag(
  document: Document,
  previous: HTMLStyleElement | null,
  options: {
    sourcemap: boolean;
    nonce?: string | null;
    className?: string;
    before?: HTMLStyleElement | Text | null;
    wrapper?: {
      before: string;
      after: string;
      sourceMapLineOffset: number;
    };
  },
): DevRuleTag {
  const tag = createStyleTag(document, options.className ?? 'rules', options.nonce);
  const wrapperEndNode = options.wrapper
    ? document.createTextNode(options.wrapper.after)
    : null;
  const sourceMapNode = options.sourcemap ? document.createTextNode('') : null;

  if (options.wrapper) tag.appendChild(document.createTextNode(options.wrapper.before));
  if (wrapperEndNode) tag.appendChild(wrapperEndNode);
  if (sourceMapNode) tag.appendChild(sourceMapNode);

  if (options.before) {
    options.before.parentNode?.insertBefore(tag, options.before);
  } else {
    insertStyleTagAfter(document, tag, previous);
  }

  const item: DevRuleTag = {
    tag,
    rules: [],
    sourceMapNode,
    insertBeforeNode: wrapperEndNode ?? sourceMapNode,
    count: 0,
    updateSourceMap() {
      if (!sourceMapNode) return;

      if (sourceMapNode.parentNode !== tag) {
        tag.appendChild(sourceMapNode);
      }

      sourceMapNode.data = '\n' + createSourceMapComment(
        getSourceMapRules(item.rules, options.wrapper?.sourceMapLineOffset ?? 0),
      );
    },
  };

  if (sourceMapNode) {
    SOURCEMAP_TAGS.push(item);
  }

  return item;
}

export function insertDevRule(
  document: Document,
  item: DevRuleTag,
  fragment: DocumentFragment,
  css: string,
  rule: SheetRule | null,
) {
  fragment.appendChild(document.createTextNode(css + '\n'));

  item.rules.push({
    css,
    callsite: rule?.callsite ?? null,
    debug: rule?.debug ?? null,
    debugField: rule?.debugField ?? null,
  });

  item.count++;
}

function getSourceMapRules(
  rules: SourcemapRule[],
  offset: number,
) {
  if (!offset) return rules;

  const output: SourcemapRule[] = [];

  for (let i = 0; i < offset; i++) {
    output.push({ css: '', callsite: null });
  }

  return output.concat(rules);
}
