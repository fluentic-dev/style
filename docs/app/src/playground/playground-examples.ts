export type PlaygroundFile = {
  name: string;
  code: string;
};

export type PlaygroundExample = {
  id: string;
  label: string;
  description: string;
  files: PlaygroundFile[];
};

// User-visible config — dev options (localClassName, debugClassName) are forced
// internally by the playground runtime and not shown here.
export const runtimeConfig = {
  dev: true,
  cache: true,
};

export const compilerConfig = {
  css: {
    layer: true,
    layerNamespace: 'fluentic',
    layers: ['reset', 'fluentic', 'override'],
  },
};

// ─── Card example ─────────────────────────────────────────────────────────────

const cardFiles: PlaygroundFile[] = [
  {
    name: 'tokens.ts',
    code: `import { createToken } from '@fluentic/style';

// Design tokens — reactive references to values
export const color = {
  page: createToken('#f5f7fb'),
  panel: createToken('#ffffff'),
  ink: createToken('#111827'),
  muted: createToken('#64748b'),
  border: createToken('#d8e1ef'),
  accent: createToken('#4f46e5'),
  accentText: createToken('#ffffff'),
};

export const space = { 3: '12px', 4: '16px', 5: '20px', 6: '24px' };
export const radius = { md: '8px', lg: '12px' };
export const shadow = { card: '0 18px 45px rgba(15, 23, 42, 0.14)' };`,
  },
  {
    name: 'card.styles.ts',
    code: `import { style } from '@fluentic/style';
import { color, radius, shadow, space } from './tokens';

const text = {
  fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
  letterSpacing: 0,
};

export const card = {
  root: style.slot({
    ...text,
    backgroundColor: color.panel,
    border: '1px solid',
    borderColor: color.border,
    borderRadius: radius.lg,
    boxShadow: shadow.card,
    color: color.ink,
    display: 'grid',
    gap: space[4],
    maxWidth: '460px',
    padding: space[6],
  }),
  eyebrow: style.slot({
    ...text,
    color: color.accent,
    fontSize: '12px',
    fontWeight: 800,
    margin: 0,
    textTransform: 'uppercase',
  }),
  title: style.slot({
    ...text,
    color: color.ink,
    fontSize: '28px',
    fontWeight: 760,
    lineHeight: 1.1,
    margin: 0,
  }),
  body: style.slot({
    ...text,
    color: color.muted,
    fontSize: '15px',
    lineHeight: 1.7,
    margin: 0,
  }),
  action: style.slot({
    ...text,
    alignItems: 'center',
    backgroundColor: color.accent,
    border: 0,
    borderRadius: radius.md,
    color: color.accentText,
    cursor: 'pointer',
    display: 'inline-flex',
    fontWeight: 700,
    justifyContent: 'center',
    padding: space[3] + ' ' + space[5],
    transition: 'opacity 120ms, transform 100ms',
  }).hover({ opacity: 0.88 }).active({ transform: 'translateY(1px)' }),
};

export const nightTheme = style.scope([
  card.root({ backgroundColor: '#111827', borderColor: '#25324a', color: '#e5ecf8' }),
  card.body({ color: '#aab8cf' }),
  card.action({ backgroundColor: '#60a5fa', color: '#0f172a' }),
]);

export const compactTheme = style.scope([
  card.root({ maxWidth: '380px', padding: space[5] }),
  card.title({ fontSize: '22px' }),
]);`,
  },
  {
    name: 'app.ts',
    code: `import { getCss, getClassName } from '@fluentic/style';
import { card, compactTheme, nightTheme } from './card.styles';

// getCss resolves slots against active scopes — same as useCss() in React
const css = getCss(card, nightTheme, compactTheme);

// getClassName converts a CssProp to a class name string for HTML rendering
const cn = (cssProp) => getClassName(cssProp).className ?? '';

export function renderApp() {
  return \`
    <main class="demo-shell">
      <article class="\${cn(css.root)}">
        <p class="\${cn(css.eyebrow)}">Interactive Playground</p>
        <h2 class="\${cn(css.title)}">Edit tokens, slots, and themes.</h2>
        <p class="\${cn(css.body)}">
          This sample uses real Fluentic runtime mode. Scopes let you restyle
          any slot without touching the base definitions.
        </p>
        <button class="\${cn(css.action)}">Try Fluentic Style</button>
      </article>
    </main>
  \`;
}`,
  },
];

// ─── Button example ────────────────────────────────────────────────────────────

