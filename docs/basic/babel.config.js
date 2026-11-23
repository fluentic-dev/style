module.exports = {
  sourceType: 'unambiguous',
  presets: [require.resolve('@docusaurus/core/lib/babel/preset')],
  // The shared compiler spreads Sets and Maps. Preserve iterable semantics even
  // though Docusaurus enables loose transforms for its own UI by default.
  assumptions: { iterableIsArray: false },
};
