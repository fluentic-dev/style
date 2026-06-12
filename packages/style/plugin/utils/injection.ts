export function shouldInjectModuleImport(code: string, moduleId: string) {
  return !code.includes(moduleId);
}

export function injectModuleImport(code: string, moduleId: string) {
  if (!shouldInjectModuleImport(code, moduleId)) return code;

  return injectCodeAfterDirectivePrologue(
    code,
    `import ${JSON.stringify(moduleId)};\n`,
  );
}

export function injectCodeAfterDirectivePrologue(
  code: string,
  injectedCode: string,
) {
  const insertAt = getDirectivePrologueEnd(code);

  return code.slice(0, insertAt) + injectedCode + code.slice(insertAt);
}

function getDirectivePrologueEnd(code: string) {
  const pattern = /^(?:\s*(?:"[^"]*"|'[^']*')\s*;?)+/;
  const match = pattern.exec(code);

  return match ? match[0].length : 0;
}
