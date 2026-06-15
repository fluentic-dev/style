import { createSourceMapComment, type SourcemapRule } from '../sourcemap';
import type { SheetRule } from '../types';
import { createStyleTag, insertStyleTagAfter } from '../utils';

export type DevRuleTag = {
  tag: HTMLStyleElement;
  rules: SourcemapRule[];
  sourceMapNode: Text | null;
  count: number;
  updateSourceMap(): void;
};

const SOURCEMAP_TAGS: DevRuleTag[] = [];

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
  },
): DevRuleTag {
  const tag = createStyleTag(document, options.className ?? 'rules', options.nonce);
  const sourceMapNode = options.sourcemap ? document.createTextNode('') : null;

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
    count: 0,
    updateSourceMap() {
      if (!sourceMapNode) return;

      if (sourceMapNode.parentNode !== tag) {
        tag.appendChild(sourceMapNode);
      }

      sourceMapNode.data = '\n' + createSourceMapComment(item.rules);
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
