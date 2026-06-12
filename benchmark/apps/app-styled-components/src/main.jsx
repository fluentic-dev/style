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
function AppLayout({ view, tick, liteStyle }) {
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
mountSingleBench({ AppLayout, lib: 'styled-components' });