const buttonFiles: PlaygroundFile[] = [
  {
    name: 'tokens.ts',
    code: `import { createToken } from '@fluentic/style';

export const color = {
  primary: createToken('#4f46e5'),
  primaryHover: createToken('#4338ca'),
  primaryText: createToken('#ffffff'),
  neutral: createToken('#f1f5f9'),
  neutralHover: createToken('#e2e8f0'),
  neutralText: createToken('#1e293b'),
  danger: createToken('#dc2626'),
  dangerText: createToken('#ffffff'),
  border: createToken('#e2e8f0'),
};

export const radius = { md: '8px', pill: '999px' };
export const space = { 2: '8px', 3: '12px', 4: '16px' };`,
  },
  {
    name: 'button.styles.ts',
    code: `import { style } from '@fluentic/style';
import { color, radius, space } from './tokens';

const text = {
  fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
  letterSpacing: 0,
};

export const btn = {
  root: style.slot({
    ...text,
    alignItems: 'center',
    border: '1px solid transparent',
    borderRadius: radius.md,
    cursor: 'pointer',
    display: 'inline-flex',
    fontSize: '14px',
    fontWeight: 650,
    gap: '6px',
    justifyContent: 'center',
    padding: space[2] + ' ' + space[4],
    transition: 'opacity 120ms, transform 100ms',
  }).active({ transform: 'scale(0.97)' }),
};

export const primaryTheme = style.scope([
  btn.root({ backgroundColor: color.primary, color: color.primaryText }),
  btn.root.hover({ backgroundColor: color.primaryHover }),
]);

export const neutralTheme = style.scope([
  btn.root({ backgroundColor: color.neutral, borderColor: color.border, color: color.neutralText }),
  btn.root.hover({ backgroundColor: color.neutralHover }),
]);

export const dangerTheme = style.scope([
  btn.root({ backgroundColor: color.danger, color: color.dangerText }),
  btn.root.hover({ opacity: 0.85 }),
]);

export const pillTheme = style.scope([
  btn.root({ borderRadius: radius.pill }),
]);`,
  },
  {
    name: 'app.ts',
    code: `import { style, getCss, getClassName } from '@fluentic/style';
import { btn, dangerTheme, neutralTheme, pillTheme, primaryTheme } from './button.styles';

// Demo layout slots — all styling through Fluentic
const demo = {
  stack: style.slot({ alignItems: 'flex-start', display: 'flex', flexDirection: 'column', gap: '20px' }),
  row: style.slot({ alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: '10px' }),
};

const cn = (cssProp) => getClassName(cssProp).className ?? '';

function renderBtn(label, ...themes) {
  const css = getCss(btn, ...themes);
  return \`<button class="\${cn(css.root)}">\${label}</button>\`;
}

export function renderApp() {
  const lay = getCss(demo);
  return \`
    <main class="demo-shell">
      <div class="\${cn(lay.stack)}">
        <div class="\${cn(lay.row)}">
          \${renderBtn('Primary', primaryTheme)}
          \${renderBtn('Neutral', neutralTheme)}
          \${renderBtn('Danger', dangerTheme)}
        </div>
        <div class="\${cn(lay.row)}">
          \${renderBtn('Pill Primary', primaryTheme, pillTheme)}
          \${renderBtn('Pill Neutral', neutralTheme, pillTheme)}
        </div>
      </div>
    </main>
  \`;
}`,
  },
];

// ─── Profile example ───────────────────────────────────────────────────────────

