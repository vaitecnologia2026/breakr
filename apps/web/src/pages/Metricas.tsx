// Tela "Métricas" (CRM Comercial) — módulo de BI / Insights.
// Baseada no wireframe DMhub CRM (tela 5), reproduzida com o design system atual
// do Breakr. Submenu à esquerda: "Meu Painel" (view padrão) + os 35 relatórios
// agrupados por funil; ao selecionar um relatório, os detalhes (tipo de gráfico,
// entidade, ver por, descrição e amostra de registros) aparecem à direita.
// Página de apresentação: dados estáticos do wireframe — não consome API.
import { useState, type ReactNode } from 'react';
import { PaginaShell } from '../components/primitivos';
import { Card, Badge, Th, Td } from '../components/ui';

/* ── Helpers visuais ─────────────────────────────────────────────────────── */
function Kpi({ rotulo, valor, hint, cor }: { rotulo: string; valor: string; hint?: string; cor?: string }) {
  return (
    <Card>
      <div style={{ color: 'var(--texto-fraco)', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>{rotulo}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color: cor ?? 'var(--texto)' }}>{valor}</div>
      {hint && <div style={{ color: 'var(--texto-fraco)', fontSize: 11.5, marginTop: 3 }}>{hint}</div>}
    </Card>
  );
}

function Barras({ alturas }: { alturas: number[] }) {
  return (
    <div style={{ height: 150, border: '1px dashed var(--borda-forte)', borderRadius: 10, display: 'flex', alignItems: 'flex-end', gap: 6, padding: 12 }}>
      {alturas.map((h, i) => (
        <div key={i} style={{ flex: 1, height: `${h}%`, background: 'linear-gradient(180deg, var(--amarelo), var(--amarelo-fagulha))', borderRadius: '4px 4px 0 0', opacity: 0.85 }} />
      ))}
    </div>
  );
}

function Painel({ titulo, children }: { titulo: ReactNode; children: ReactNode }) {
  return (
    <Card>
      <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>{titulo}</h3>
      {children}
    </Card>
  );
}

function statusTag(v: string) {
  if (v === 'Ganho') return <Badge cor="verde">Ganho</Badge>;
  if (v === 'Perdido') return <Badge cor="vermelho">Perdido</Badge>;
  return v;
}

/* ── Dados reais do wireframe (relatórios + amostra de registros) ─────────── */
type Reg = string[];
interface Rec { count: number; cols: string[]; rows: Reg[]; }
interface Report { g: string; n: string; e: string; v: string; vp: string; d: string; rec: Rec; }

const COLS_NEG = ['Título', 'Valor', 'Etapa', 'Funil', 'Responsável', 'Criado em', 'Status'];
const COLS_ATIV = ['Título', 'Tipo', 'Status', 'Vencimento', 'Responsável', 'Criado em'];

