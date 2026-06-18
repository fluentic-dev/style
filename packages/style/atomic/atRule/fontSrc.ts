export function fontSrc(url: string, format?: string) {
  if (typeof url !== 'string') {
    throw new Error('fontSrc url must be a static string');
  }

  const src = `url("${escapeFontSrcPart(url)}")`;

  return format ? `${src} format("${escapeFontSrcPart(format)}")` : src;
}

function escapeFontSrcPart(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}
