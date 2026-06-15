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

export const compilerConfig = {
  layer: true,
  priorityMode: 'layer' as const,
  sourcemapTrace: 'style' as const,
  css: {
    layerNamespace: 'fluentic',
    layers: ['reset', 'fluentic', 'override'],
    classNamePrefix: '',
    scopeTargetPrefix: '-',
    themeNamePrefix: 'theme-',
    tokenVarPrefix: 'token-',
    localClassName: true,
    debugClassName: true,
    debugPropertyLength: 24,
    debugValueLength: 8,
    debugSelectorLength: 8,
    debugParentSelectorLength: 8,
    debugAtRuleLength: 10,
  },
};

// ─── Card example ─────────────────────────────────────────────────────────────

const cardFiles: PlaygroundFile[] = [
  {
    name: 'tokens.ts',
    code: `import { createTokens } from '@fluentic/style';

const brand = {
  blue: '#2563eb',
  violet: '#7c3aed',
  mint: '#0f766e',
};

export const tokens = createTokens({
  color: {
    canvas: '#eef4fb',
    surface: '#ffffff',
    surfaceRaised: '#f8fbff',
    text: '#172033',
    muted: '#64748b',
    border: '#d7e2f0',
    accent: brand.blue,
    accentSoft: '#dbeafe',
    accentText: '#ffffff',
  },
  radius: {
    card: '18px',
    control: '12px',
    pill: '999px',
  },
  shadow: {
    card: '0 24px 70px rgba(37, 99, 235, 0.16)',
  },
});

export const space = {
  row: '12px',
  panel: '22px',
  page: '42px',
};

export const textBase = {
  fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
  letterSpacing: 0,
};

export const themeNames = ['spring', 'night', 'ember'];`,
  },
  {
    name: 'card.styles.ts',
    code: `import { style } from '@fluentic/style';
import { space, textBase, tokens } from './tokens';

const panelBase = {
  ...textBase,
  backgroundColor: tokens.color.surface,
  border: '1px solid',
  borderColor: tokens.color.border,
  borderRadius: tokens.radius.card,
  boxShadow: tokens.shadow.card,
  color: tokens.color.text,
};

const labelText = {
  ...textBase,
  fontSize: '12px',
  fontWeight: 820,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
};

export const card = {
  root: style.slot({
    ...panelBase,
    display: 'grid',
    gap: space.panel,
    maxWidth: '520px',
    padding: space.page,
  }),
  eyebrow: style.slot({
    ...labelText,
    color: tokens.color.accent,
    margin: 0,
  }),
  title: style.slot({
    ...textBase,
    color: tokens.color.text,
    fontSize: '30px',
    fontWeight: 840,
    lineHeight: 1.05,
    margin: 0,
  }),
  body: style.slot({
    ...textBase,
    color: tokens.color.muted,
    fontSize: '16px',
    lineHeight: 1.7,
    margin: 0,
  }),
  meta: style.slot({
    display: 'flex',
    flexWrap: 'wrap',
    gap: space.row,
  }),
  chip: style.slot({
    ...labelText,
    backgroundColor: tokens.color.accentSoft,
    borderRadius: tokens.radius.pill,
    color: tokens.color.accent,
    padding: '7px 11px',
  }),
  action: style.slot({
    ...textBase,
    alignItems: 'center',
    backgroundColor: tokens.color.accent,
    border: 0,
    borderRadius: tokens.radius.control,
    color: tokens.color.accentText,
    cursor: 'pointer',
    display: 'inline-flex',
    fontWeight: 780,
    justifyContent: 'center',
    minHeight: '44px',
    padding: '0 16px',
    transition: 'filter 140ms, transform 140ms',
  }).hover({ opacity: 0.88 }).active({ transform: 'translateY(1px)' }),
};

export const themes = {
  spring: style.scope([
    card.root({
      backgroundColor: tokens.color.surface,
      borderColor: tokens.color.border,
    }),
  ]),
  night: style.scope([
    card.root({
      backgroundColor: tokens.color.surface('#101827'),
      borderColor: tokens.color.border('#25324a'),
      boxShadow: tokens.shadow.card('0 26px 80px rgba(15, 23, 42, 0.34)'),
    }),
    card.title({ color: tokens.color.text('#eef5ff') }),
    card.body({ color: tokens.color.muted('#aebbd0') }),
    card.chip({
      backgroundColor: tokens.color.accentSoft('#1e2c52'),
      color: tokens.color.accent('#93c5fd'),
    }),
    card.action({
      backgroundColor: tokens.color.accent('#60a5fa'),
      color: tokens.color.accentText('#0f172a'),
    }),
  ]),
  ember: style.scope([
    card.root({
      backgroundColor: tokens.color.surface('#fff7ed'),
      borderColor: tokens.color.border('#fed7aa'),
      boxShadow: tokens.shadow.card('0 24px 70px rgba(194, 65, 12, 0.18)'),
    }),
    card.eyebrow({ color: tokens.color.accent('#c2410c') }),
    card.chip({
      backgroundColor: tokens.color.accentSoft('#ffedd5'),
      color: tokens.color.accent('#c2410c'),
    }),
    card.action({ backgroundColor: tokens.color.accent('#c2410c') }),
  ]),
};`,
  },
  {
    name: 'app.tsx',
    code: `import { combineStyle } from '@fluentic/style';
import { card, themes } from './card.styles';
import { themeNames } from './tokens';

const activeTheme = themeNames[0];

export function App() {
  const css = combineStyle(
    card,
    themes[activeTheme](card.root),
  );

  return (
    <main className="demo-shell">
      <article css={css.root}>
        <p css={css.eyebrow}>Interactive Playground</p>
        <h2 css={css.title}>Nested tokens, regular TypeScript.</h2>
        <p css={css.body}>
          Change <code>activeTheme</code>, reuse constants across files, and
          let Fluentic carry slots, tokens, scopes, and runtime CSS.
        </p>
        <div css={css.meta}>
          <span css={css.chip}>createTokens</span>
          <span css={css.chip}>spread reuse</span>
          <span css={css.chip}>cross-file constants</span>
        </div>
        <button css={css.action}>Try Fluentic Style</button>
      </article>
    </main>
  );
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
    name: 'app.tsx',
    code: `import { bindScope, style, combineStyle, type StyleTheme } from '@fluentic/style';
import type { ReactNode } from 'react';
import { btn, dangerTheme, neutralTheme, pillTheme, primaryTheme } from './button.styles';

const demo = {
  stack: style.slot({ alignItems: 'flex-start', display: 'flex', flexDirection: 'column', gap: '20px' }),
  row: style.slot({ alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: '10px' }),
};

type DemoButtonProps = {
  children: ReactNode;
  theme: StyleTheme | StyleTheme[];
};

function DemoButton(props: DemoButtonProps) {
  const css = combineStyle(btn, bindScope(btn.root, props.theme));

  return <button css={css.root}>{props.children}</button>;
}

export function App() {
  return (
    <main className="demo-shell">
      <div css={demo.stack}>
        <div css={demo.row}>
          <DemoButton theme={primaryTheme}>Primary</DemoButton>
          <DemoButton theme={neutralTheme}>Neutral</DemoButton>
          <DemoButton theme={dangerTheme}>Danger</DemoButton>
        </div>
        <div css={demo.row}>
          <DemoButton theme={[primaryTheme, pillTheme]}>Pill Primary</DemoButton>
          <DemoButton theme={[neutralTheme, pillTheme]}>Pill Neutral</DemoButton>
        </div>
      </div>
    </main>
  );
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
    name: 'app.tsx',
    code: `import { combineStyle } from '@fluentic/style';
import { profile } from './profile.styles';

export function App() {
  const css = combineStyle(profile);

  return (
    <main className="demo-shell">
      <div css={css.card}>
        <div css={css.header}>
          <div css={css.avatarWrap}>
            <div css={css.avatar}>SL</div>
            <div css={css.badge} />
          </div>
          <div>
            <p css={css.name}>Sophie Laurent</p>
            <p css={css.role}>Design Systems Engineer</p>
          </div>
        </div>
        <p css={css.bio}>
          Building component libraries with Fluentic Style. Passionate about
          type-safe, atomic CSS and runtime-first styling.
        </p>
        <div css={css.tags}>
          <span css={css.tag}>React</span>
          <span css={css.tag}>TypeScript</span>
          <span css={css.tag}>Fluentic</span>
        </div>
        <div css={css.footer}>
          <div css={css.stat}>
            <span css={css.statValue}>42</span>
            <span css={css.statLabel}>Components</span>
          </div>
          <div css={css.stat}>
            <span css={css.statValue}>1.2k</span>
            <span css={css.statLabel}>Followers</span>
          </div>
          <div css={css.stat}>
            <span css={css.statValue}>98%</span>
            <span css={css.statLabel}>Satisfaction</span>
          </div>
        </div>
      </div>
    </main>
  );
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