const UNF: Reg[] = [
  ['[R1] - [R1] - Lado Burger | FISPAL', 'R$ 0', 'Apresentar proposta', 'Negociação', 'Gustavo Costa', '08/jul 16:04', '—'],
  ['[R1] - Casa de assados Morsch', 'R$ 4.150', 'Apresentar proposta', 'Negociação', 'Gustavo Costa', '07/jul 16:08', '—'],
  ['[R1] - House Sushi SCS', 'R$ 8.000', 'Apresentar proposta', 'Negociação', 'Gustavo Costa', '06/jul 15:53', '—'],
  ['[R1] - Santa Pizza Gourmet | SCS', 'R$ 4.000', 'Apresentar proposta', 'Negociação', 'Gustavo Costa', '06/jul 11:35', '—'],
  ['Confeitaria Sabor Caseiro', 'R$ 0', 'Entrada de Leads', 'Prospecção', 'Gustavo Costa', '02/jul 21:08', '—'],
];
const RECEITA: Reg[] = [
  ['Cyborg Lanches', 'R$ 0', 'Reunião Agendada', 'Prospecção', 'Gustavo Costa', '02/jul 16:51', 'Ganho'],
  ['Cohab Burger', 'R$ 0', 'Reunião Agendada', 'Social Selling', 'Gustavo Costa', '02/jul 15:18', 'Ganho'],
  ['Casa de assados Morsch', 'R$ 0', 'Reunião Agendada', 'Inbound', 'Gustavo Costa', '02/jul 09:32', 'Ganho'],
  ['Santa Pizza Gourmet | SCS', 'R$ 0', 'Reunião Agendada', 'Social Selling', 'Gustavo Costa', '01/jul 16:13', 'Ganho'],
  ['[R1] - Dotto Burguer | Fispal', 'R$ 4.800', 'Pagamento', 'Negociação', 'Gustavo Costa', '30/jun 14:32', 'Ganho'],
];
const GANHOS: Reg[] = [
  ['Cyborg Lanches', 'R$ 0', 'Reunião Agendada', 'Prospecção', 'Gustavo Costa', '02/jul 16:51', 'Ganho'],
  ['Cohab Burger', 'R$ 0', 'Reunião Agendada', 'Social Selling', 'Gustavo Costa', '02/jul 15:18', 'Ganho'],
  ['Casa de assados Morsch', 'R$ 0', 'Reunião Agendada', 'Inbound', 'Gustavo Costa', '02/jul 09:32', 'Ganho'],
  ['Santa Pizza Gourmet | SCS', 'R$ 0', 'Reunião Agendada', 'Social Selling', 'Gustavo Costa', '01/jul 16:13', 'Ganho'],
];
const PROSPOPEN: Reg[] = [
  ['Confeitaria Sabor Caseiro', 'R$ 0', 'Entrada de Leads', 'Prospecção', 'Gustavo Costa', '02/jul 21:08', '—'],
  ['Jota Xiseria', 'R$ 0', 'Reunião Agendada', 'Prospecção', 'Gustavo Costa', '02/jul 21:07', '—'],
  ['Mangiare Massas Artesanais SCS', 'R$ 0', 'Entrada de Leads', 'Prospecção', 'Gustavo Costa', '02/jul 21:06', '—'],
  ['BORRIELLO', 'R$ 0', 'Entrada de Leads', 'Prospecção', 'Gustavo Costa', '02/jul 21:05', '—'],
  ['Vulgo Vito Restaurante', 'R$ 0', 'Entrada de Leads', 'Prospecção', 'Gustavo Costa', '02/jul 21:05', '—'],
];
const REUNIOES_PROSP: Reg[] = [
  ['Jota Xiseria', 'R$ 0', 'Reunião Agendada', 'Prospecção', 'Gustavo Costa', '02/jul 21:07', '—'],
  ['Pastello Pastelaria', 'R$ 0', 'Reunião Agendada', 'Prospecção', 'Gustavo Costa', '02/jul 20:56', '—'],
  ['Casa Rhammer pizza artesanal', 'R$ 0', 'Reunião Agendada', 'Prospecção', 'Gustavo Costa', '02/jul 18:32', 'Perdido'],
  ['Bolonhê | FISPAL', 'R$ 0', 'Reunião Agendada', 'Prospecção', 'Gustavo Costa', '02/jul 18:26', '—'],
  ['Cyborg Lanches', 'R$ 0', 'Reunião Agendada', 'Prospecção', 'Gustavo Costa', '02/jul 16:51', 'Ganho'],
];
const DECISOR_PROSP: Reg[] = [
  ['Jota Xiseria', 'R$ 0', 'Reunião Agendada', 'Prospecção', 'Gustavo Costa', '02/jul 21:07', '—'],
  ['Pastello Pastelaria', 'R$ 0', 'Reunião Agendada', 'Prospecção', 'Gustavo Costa', '02/jul 20:56', '—'],
  ['Pizzaria Buona Gente', 'R$ 0', 'Contato realizado com o decisor', 'Prospecção', 'Gustavo Costa', '02/jul 20:44', '—'],
  ['Casa Rhammer pizza artesanal', 'R$ 0', 'Reunião Agendada', 'Prospecção', 'Gustavo Costa', '02/jul 18:32', 'Perdido'],
  ['Bolonhê | FISPAL', 'R$ 0', 'Reunião Agendada', 'Prospecção', 'Gustavo Costa', '02/jul 18:26', '—'],
];
const ATIVPROSP: Reg[] = [
  ['WhatsApp', 'WHATSAPP', 'Concluída', '08/jul 18:00', 'Gustavo Costa', '08/jul 17:01'],
  ['Dia 2 - ligação 2', 'CALL', 'Pendente', '09/jul 16:42', 'Gustavo Costa', '08/jul 16:42'],
  ['Dia 1 - ligação 1', 'CALL', 'Concluída', '08/jul 16:42', 'Gustavo Costa', '08/jul 16:42'],
  ['Dia 2 - ligação 2', 'CALL', 'Pendente', '09/jul 16:42', 'Gustavo Costa', '08/jul 16:42'],
  ['Dia 1 - ligação 1', 'CALL', 'Concluída', '08/jul 16:42', 'Gustavo Costa', '08/jul 16:42'],
];
const INB1: Reg[] = [
  ['Casa de assados Morsch', 'R$ 0', 'Reunião Agendada', 'Inbound', 'Gustavo Costa', '02/jul 09:32', 'Ganho'],
];
const INSTA: Reg[] = [
  ['Dia 1 - Instagram 1', 'INSTAGRAM', 'Concluída', '02/jul 16:25', 'Gustavo Costa', '02/jul 16:25'],
];
const SSDEALS: Reg[] = [
  ['Cohab Burger', 'R$ 0', 'Reunião Agendada', 'Social Selling', 'Gustavo Costa', '02/jul 15:18', 'Ganho'],
  ['Santa Pizza Gourmet | SCS', 'R$ 0', 'Reunião Agendada', 'Social Selling', 'Gustavo Costa', '01/jul 16:13', 'Ganho'],
];
const ATIVNEG: Reg[] = [
  ['Confirmação da Reunião [Normal]', 'WHATSAPP', 'Pendente', '09/jul 16:04', 'Gustavo Costa', '08/jul 16:04'],
  ['Confirmação da Reunião [Normal]', 'WHATSAPP', 'Concluída', '03/jul 17:49', 'Gustavo Costa', '02/jul 17:49'],
  ['Confirmação da Reunião [Normal]', 'WHATSAPP', 'Concluída', '03/jul 15:17', 'Gustavo Costa', '02/jul 15:17'],
];
const NEGOPEN: Reg[] = [
  ['[R1] - [R1] - Lado Burger | FISPAL', 'R$ 0', 'Apresentar proposta', 'Negociação', 'Gustavo Costa', '08/jul 16:04', '—'],
  ['[R1] - Casa de assados Morsch', 'R$ 4.150', 'Apresentar proposta', 'Negociação', 'Gustavo Costa', '07/jul 16:08', '—'],
  ['[R1] - House Sushi SCS', 'R$ 8.000', 'Apresentar proposta', 'Negociação', 'Gustavo Costa', '06/jul 15:53', '—'],
  ['[R1] - Santa Pizza Gourmet | SCS', 'R$ 4.000', 'Apresentar proposta', 'Negociação', 'Gustavo Costa', '06/jul 11:35', '—'],
  ['[R2] - Cohab Burger', 'R$ 0', 'Apresentar proposta', 'Negociação', 'Gustavo Costa', '02/jul 17:55', '—'],
];
const V: Reg[] = [];

