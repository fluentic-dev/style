import { style } from '@fluentic/style';
import { useState } from 'react';
import { Button } from './Button';
import { appButton, color, darkTheme, emphasized, lightTheme, space } from './theme';

const page = style({
  backgroundColor: color('#f5f7f6 | Canvas'),
  boxSizing: 'border-box',
  color: color('#15211d | Text'),
  fontFamily: 'system-ui, sans-serif',
  minHeight: '100vh',
  padding: space('24px'),
}).media('(max-width: 600px)', { padding: space('16px') });
const row = style({ display: 'flex', flexWrap: 'wrap', gap: space('16px'), alignItems: 'center' });
const pill = style({ borderRadius: 999 });

export default function App() {
  const [dark, setDark] = useState(false);
  const [saved, setSaved] = useState(0);
  return (
    <main css={[page, dark ? darkTheme : lightTheme]}>
      <h1>One button, shared design</h1>
      <p>Component slots and tokens stay independent of the app theme.</p>
      <div css={row}>
        <Button theme={appButton} aria-pressed={dark} onClick={() => setDark(!dark)}>
          Toggle dark theme
        </Button>
        <Button theme={appButton} size='compact' appearance='outline'>Compact outline</Button>
        <Button theme={appButton} disabled>Unavailable</Button>
        <Button theme={[appButton, emphasized]} css={pill} icon='+' onClick={() => setSaved(saved + 1)}>
          Save changes
        </Button>
      </div>
      <p role='status'>Saved {saved} times</p>
    </main>
  );
}
