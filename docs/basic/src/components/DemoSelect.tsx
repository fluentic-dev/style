import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './DemoSelect.module.css';

const colors = [
  { value: '#2563eb', label: 'Blue' },
  { value: '#7c3aed', label: 'Purple' },
  { value: '#0f766e', label: 'Teal' },
];

export default function DemoSelect({ label, value, onChange }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [position, setPosition] = useState({ left: 0, top: 0, width: 140 });
  const selected = Math.max(0, colors.findIndex((color) => color.value === value));
  function show() {
    setActive(selected);
    setOpen(true);
  }
  function choose(index: number) {
    onChange(colors[index].value);
    setOpen(false);
    trigger.current?.focus({ preventScroll: true });
  }
  useEffect(() => {
    if (!open) return;
    const place = () => {
      const rect = trigger.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.max(140, rect.width);
      setPosition({
        left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
        top: rect.bottom + 150 > window.innerHeight ? Math.max(8, rect.top - 142) : rect.bottom + 6,
        width,
      });
    };
    const dismiss = (event: PointerEvent) => {
      if (!trigger.current?.contains(event.target as Node) && !menu.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    place();
    document.addEventListener('pointerdown', dismiss);
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      document.removeEventListener('pointerdown', dismiss);
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [open]);
  return (
    <span className={styles.field}>
      <span id={`${id}-label`}>{label}</span>
      <button
        ref={trigger}
        type='button'
        className={styles.trigger}
        role='combobox'
        aria-labelledby={`${id}-label`}
        aria-expanded={open}
        aria-controls={open ? `${id}-menu` : undefined}
        aria-haspopup='listbox'
        aria-activedescendant={open ? `${id}-option-${active}` : undefined}
        onClick={() => open ? setOpen(false) : show()}
        onBlur={() => setOpen(false)}
        onKeyDown={(event) => {
          if (event.key === 'Escape' || event.key === 'Tab') {
            setOpen(false);
            if (event.key === 'Escape') event.preventDefault();
            return;
          }
          if (['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter', ' '].includes(event.key)) {
            event.preventDefault();
            if (!open) {
              show();
              return;
            }
            if (event.key === 'Enter' || event.key === ' ') choose(active);
            else {setActive(
                event.key === 'Home'
                  ? 0
                  : event.key === 'End'
                  ? colors.length - 1
                  : (active + (event.key === 'ArrowDown' ? 1 : colors.length - 1)) % colors.length,
              );}
          } else if (event.key.length === 1) {
            const index = colors.findIndex((color) => color.label.toLowerCase().startsWith(event.key.toLowerCase()));
            if (index >= 0) {
              event.preventDefault();
              setOpen(true);
              setActive(index);
            }
          }
        }}
      >
        <span>{colors[selected].label}</span>
        <svg className={styles.caret} viewBox='0 0 16 16' width='16' height='16' aria-hidden='true'>
          <path d='m4 6 4 4 4-4' />
        </svg>
      </button>
      {open &&
        createPortal(
          <div
            ref={menu}
            id={`${id}-menu`}
            role='listbox'
            aria-labelledby={`${id}-label`}
            className={styles.menu}
            style={position}
          >
            {colors.map((color, index) => (
              <div
                key={color.value}
                id={`${id}-option-${index}`}
                role='option'
                aria-selected={selected === index}
                className={`${styles.option} ${active === index ? styles.active : ''}`}
                onPointerMove={() => setActive(index)}
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => choose(index)}
              >
                <span className={styles.swatch} style={{ background: color.value }} />
                {color.label}
                {selected === index && <span className={styles.check} aria-hidden='true'>✓</span>}
              </div>
            ))}
          </div>,
          document.body,
        )}
    </span>
  );
}
