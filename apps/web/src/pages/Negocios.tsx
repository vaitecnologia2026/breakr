// Tela "Negócios" (CRM Comercial) — pipeline em Kanban por funil.
// Baseada no wireframe DMhub CRM (tela 2), reproduzida com o design system atual
// do Breakr. Os cards podem ser arrastados entre as colunas (drag-and-drop nativo,
// sem dependência externa); o estado do quadro é local (não persiste em API).
import { useRef, useState, type ReactNode } from 'react';
import { PaginaShell } from '../components/primitivos';
import { Badge } from '../components/ui';

interface Deal {
  id: string;
  titulo: string;
  contato?: string;
  valor: string;
  tag?: { cor: 'vermelho' | 'amarelo' | 'neutro'; texto: string };
}

interface Coluna {
  titulo: string;
  count: number;
  total: string;
  resto?: string;
  deals: Deal[];
}

const COLUNAS_INICIAIS: Coluna[] = [
  {
    titulo: 'Entrada de Leads', count: 28, total: 'R$ 0', resto: '+ 24 negócios…',
    deals: [
      { id: 'd1', titulo: 'Guria Doceira!', valor: 'R$ 0,00', tag: { cor: 'amarelo', texto: 'Sem atividade · 5d' } },
      { id: 'd2', titulo: 'Confeitaria Sabor Caseiro', valor: 'R$ 0,00', tag: { cor: 'amarelo', texto: 'Sem atividade · 5d' } },
      { id: 'd3', titulo: 'Mangiare Massas Artesanais Scs', valor: 'R$ 0,00', tag: { cor: 'amarelo', texto: 'Sem atividade · 5d' } },
      { id: 'd4', titulo: 'Borriello', valor: 'R$ 0,00', tag: { cor: 'amarelo', texto: 'Sem atividade · 5d' } },
    ],
  },
  {
    titulo: 'Tentando contato', count: 6, total: 'R$ 0',
    deals: [
      { id: 'd5', titulo: 'Pizzayou', contato: 'Jeferson Luis Gerhardt · Pizzayou Ltda', valor: 'R$ 0,00', tag: { cor: 'vermelho', texto: 'Atrasada · 1d' } },
      { id: 'd6', titulo: 'Pizzaria Bonacina', contato: 'Sandro Bonacina · Bonacina Pizzaria Ltda', valor: 'R$ 0,00', tag: { cor: 'vermelho', texto: 'Atrasada · 1d' } },
      { id: 'd7', titulo: 'Chef Davi Restaurante', contato: 'Davi G. H. Rodrigues', valor: 'R$ 0,00', tag: { cor: 'vermelho', texto: 'Atrasada · 2d' } },
    ],
  },
  {
    titulo: 'Contato c/ empresa', count: 2, total: 'R$ 0',
    deals: [
      { id: 'd8', titulo: 'Fornalha Pizzaria', contato: 'Daniela Souza Cuervo', valor: 'R$ 0,00', tag: { cor: 'vermelho', texto: 'Atrasada · 0d' } },
      { id: 'd9', titulo: 'Brolese Solo Pizzaria', contato: 'Cesar Brolese', valor: 'R$ 0,00', tag: { cor: 'vermelho', texto: 'Atrasada · 0d' } },
    ],
  },
  {
    titulo: 'Contato c/ decisor', count: 7, total: 'R$ 0',
    deals: [
      { id: 'd10', titulo: 'Jota Xiseria', contato: 'Rubem Vieira Gomes Filho', valor: 'R$ 0,00', tag: { cor: 'vermelho', texto: 'Atrasada · 2d' } },
      { id: 'd11', titulo: 'Isma Pastéis | Lajeado', contato: 'Ismael R Bruch', valor: 'R$ 0,00', tag: { cor: 'amarelo', texto: '26d' } },
    ],
  },
  {
    titulo: 'Reunião Agendada', count: 6, total: 'R$ 0',
    deals: [
      { id: 'd12', titulo: 'Bolonhê | Fispal', contato: 'Cláudio · Bolonhê Lasanhas', valor: 'R$ 0,00' },
      { id: 'd13', titulo: 'Sergius Pasteis | Fispal', contato: 'Vinicius Sborchia', valor: 'R$ 0,00', tag: { cor: 'amarelo', texto: '7d' } },
    ],
  },
];

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
  const [colunas, setColunas] = useState<Coluna[]>(COLUNAS_INICIAIS);
  // Origem do arraste (índice da coluna + índice do card). Ref: não precisa
  // re-renderizar ao iniciar o arraste.
  const arrastando = useRef<{ col: number; deal: number } | null>(null);
  const [alvo, setAlvo] = useState<number | null>(null);

  function aoSoltar(destino: number) {
    const origem = arrastando.current;
    arrastando.current = null;
    setAlvo(null);
    if (!origem || origem.col === destino) return;
    setColunas((cols) => {
      const novo = cols.map((c) => ({ ...c, deals: [...c.deals] }));
      const [movido] = novo[origem.col].deals.splice(origem.deal, 1);
      if (!movido) return cols;
      novo[destino].deals.push(movido);
      novo[origem.col].count = Math.max(0, novo[origem.col].count - 1);
      novo[destino].count = novo[destino].count + 1;
      return novo;
    });
  }

  return (
    <PaginaShell titulo="Negócios" subtitulo="Pipeline Kanban por funil — arraste os cards entre as colunas">
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <Chip>▾ Prospecção</Chip>
        <span style={{ fontSize: 12, color: 'var(--texto-fraco)' }}>49 negócios</span>
        <Chip>▦ / ☰</Chip>
        <Chip>👁 Ativos ▾</Chip>
        <div style={{ flex: 1 }} />
        <Badge cor="amarelo">+ Novo Negócio</Badge>
      </div>

      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
        {colunas.map((coluna, ci) => (
          <div
            key={coluna.titulo}
            onDragOver={(e) => { e.preventDefault(); if (alvo !== ci) setAlvo(ci); }}
            onDragLeave={(e) => { if (e.currentTarget === e.target) setAlvo((a) => (a === ci ? null : a)); }}
            onDrop={() => aoSoltar(ci)}
            style={{
              flex: '0 0 240px', background: 'var(--superficie-2)', borderRadius: 12, padding: 10,
              border: `1px solid ${alvo === ci ? 'var(--amarelo-fagulha)' : 'var(--borda)'}`,
              transition: 'border-color 0.12s ease',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 600, fontSize: 12.5 }}>
              <span>{coluna.titulo}</span>
              <span style={{ background: 'var(--superficie-4)', borderRadius: 999, fontSize: 10.5, padding: '1px 7px', color: 'var(--texto-suave)' }}>{coluna.count}</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--texto-fraco)', marginBottom: 8 }}>{coluna.total}</div>
            {coluna.deals.map((d, di) => (
              <div
                key={d.id}
                draggable
                onDragStart={(e) => { arrastando.current = { col: ci, deal: di }; e.dataTransfer.effectAllowed = 'move'; }}
                onDragEnd={() => { arrastando.current = null; setAlvo(null); }}
                style={{ background: 'var(--superficie-3)', border: '1px solid var(--borda)', borderRadius: 10, padding: 10, marginBottom: 8, cursor: 'grab' }}
              >
                <div style={{ fontWeight: 600, fontSize: 12.5, marginBottom: 4 }}>{d.titulo}</div>
                {d.contato && <div style={{ color: 'var(--texto-fraco)', fontSize: 11, marginBottom: 6 }}>{d.contato}</div>}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                  <b>{d.valor}</b>
                  {d.tag && <Badge cor={d.tag.cor}>{d.tag.texto}</Badge>}
                </div>
              </div>
            ))}
            {coluna.resto && <div style={{ color: 'var(--texto-fraco)', fontSize: 11, textAlign: 'center' }}>{coluna.resto}</div>}
          </div>
        ))}
      </div>
    </PaginaShell>
  );
}
