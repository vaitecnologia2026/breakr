// Tela "Negócios" (CRM Comercial) — pipeline em Kanban por funil.
// Baseada no wireframe DMhub CRM (tela 2), reproduzida com o design system atual
// do Breakr. Página de apresentação: dados estáticos do wireframe — não consome
// API nem altera estruturas existentes.
import type { ReactNode } from 'react';
import { PaginaShell } from '../components/primitivos';
import { Badge } from '../components/ui';

interface Deal {
  titulo: string;
  contato?: string;
  valor: string;
  tag?: { cor: 'vermelho' | 'amarelo' | 'neutro'; texto: string };
}

function ColunaKanban({ titulo, count, total, deals, resto }: { titulo: string; count: number; total: string; deals: Deal[]; resto?: string }) {
  return (
    <div style={{ flex: '0 0 240px', background: 'var(--superficie-2)', border: '1px solid var(--borda)', borderRadius: 12, padding: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 600, fontSize: 12.5 }}>
        <span>{titulo}</span>
        <span style={{ background: 'var(--superficie-4)', borderRadius: 999, fontSize: 10.5, padding: '1px 7px', color: 'var(--texto-suave)' }}>{count}</span>
      </div>
      <div style={{ fontSize: 11, color: 'var(--texto-fraco)', marginBottom: 8 }}>{total}</div>
      {deals.map((d, i) => (
        <div key={i} style={{ background: 'var(--superficie-3)', border: '1px solid var(--borda)', borderRadius: 10, padding: 10, marginBottom: 8 }}>
          <div style={{ fontWeight: 600, fontSize: 12.5, marginBottom: 4 }}>{d.titulo}</div>
          {d.contato && <div style={{ color: 'var(--texto-fraco)', fontSize: 11, marginBottom: 6 }}>{d.contato}</div>}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
            <b>{d.valor}</b>
            {d.tag && <Badge cor={d.tag.cor}>{d.tag.texto}</Badge>}
          </div>
        </div>
      ))}
      {resto && <div style={{ color: 'var(--texto-fraco)', fontSize: 11, textAlign: 'center' }}>{resto}</div>}
    </div>
  );
}

function Chip({ children, ativo }: { children: ReactNode; ativo?: boolean }) {
  return (
    <span style={{
      border: '1px solid var(--borda)', borderRadius: 8, padding: '6px 11px', fontSize: 12,
      color: ativo ? '#fff' : 'var(--texto-suave)', background: ativo ? 'var(--amarelo-fagulha)' : 'var(--superficie-2)',
      borderColor: ativo ? 'var(--amarelo-fagulha)' : 'var(--borda)', display: 'inline-flex', gap: 6, alignItems: 'center',
    }}>{children}</span>
  );
}

export function Negocios() {
  return (
    <PaginaShell titulo="Negócios" subtitulo="Pipeline Kanban por funil — 49 negócios no funil Prospecção">
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <Chip>▾ Prospecção</Chip>
        <span style={{ fontSize: 12, color: 'var(--texto-fraco)' }}>49 negócios</span>
        <Chip>▦ / ☰</Chip>
        <Chip>👁 Ativos ▾</Chip>
        <div style={{ flex: 1 }} />
        <Badge cor="amarelo">+ Novo Negócio</Badge>
      </div>

      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
        <ColunaKanban titulo="Entrada de Leads" count={28} total="R$ 0" resto="+ 24 negócios…" deals={[
          { titulo: 'Guria Doceira!', valor: 'R$ 0,00', tag: { cor: 'amarelo', texto: 'Sem atividade · 5d' } },
          { titulo: 'Confeitaria Sabor Caseiro', valor: 'R$ 0,00', tag: { cor: 'amarelo', texto: 'Sem atividade · 5d' } },
          { titulo: 'Mangiare Massas Artesanais Scs', valor: 'R$ 0,00', tag: { cor: 'amarelo', texto: 'Sem atividade · 5d' } },
          { titulo: 'Borriello', valor: 'R$ 0,00', tag: { cor: 'amarelo', texto: 'Sem atividade · 5d' } },
        ]} />
        <ColunaKanban titulo="Tentando contato" count={6} total="R$ 0" deals={[
          { titulo: 'Pizzayou', contato: 'Jeferson Luis Gerhardt · Pizzayou Ltda', valor: 'R$ 0,00', tag: { cor: 'vermelho', texto: 'Atrasada · 1d' } },
          { titulo: 'Pizzaria Bonacina', contato: 'Sandro Bonacina · Bonacina Pizzaria Ltda', valor: 'R$ 0,00', tag: { cor: 'vermelho', texto: 'Atrasada · 1d' } },
          { titulo: 'Chef Davi Restaurante', contato: 'Davi G. H. Rodrigues', valor: 'R$ 0,00', tag: { cor: 'vermelho', texto: 'Atrasada · 2d' } },
        ]} />
        <ColunaKanban titulo="Contato c/ empresa" count={2} total="R$ 0" deals={[
          { titulo: 'Fornalha Pizzaria', contato: 'Daniela Souza Cuervo', valor: 'R$ 0,00', tag: { cor: 'vermelho', texto: 'Atrasada · 0d' } },
          { titulo: 'Brolese Solo Pizzaria', contato: 'Cesar Brolese', valor: 'R$ 0,00', tag: { cor: 'vermelho', texto: 'Atrasada · 0d' } },
        ]} />
        <ColunaKanban titulo="Contato c/ decisor" count={7} total="R$ 0" deals={[
          { titulo: 'Jota Xiseria', contato: 'Rubem Vieira Gomes Filho', valor: 'R$ 0,00', tag: { cor: 'vermelho', texto: 'Atrasada · 2d' } },
          { titulo: 'Isma Pastéis | Lajeado', contato: 'Ismael R Bruch', valor: 'R$ 0,00', tag: { cor: 'amarelo', texto: '26d' } },
        ]} />
        <ColunaKanban titulo="Reunião Agendada" count={6} total="R$ 0" deals={[
          { titulo: 'Bolonhê | Fispal', contato: 'Cláudio · Bolonhê Lasanhas', valor: 'R$ 0,00' },
          { titulo: 'Sergius Pasteis | Fispal', contato: 'Vinicius Sborchia', valor: 'R$ 0,00', tag: { cor: 'amarelo', texto: '7d' } },
        ]} />
      </div>
    </PaginaShell>
  );
}
