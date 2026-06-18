import type { BabelTypes } from '../../utils/babel';
import { FN_STYLE_MERGE, FN_STYLE_SCOPE, FN_STYLE_SLOT } from '../../../utils/constants';

export const STATIC_MERGE_METHOD = '$$style.merge';

export type StyleChainMethod = {
  name: string;
  args: BabelTypes.Node[];
  nameNode: BabelTypes.Node;
};

export type StyleChainParseResult = {
  kind: 'style' | 'slot' | 'scope';
  rootName: string;
  baseArgs: BabelTypes.Node[];
  methods: StyleChainMethod[];
} | null;

export type StyleSlotRef = {
  kind: 'slot-ref';
  slotId: string;
  methods: StyleChainMethod[];
};

export function extractStyleChain(
  node: BabelTypes.Node,
  styleNames: Set<string>,
): StyleChainParseResult {
  if (node.type !== 'CallExpression') return null;

  const callee = node.callee;

  if (callee.type === 'Identifier' && styleNames.has(callee.name)) {
    return { kind: 'style', rootName: callee.name, baseArgs: node.arguments as BabelTypes.Node[], methods: [] };
  }

  if (callee.type === 'MemberExpression' && !callee.computed) {
    const prop = callee.property.type === 'Identifier'
      ? callee.property.name
      : null;

    if (!prop) return null;

    const obj = callee.object;

    if (obj.type === 'Identifier' && styleNames.has(obj.name)) {
      if (prop === FN_STYLE_SLOT) return { kind: 'slot', rootName: obj.name, baseArgs: node.arguments as BabelTypes.Node[], methods: [] };
      if (prop === FN_STYLE_SCOPE) return { kind: 'scope', rootName: obj.name, baseArgs: node.arguments as BabelTypes.Node[], methods: [] };
      if (prop !== FN_STYLE_MERGE) return null;

      const target = node.arguments[0] as BabelTypes.Node | undefined;
      if (!target) return null;

      const targetChain = extractStyleChain(target, styleNames);
      if (!targetChain) return null;

      return {
        ...targetChain,
        methods: targetChain.methods.concat(
          (node.arguments.slice(1) as BabelTypes.Node[]).map((arg) => ({
            name: STATIC_MERGE_METHOD,
            args: [arg],
            nameNode: callee.property,
          })),
        ),
      };
    }

    if (obj.type === 'CallExpression') {
      const inner = extractStyleChain(obj, styleNames);
      if (!inner) return null;

      return {
        ...inner,
        methods: [...inner.methods, {
          name: prop,
          args: node.arguments as BabelTypes.Node[],
          nameNode: callee.property,
        }],
      };
    }
  }

  return null;
}
