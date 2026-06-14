import { base, menu, mountSingleBench, palette, rows } from '@benchmark/main';
import React from 'react';
import styled from 'styled-components';
const Page = styled.div(base.page);
const Header = styled.header(base.header);
const Shell = styled.div(base.shell);
const Card = styled.section(base.card);
const Title = styled.h1`margin:0;font-size:20px;@media (max-width:900px){font-size:18px;}`;
const Muted = styled.p`${base.muted}; &:hover { color:#cbd5e1; }`;
const Table = styled.table(base.table);
const Cell = styled.td(base.thtd);
const Head = styled.th(base.thtd);
const Badge = styled.span(base.badge);
const MenuBtn = styled.button`${base.menuBtn}; &:hover { border-color:${palette.accent}; }`;
const Select = styled.select(base.select);
const DetailsHero = styled.section(base.detailsHero);
const Row = styled.tr`
  &.is-active {
    background: rgba(34,211,238,0.08);
  }
`;
const StressHeader = styled.header((props) => ({
  ...base.header,
  borderColor: props.$accent,
  boxShadow: `0 0 0 1px ${props.$accent}`,
}));
const StressHero = styled.section((props) => ({
  ...base.detailsHero,
  borderColor: props.$accent,
}));
const StressTitle = styled.h1((props) => ({
  ...base.title,
  color: props.$accent,
  '@media (max-width: 900px)': { fontSize: 18 },
}));
const StressMuted = styled.p((props) => ({
  ...base.muted,
  '&:hover': { color: props.$accent },
}));
const StressPanel = styled.section((props) => ({
  ...base.card,
  '@media (max-width: 900px)': { padding: props.$padding },
  '@media (min-width: 700px)': { background: props.$surface },
}));
const StressMenuBtn = styled.button((props) => ({
  ...base.menuBtn,
  borderColor: props.$active ? props.$accent : palette.border,
  transform: props.$active ? 'translateX(2px)' : 'none',
  '&:hover': { borderColor: props.$accent },
}));
const StressRow = styled.tr((props) => ({
  background: props.$active ? `color-mix(in srgb, ${props.$tone} 16%, transparent)` : 'transparent',
  color: props.$highlight ? '#f8fafc' : palette.text,
}));
const StressCell = styled.td((props) => ({
  ...base.thtd,
  borderColor: props.$tone || palette.border,
  color: props.$tone || 'inherit',
}));
const StressBadge = styled.span((props) => ({
  ...base.badge,
  borderColor: props.$tone,
  color: props.$tone,
  background: props.$active ? `color-mix(in srgb, ${props.$tone} 18%, transparent)` : 'transparent',
}));
const useStressStyle = new URLSearchParams(window.location.search).get('stressStyle') === '1';
const tones = [palette.accent, '#a78bfa', '#34d399', '#fb7185', '#f59e0b', '#60a5fa'];

function getTone(row, tick) {
  return tones[(row.id + tick) % tones.length];
}

function AppLayout({ view, tick, liteStyle }) {
  if (useStressStyle) {
    return <StressAppLayout view={view} tick={tick} liteStyle={liteStyle} />;
  }

  const activeRow = tick % rows.length;
  if (view === 'details') {
    return (
      <Page>
        <Header>
          <strong>Fluentic Style Admin</strong>
          <Select>
            <option>Last 7 days</option>
          </Select>
        </Header>
        <DetailsHero>
          <Title>Customer Detail</Title>
          <Muted>Real route view mount simulation.</Muted>
        </DetailsHero>
      </Page>
    );
  }
  return (
    <Page>
      <Header>
        <strong>Fluentic Style Admin</strong>
        <Select>
          <option>Last 7 days</option>
        </Select>
      </Header>
      <Shell>
        <Card>{menu.map((m) => <MenuBtn key={m}>{m}</MenuBtn>)}</Card>
        <Card>
          <Title>Admin Dashboard</Title>
          <Muted>Real world mount + update benchmark.</Muted>
          <Table>
            <thead>
              <tr>
                <Head>Name</Head>
                <Head>Plan</Head>
                <Head>Usage</Head>
                <Head>Status</Head>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <Row key={r.id} className={liteStyle && i === activeRow ? 'is-active' : undefined}>
                  <Cell>{r.name}</Cell>
                  <Cell>{r.plan}</Cell>
                  <Cell>{r.usage}%</Cell>
                  <Cell>
                    <Badge>{r.status}</Badge>
                  </Cell>
                </Row>
              ))}
            </tbody>
          </Table>
        </Card>
      </Shell>
    </Page>
  );
}

function StressAppLayout({ view, tick, liteStyle }) {
  const accent = tick % 2 === 0 ? palette.accent : '#a78bfa';
  const activeRow = tick % rows.length;

  if (view === 'details') {
    return (
      <Page>
        <StressHeader $accent={accent}>
          <strong>Fluentic Style Admin</strong>
          <Select>
            <option>Last 7 days</option>
          </Select>
        </StressHeader>
        <StressHero $accent={accent}>
          <StressTitle $accent={accent}>Customer Detail</StressTitle>
          <StressMuted $accent={accent}>Real route view mount simulation.</StressMuted>
        </StressHero>
      </Page>
    );
  }

  return (
    <Page>
      <StressHeader $accent={accent}>
        <strong>Fluentic Style Admin</strong>
        <Select>
          <option>Last 7 days</option>
        </Select>
      </StressHeader>
      <Shell>
        <Card>
          {menu.map((m, index) => (
            <StressMenuBtn key={m} $active={index === tick % menu.length} $accent={accent}>
              {m}
            </StressMenuBtn>
          ))}
        </Card>
        <StressPanel $padding={10 + (tick % 4)} $surface={tick % 2 === 0 ? palette.panel : '#0b1220'}>
          <StressTitle $accent={accent}>Admin Dashboard</StressTitle>
          <StressMuted $accent={accent}>Real world mount + update benchmark.</StressMuted>
          <Table>
            <thead>
              <tr>
                <Head>Name</Head>
                <Head>Plan</Head>
                <Head>Usage</Head>
                <Head>Status</Head>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const tone = getTone(row, tick);
                const active = liteStyle && index === activeRow;
                const usage = (row.usage + tick + index) % 100;

                return (
                  <StressRow key={row.id} $active={active} $highlight={index % 3 === tick % 3} $tone={tone}>
                    <StressCell $tone={tone}>{row.name}</StressCell>
                    <Cell>{row.plan}</Cell>
                    <StressCell $tone={tone}>{usage}%</StressCell>
                    <Cell>
                      <StressBadge $active={active} $tone={tone}>{row.status}</StressBadge>
                    </Cell>
                  </StressRow>
                );
              })}
            </tbody>
          </Table>
        </StressPanel>
      </Shell>
    </Page>
  );
}
mountSingleBench({ AppLayout, lib: 'styled-components' });
