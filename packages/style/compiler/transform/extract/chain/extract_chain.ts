import type { types } from '@babel/core';

export type StyleChainMethod = {
  name: string;
  args: types.Node[];
};

export type StyleChainParseResult = {
  kind: 'style' | 'slot' | 'scope';
  baseArgs: types.Node[];
  methods: StyleChainMethod[];
} | null;

export type StyleSlotRef = {
  kind: 'slot-ref';
  slotId: string;
  methods: StyleChainMethod[];
};

export function extractStyleChain(
  node: types.Node,
  styleNames: Set<string>,
): StyleChainParseResult {
  if (node.type !== 'CallExpression') return null;

  const callee = node.callee;

  if (callee.type === 'Identifier' && styleNames.has(callee.name)) {
    return { kind: 'style', baseArgs: node.arguments as types.Node[], methods: [] };
  }

  if (callee.type === 'MemberExpression' && !callee.computed) {
    const prop = callee.property.type === 'Identifier'
      ? callee.property.name
      : null;

    if (!prop) return null;

    const obj = callee.object;

    if (obj.type === 'Identifier' && styleNames.has(obj.name)) {
      if (prop === 'slot') return { kind: 'slot', baseArgs: node.arguments as types.Node[], methods: [] };
      if (prop === 'scope') return { kind: 'scope', baseArgs: node.arguments as types.Node[], methods: [] };
      return null;
    }

    if (obj.type === 'CallExpression') {
      const inner = extractStyleChain(obj, styleNames);
      if (!inner) return null;

      return {
        ...inner,
        methods: [...inner.methods, { name: prop, args: node.arguments as types.Node[] }],
      };
    }
  }

  return null;
}
