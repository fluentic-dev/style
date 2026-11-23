import CodeBlock from '@theme/CodeBlock';
import { CodeHintsContext, getCodeHints } from './CodeHints';

export default function FocusCode({ id, variant = 'usage', language = 'tsx', children }: {
  id: string;
  variant?: string;
  language?: string;
  children: string;
}) {
  return (
    <CodeHintsContext.Provider value={getCodeHints(id, variant)}>
      <CodeBlock language={language}>{children}</CodeBlock>
    </CodeHintsContext.Provider>
  );
}