const profileFiles: PlaygroundFile[] = [
  {
    name: 'tokens.ts',
    code: `import { createToken } from '@fluentic/style';

export const color = {
  surface: createToken('#ffffff'),
  ink: createToken('#0f172a'),
  muted: createToken('#64748b'),
  accent: createToken('#7c3aed'),
  accentSoft: createToken('#f3e8ff'),
  border: createToken('#e2e8f0'),
  online: createToken('#22c55e'),
  tagBg: createToken('#dbeafe'),
  tagText: createToken('#1e40af'),
};

export const space = { 2: '8px', 3: '12px', 4: '16px', 5: '20px' };
export const radius = { sm: '6px', md: '10px', lg: '16px', full: '9999px' };
export const shadow = { card: '0 4px 24px rgba(15, 23, 42, 0.08)' };`,
  },
  {
    name: 'profile.styles.ts',
    code: `import { style } from '@fluentic/style';
import { color, radius, shadow, space } from './tokens';

const text = { fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif', letterSpacing: 0 };

export const profile = {
  card: style.slot({
    ...text,
    backgroundColor: color.surface,
    border: '1px solid',
    borderColor: color.border,
    borderRadius: radius.lg,
    boxShadow: shadow.card,
    display: 'grid',
    gap: space[4],
    maxWidth: '360px',
    padding: space[5],
  }),
  header: style.slot({ alignItems: 'center', display: 'flex', gap: space[3] }),
  avatarWrap: style.slot({ flexShrink: 0, position: 'relative' }),
  avatar: style.slot({
    ...text,
    backgroundColor: color.accentSoft,
    borderRadius: radius.full,
    color: color.accent,
    display: 'grid',
    fontSize: '20px',
    fontWeight: 700,
    height: '50px',
    placeItems: 'center',
    width: '50px',
  }),
  badge: style.slot({
    backgroundColor: color.online,
    border: '2px solid',
    borderColor: color.surface,
    borderRadius: radius.full,
    bottom: 0,
    height: '13px',
    position: 'absolute',
    right: 0,
    width: '13px',
  }),
  name: style.slot({ ...text, color: color.ink, fontSize: '15px', fontWeight: 760, margin: 0 }),
  role: style.slot({ ...text, color: color.muted, fontSize: '13px', margin: 0 }),
  bio: style.slot({ ...text, color: color.muted, fontSize: '14px', lineHeight: 1.65, margin: 0 }),
  tags: style.slot({ display: 'flex', flexWrap: 'wrap', gap: space[2] }),
  tag: style.slot({
    ...text,
    backgroundColor: color.tagBg,
    borderRadius: radius.sm,
    color: color.tagText,
    fontSize: '12px',
    fontWeight: 650,
    padding: '3px 10px',
  }),
  footer: style.slot({
    borderTop: '1px solid',
    borderColor: color.border,
    display: 'flex',
    gap: space[4],
    paddingTop: space[4],
  }),
  stat: style.slot({ display: 'grid', gap: '2px' }),
  statValue: style.slot({ ...text, color: color.ink, fontSize: '17px', fontWeight: 780 }),
  statLabel: style.slot({ ...text, color: color.muted, fontSize: '12px' }),
};`,
  },
  {
    name: 'app.ts',
    code: `import { getCss, getClassName } from '@fluentic/style';
import { profile } from './profile.styles';

const css = getCss(profile);
const cn = (cssProp) => getClassName(cssProp).className ?? '';

export function renderApp() {
  return \`
    <main class="demo-shell">
      <div class="\${cn(css.card)}">
        <div class="\${cn(css.header)}">
          <div class="\${cn(css.avatarWrap)}">
            <div class="\${cn(css.avatar)}">SL</div>
            <div class="\${cn(css.badge)}"></div>
          </div>
          <div>
            <p class="\${cn(css.name)}">Sophie Laurent</p>
            <p class="\${cn(css.role)}">Design Systems Engineer</p>
          </div>
        </div>
        <p class="\${cn(css.bio)}">
          Building component libraries with Fluentic Style. Passionate about
          type-safe, atomic CSS and runtime-first styling.
        </p>
        <div class="\${cn(css.tags)}">
          <span class="\${cn(css.tag)}">React</span>
          <span class="\${cn(css.tag)}">TypeScript</span>
          <span class="\${cn(css.tag)}">Fluentic</span>
        </div>
        <div class="\${cn(css.footer)}">
          <div class="\${cn(css.stat)}">
            <span class="\${cn(css.statValue)}">42</span>
            <span class="\${cn(css.statLabel)}">Components</span>
          </div>
          <div class="\${cn(css.stat)}">
            <span class="\${cn(css.statValue)}">1.2k</span>
            <span class="\${cn(css.statLabel)}">Followers</span>
          </div>
          <div class="\${cn(css.stat)}">
            <span class="\${cn(css.statValue)}">98%</span>
            <span class="\${cn(css.statLabel)}">Satisfaction</span>
          </div>
        </div>
      </div>
    </main>
  \`;
}`,
  },
];

export const examples: PlaygroundExample[] = [
  {
    id: 'card',
    label: 'Card Component',
    description: 'Multi-file card with tokens, slots, scopes, and themes',
    files: cardFiles,
  },
  {
    id: 'button',
    label: 'Button Variants',
    description: 'Button with primary, neutral, danger, and pill variants via scopes',
    files: buttonFiles,
  },
  {
    id: 'profile',
    label: 'Profile Card',
    description: 'Profile card with avatar, tags, and stats using atomic slots',
    files: profileFiles,
  },
];
