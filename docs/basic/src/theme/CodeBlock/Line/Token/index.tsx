import type { Props } from '@theme/CodeBlock/Line/Token';
import { useContext } from 'react';
import CodeHintButton from '../../../../components/CodeHintButton';
import { CodeHintsContext } from '../../../../components/CodeHints';

export default function CodeToken({ line, token, ...props }: Props) {
  const hints = useContext(CodeHintsContext);
  const sourceLine = line.map((part) => part.content).join('');
  const hint = hints.find((item) => item.line.test(sourceLine) && token.content.includes(item.term));
  if (!hint) return <span {...props} />;
  const index = token.content.indexOf(hint.term);
  return (
    <span {...props}>
      {token.content.slice(0, index)}
      <CodeHintButton hint={hint} />
      {token.content.slice(index + hint.term.length)}
    </span>
  );
}