// Os 35 relatórios do wireframe (ordem e conteúdo originais).
const REPORTS: Report[] = [
  { g: 'Geral', n: 'Ganhos vs Perdidos', e: 'Negócios', v: 'Pizza', vp: 'Status', d: 'Proporção de negócios por status.', rec: { count: 54, cols: COLS_NEG, rows: UNF } },
  { g: 'Geral', n: 'Receita Mensal', e: 'Negócios', v: 'Barras', vp: 'Data de fechamento (mês)', d: 'Receita ganha mês a mês. Soma de Valor (R$). Filtro: apenas ganhos · Período: Este ano.', rec: { count: 71, cols: COLS_NEG, rows: RECEITA } },
  { g: 'Geral', n: 'Negócios Criados por Dia', e: 'Negócios', v: 'Barras', vp: 'Data de criação (dia)', d: 'Volume de negócios criados por dia. Contagem.', rec: { count: 54, cols: COLS_NEG, rows: UNF } },
  { g: 'Geral', n: 'Receita por Responsável', e: 'Negócios', v: 'Barras', vp: 'Responsável', d: 'Receita ganha por vendedor. Soma de Valor (R$). Filtro: apenas ganhos.', rec: { count: 4, cols: COLS_NEG, rows: GANHOS } },
  { g: 'Geral', n: 'Negócios por Responsável', e: 'Negócios', v: 'Barras empilhadas', vp: 'Responsável', d: 'Negócios por vendedor, segmentados por Status. Contagem.', rec: { count: 54, cols: COLS_NEG, rows: UNF } },
  { g: 'Prospecção', n: 'Mix de Atividades', e: 'Atividades', v: 'Barras empilhadas', vp: 'Responsável', d: 'Atividades por vendedor, por tipo (segmentado por tipo de atividade).', rec: { count: 53, cols: COLS_ATIV, rows: ATIVPROSP } },
  { g: 'Prospecção', n: 'Atividades por Responsável', e: 'Atividades', v: 'Barras empilhadas', vp: 'Responsável', d: 'Atividades por vendedor: concluídas vs pendentes.', rec: { count: 53, cols: COLS_ATIV, rows: ATIVPROSP } },
  { g: 'Prospecção', n: 'Negócios Abertos por Etapa', e: 'Negócios', v: 'Barras', vp: 'Etapa', d: 'Negócios em aberto por etapa (apenas abertos).', rec: { count: 39, cols: COLS_NEG, rows: PROSPOPEN } },
  { g: 'Prospecção', n: 'Funil de Conversão', e: 'Negócios', v: 'Funil', vp: 'Etapa', d: 'Conversão entre etapas do funil.', rec: { count: 44, cols: COLS_NEG, rows: PROSPOPEN } },
  { g: 'Prospecção', n: 'Leads Ganhos', e: 'Negócios', v: 'Cartão nº', vp: '', d: 'Total de negócios ganhos (apenas ganhos).', rec: { count: 1, cols: COLS_NEG, rows: [GANHOS[0]] } },
  { g: 'Prospecção', n: 'Reuniões Agendadas', e: 'Negócios', v: 'Cartão nº', vp: '', d: 'Negócios que atingiram a etapa de Reunião (marco).', rec: { count: 5, cols: COLS_NEG, rows: REUNIOES_PROSP } },
  { g: 'Prospecção', n: 'Contatos Realizados com Decisor', e: 'Negócios', v: 'Cartão nº', vp: '', d: 'Negócios que atingiram a etapa Contato com decisor.', rec: { count: 8, cols: COLS_NEG, rows: DECISOR_PROSP } },
  { g: 'Prospecção', n: 'Novos Leads no Funil', e: 'Negócios', v: 'Cartão nº', vp: '', d: 'Negócios que entraram na 1ª etapa do funil.', rec: { count: 44, cols: COLS_NEG, rows: PROSPOPEN } },
  { g: 'Inbound', n: 'Mix de Atividades', e: 'Atividades', v: 'Barras empilhadas', vp: 'Responsável', d: 'Atividades por vendedor, por tipo.', rec: { count: 0, cols: COLS_ATIV, rows: V } },
  { g: 'Inbound', n: 'Atividades por Responsável', e: 'Atividades', v: 'Barras empilhadas', vp: 'Responsável', d: 'Atividades por vendedor: concluídas vs pendentes.', rec: { count: 0, cols: COLS_ATIV, rows: V } },
  { g: 'Inbound', n: 'Negócios Abertos por Etapa', e: 'Negócios', v: 'Barras', vp: 'Etapa', d: 'Negócios em aberto por etapa.', rec: { count: 0, cols: COLS_NEG, rows: V } },
  { g: 'Inbound', n: 'Funil de Conversão', e: 'Negócios', v: 'Funil', vp: 'Etapa', d: 'Conversão entre etapas do funil.', rec: { count: 1, cols: COLS_NEG, rows: INB1 } },
  { g: 'Inbound', n: 'Leads Ganhos', e: 'Negócios', v: 'Cartão nº', vp: '', d: 'Total de negócios ganhos.', rec: { count: 1, cols: COLS_NEG, rows: INB1 } },
  { g: 'Inbound', n: 'Reuniões Agendadas', e: 'Negócios', v: 'Cartão nº', vp: '', d: 'Negócios que atingiram a etapa de Reunião.', rec: { count: 1, cols: COLS_NEG, rows: INB1 } },
  { g: 'Inbound', n: 'Leads Qualificados pelo Formulário', e: 'Negócios', v: 'Cartão nº', vp: '', d: 'Negócios na etapa Qualificado pelo formulário.', rec: { count: 1, cols: COLS_NEG, rows: INB1 } },
  { g: 'Inbound', n: 'Leads em Formulário Preenchido', e: 'Negócios', v: 'Cartão nº', vp: '', d: 'Negócios na etapa Formulário preenchido.', rec: { count: 1, cols: COLS_NEG, rows: INB1 } },
  { g: 'Social Selling', n: 'Mix de Atividades', e: 'Atividades', v: 'Barras empilhadas', vp: 'Responsável', d: 'Atividades por vendedor, por tipo.', rec: { count: 1, cols: COLS_ATIV, rows: INSTA } },
  { g: 'Social Selling', n: 'Atividades por Responsável', e: 'Atividades', v: 'Barras empilhadas', vp: 'Responsável', d: 'Atividades por vendedor: concluídas vs pendentes.', rec: { count: 1, cols: COLS_ATIV, rows: INSTA } },
  { g: 'Social Selling', n: 'Negócios Abertos por Etapa', e: 'Negócios', v: 'Barras', vp: 'Etapa', d: 'Negócios em aberto por etapa.', rec: { count: 0, cols: COLS_NEG, rows: V } },
  { g: 'Social Selling', n: 'Funil de Conversão', e: 'Negócios', v: 'Funil', vp: 'Etapa', d: 'Conversão entre etapas do funil.', rec: { count: 2, cols: COLS_NEG, rows: SSDEALS } },
  { g: 'Social Selling', n: 'Leads Ganhos', e: 'Negócios', v: 'Cartão nº', vp: '', d: 'Total de negócios ganhos.', rec: { count: 2, cols: COLS_NEG, rows: SSDEALS } },
  { g: 'Social Selling', n: 'Reuniões Agendadas', e: 'Negócios', v: 'Cartão nº', vp: '', d: 'Negócios que atingiram a etapa de Reunião.', rec: { count: 2, cols: COLS_NEG, rows: SSDEALS } },
  { g: 'Social Selling', n: 'Novos Leads no Funil', e: 'Negócios', v: 'Cartão nº', vp: '', d: 'Negócios que entraram na 1ª etapa (MQL cadastrado).', rec: { count: 2, cols: COLS_NEG, rows: SSDEALS } },
  { g: 'Negociação', n: 'Mix de Atividades', e: 'Atividades', v: 'Barras empilhadas', vp: 'Responsável', d: 'Atividades por vendedor, por tipo.', rec: { count: 3, cols: COLS_ATIV, rows: ATIVNEG } },
  { g: 'Negociação', n: 'Atividades por Responsável', e: 'Atividades', v: 'Barras empilhadas', vp: 'Responsável', d: 'Atividades por vendedor: concluídas vs pendentes.', rec: { count: 3, cols: COLS_ATIV, rows: ATIVNEG } },
  { g: 'Negociação', n: 'Negócios Abertos por Etapa', e: 'Negócios', v: 'Barras', vp: 'Etapa', d: 'Negócios em aberto por etapa (Apresentar proposta, Negociação, Contrato, Pagamento).', rec: { count: 6, cols: COLS_NEG, rows: NEGOPEN } },
  { g: 'Negociação', n: 'Funil de Conversão', e: 'Negócios', v: 'Funil', vp: 'Etapa', d: 'Conversão entre etapas do funil.', rec: { count: 7, cols: COLS_NEG, rows: NEGOPEN } },
  { g: 'Negociação', n: 'Leads Ganhos', e: 'Negócios', v: 'Cartão nº', vp: '', d: 'Total de negócios ganhos.', rec: { count: 0, cols: COLS_NEG, rows: V } },
  { g: 'Negociação', n: 'Reuniões Agendadas', e: 'Negócios', v: 'Cartão nº', vp: '', d: 'Negócios que atingiram a etapa de Reunião.', rec: { count: 0, cols: COLS_NEG, rows: V } },
  { g: 'Negociação', n: 'Novos Leads no Funil', e: 'Negócios', v: 'Cartão nº', vp: '', d: 'Negócios que entraram na 1ª etapa do funil.', rec: { count: 0, cols: COLS_NEG, rows: V } },
];

