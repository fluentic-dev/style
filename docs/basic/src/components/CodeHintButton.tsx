import Link from '@docusaurus/Link';
import CodeBlock from '@theme/CodeBlock';
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './CodeHintButton.module.css';
import { type CodeHint, CodeHintsContext } from './CodeHints';

export default function CodeHintButton({ hint }: { hint: CodeHint; }) {
  const [open, setOpen] = useState(false);
  const [tooltip, setTooltip] = useState<{ left: number; top: number; below: boolean; } | null>(null);
  const term = useRef<HTMLSpanElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const tooltipId = useId();
  const hideTooltip = () => {
    clearTimeout(hideTimer.current);
    setTooltip(null);
  };
  const showTooltip = () => {
    if (open) return;
    clearTimeout(hideTimer.current);
    const rect = term.current?.getBoundingClientRect();
    if (rect) {
      setTooltip({
        left: Math.max(12, Math.min(rect.left, window.innerWidth - 332)),
        top: rect.top < 180 ? rect.bottom + 8 : rect.top,
        below: rect.top < 180,
      });
    }
  };
  const scheduleHide = () => {
    hideTimer.current = setTimeout(() => setTooltip(null), 120);
  };
  useEffect(() => {
    if (!tooltip) return;
    const dismiss = (event: KeyboardEvent) => {
      if (event.key === 'Escape') hideTooltip();
    };
    window.addEventListener('keydown', dismiss);
    window.addEventListener('scroll', hideTooltip, true);
    window.addEventListener('resize', hideTooltip);
    return () => {
      clearTimeout(hideTimer.current);
      window.removeEventListener('keydown', dismiss);
      window.removeEventListener('scroll', hideTooltip, true);
      window.removeEventListener('resize', hideTooltip);
    };
  }, [tooltip]);
  const trigger = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    if (!open) return;
    const triggerElement = trigger.current;
    dialog.current?.showModal();
    return () => {
      triggerElement?.focus({ preventScroll: true });
    };
  }, [open]);
  return (
    <>
      <span
        ref={term}
        className={styles.term}
        onMouseEnter={showTooltip}
        onMouseLeave={scheduleHide}
        aria-describedby={tooltip ? tooltipId : undefined}
      >
        {hint.term}
      </span>
      <button
        type='button'
        ref={trigger}
        className={styles.hint}
        aria-label={`Learn about ${hint.term}`}
        aria-haspopup='dialog'
        aria-describedby={tooltip ? tooltipId : undefined}
        onMouseEnter={showTooltip}
        onMouseLeave={scheduleHide}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        onClick={() => {
          hideTooltip();
          setOpen(true);
        }}
      />
      {tooltip && !open && createPortal(
        <div
          id={tooltipId}
          role='tooltip'
          className={styles.tooltip}
          style={{ left: tooltip.left, top: tooltip.top, transform: tooltip.below ? 'none' : undefined }}
          onMouseEnter={() => clearTimeout(hideTimer.current)}
          onMouseLeave={scheduleHide}
        >
          {hint.description}
          <span className={styles.tooltipHint}>Select ? for examples and details.</span>
        </div>,
        document.body,
      )}
      {open && createPortal(
        <dialog
          ref={dialog}
          className={styles.dialog}
          aria-labelledby={titleId}
          onCancel={() => setOpen(false)}
          onClose={() => setOpen(false)}
          onClick={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div className={styles.content}>
            <div className={styles.heading}>
              <h2 id={titleId}>
                <code>{hint.term}</code>
              </h2>
              <button
                type='button'
                className={styles.close}
                aria-label='Close explanation'
                onClick={() => setOpen(false)}
              >
                ×
              </button>
            </div>
            <p>{hint.description}</p>
            <h3>In practice</h3>
            <p>{hint.practice}</p>
            <CodeHintsContext.Provider value={[]}>
              <CodeBlock language='tsx'>{hint.example}</CodeBlock>
            </CodeHintsContext.Provider>
            {hint.performance && (
              <>
                <h3>What about performance?</h3>
                <p>{hint.performance}</p>
              </>
            )}
            <Link to={hint.path}>
              {hint.linkLabel ?? 'Read the detailed guide'}
            </Link>
          </div>
        </dialog>,
        document.body,
      )}
    </>
  );
}
