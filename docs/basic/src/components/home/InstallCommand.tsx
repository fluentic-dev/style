import { useEffect, useState } from 'react';
import styles from '../../pages/index.module.css';

const commands = {
  pnpm: 'pnpm add @fluentic/style@beta',
  npm: 'npm install @fluentic/style@beta',
  bun: 'bun add @fluentic/style@beta',
};

export default function InstallCommand() {
  const [manager, setManager] = useState<keyof typeof commands>('pnpm');
  const [message, setMessage] = useState('');
  useEffect(() => {
    if (!message) return;
    const timeout = window.setTimeout(() => setMessage(''), 3000);
    return () => window.clearTimeout(timeout);
  }, [message]);
  async function copyCommand() {
    try {
      await navigator.clipboard.writeText(commands[manager]);
      setMessage('Copied!');
    } catch {
      setMessage('Select the command to copy it.');
    }
  }
  return (
    <div className={styles.installBlock}>
      <div className={styles.packageManagers} role='group' aria-label='Package manager'>
        {(Object.keys(commands) as (keyof typeof commands)[]).map((name) => (
          <button
            type='button'
            key={name}
            aria-pressed={manager === name}
            onClick={() => {
              setManager(name);
              setMessage('');
            }}
          >
            {name}
          </button>
        ))}
      </div>
      <div className={styles.install}>
        <code>{commands[manager]}</code>
        <button type='button' onClick={copyCommand} aria-label='Copy install command'>Copy</button>
      </div>
      <span className={styles.copyStatus} role='status'>{message}</span>
    </div>
  );
}
