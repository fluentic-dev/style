import styles from '../../pages/index.module.css';

/** Render explicitly marked code terms without interpreting other Markdown. */
export default function InlineCode({ text }: { text: string; }) {
  return (
    <>
      {text.split(/(`[^`]+`)/g).map((part, index) =>
        part.startsWith('`') && part.endsWith('`')
          ? <code key={index} className={styles.inlineCode}>{part.slice(1, -1)}</code>
          : part
      )}
    </>
  );
}
