// The playground uses Babel Standalone; never bundle Babel's Node file/config loaders.
const Babel = require('@babel/standalone');
module.exports = {
  ...Babel,
  types: Babel.packages.types,
  transformSync: Babel.transform,
};