const GRUPOS = ['Geral', 'Prospecção', 'Inbound', 'Social Selling', 'Negociação'];

/* ── View padrão: "Meu Painel" (conteúdo original da tela) ────────────────── */
function MeuPainelView() {
  return (
    <>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Meu Painel</h2>
        <div style={{ flex: 1 }} />
        <Badge cor="neutro">Este mês ▾</Badge>
        <Badge cor="neutro">Todos os usuários ▾</Badge>
      </div>

      <div style={{ fontSize: 10, letterSpacing: 1, color: 'var(--texto-fraco)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 8 }}>Prospecção</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <Kpi rotulo="Novos Leads no Funil" valor="46" hint="Entrada de Leads" />
        <Kpi rotulo="Contatos c/ Decisor" valor="8" hint="no período" />
        <Kpi rotulo="Reuniões Agendadas" valor="3" hint="no período" />
        <Kpi rotulo="Leads Ganhos" valor="1" hint="no período" cor="var(--verde)" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 14 }}>
        <Painel titulo={<>Funil de Conversão <Badge cor="azul">Prospecção</Badge></>}>
          <div style={{ color: 'var(--texto-fraco)', fontSize: 11, marginBottom: 6 }}>Taxa de ganho: 2%</div>
          <Barras alturas={[90, 70, 45, 30, 18, 8]} />
        </Painel>
        <Painel titulo="Negócios Abertos por Etapa">
          <Barras alturas={[95, 25, 12, 28, 22]} />
        </Painel>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 14 }}>
        <Kpi rotulo="Inbound · Ganhos" valor="1" hint="taxa 100%" cor="var(--verde)" />
        <Kpi rotulo="Social Selling · Ganhos" valor="2" hint="taxa 100%" cor="var(--verde)" />
        <Kpi rotulo="Negociação · Ganhos" valor="0" hint="taxa 0%" />
      </div>
    </>
  );
}

/* ── Gráfico placeholder conforme o tipo do relatório ─────────────────────── */
function GraficoDoRelatorio({ report }: { report: Report }) {
  if (report.v.indexOf('Cartão') >= 0) {
    return (
      <div style={{ textAlign: 'center', margin: '22px 0' }}>
        <div style={{ fontSize: 48, fontWeight: 800, lineHeight: 1 }}>{report.rec.count}</div>
        <div style={{ color: 'var(--texto-fraco)', fontSize: 12 }}>nº no período</div>
      </div>
    );
  }
  if (report.v === 'Funil') return <Barras alturas={[95, 70, 45, 28, 12]} />;
  if (report.v === 'Pizza') {
    return (
      <div style={{ height: 120, border: '1px dashed var(--borda-forte)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--texto-fraco)', fontSize: 12 }}>
        🟢 Ganho · 🔵 Em aberto · 🔴 Perdido
      </div>
    );
  }
  return <Barras alturas={[30, 70, 45, 90, 60]} />;
}

/* ── View de um relatório selecionado ─────────────────────────────────────── */
function ReportView({ report }: { report: Report }) {
  const { rec } = report;
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>{report.n}</h2>
        <div style={{ flex: 1 }} />
        <Badge cor="neutro">📊 tipo de gráfico</Badge>
        <Badge cor="neutro">⭳ Exportar</Badge>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <Badge cor="azul">{report.g}</Badge>
        <Badge cor="neutro">{report.e}</Badge>
        <Badge cor="neutro">{report.v}</Badge>
        {report.vp && <Badge cor="neutro">Ver por: {report.vp}</Badge>}
      </div>
      <Card>
        <div style={{ color: 'var(--texto-fraco)', fontSize: 12.5, marginBottom: 10 }}>{report.d}</div>
        <GraficoDoRelatorio report={report} />
        <div style={{ fontSize: 10, letterSpacing: 1, color: 'var(--texto-fraco)', textTransform: 'uppercase', fontWeight: 700, margin: '12px 0 6px' }}>Registros · {rec.count}</div>
        {rec.rows.length > 0 ? (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table className="brk-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>{rec.cols.map((c) => <Th key={c}>{c}</Th>)}</tr>
                </thead>
                <tbody>
                  {rec.rows.map((row, ri) => (
                    <tr key={ri}>
                      {row.map((cell, ci) => <Td key={ci}>{rec.cols[ci] === 'Status' ? statusTag(cell) : cell}</Td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rec.count > rec.rows.length && <div style={{ color: 'var(--texto-fraco)', fontSize: 11, marginTop: 6 }}>Exibindo {rec.rows.length} de {rec.count} registros.</div>}
          </>
        ) : (
          <div style={{ color: 'var(--texto-fraco)', fontSize: 12.5 }}>Sem registros para este relatório.</div>
        )}
      </Card>
    </>
  );
}

/* ── Submenu (Meu Painel + 35 relatórios agrupados por funil) ─────────────── */
function Submenu({ sel, onSel }: { sel: number | null; onSel: (v: number | null) => void }) {
  const itemStyle = (ativo: boolean): React.CSSProperties => ({
    padding: '7px 10px', borderRadius: 8, fontSize: 12.5, cursor: 'pointer',
    color: ativo ? 'var(--texto)' : 'var(--texto-suave)',
    background: ativo ? 'var(--superficie-3)' : 'transparent', fontWeight: ativo ? 600 : 400,
  });
  return (
    <Card>
      <div onClick={() => onSel(null)} style={itemStyle(sel === null)}>▦ Meu Painel</div>
      <div style={{ fontSize: 10, letterSpacing: 1, color: 'var(--texto-fraco)', textTransform: 'uppercase', fontWeight: 700, padding: '12px 10px 4px' }}>Relatórios · {REPORTS.length}</div>
      <div style={{ maxHeight: 460, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {GRUPOS.map((g) => (
          <div key={g}>
            <div style={{ fontSize: 10.5, color: 'var(--texto-fraco)', fontWeight: 700, padding: '8px 10px 2px' }}>{g}</div>
            {REPORTS.map((r, i) => (r.g === g ? (
              <div key={i} onClick={() => onSel(i)} style={itemStyle(sel === i)}>{r.n}</div>
            ) : null))}
          </div>
        ))}
      </div>
    </Card>
  );
}

export function Metricas() {
  const [sel, setSel] = useState<number | null>(null);
  return (
    <PaginaShell titulo="Métricas" subtitulo="Insights (BI) — painel próprio + 35 relatórios por funil">
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 240px) 1fr', gap: 16, alignItems: 'start' }}>
        <Submenu sel={sel} onSel={setSel} />
        <div>{sel === null ? <MeuPainelView /> : <ReportView report={REPORTS[sel]} />}</div>
      </div>
    </PaginaShell>
  );
}
