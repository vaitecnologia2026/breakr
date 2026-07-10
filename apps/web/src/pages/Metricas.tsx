// Tela "Métricas" (CRM Comercial) — Insights ligado a dados REAIS. Submenu com
// "Meu Painel" + os 35 relatórios (agrupados por funil, do wireframe DMhub) na
// esquerda; à direita, as métricas computadas dos Leads (/comercial/leads) e das
// Atividades (/comercial/atividades). Cada relatório mostra os registros reais
// que o mapeiam. Estados carregando/erro no padrão do app.
import { Fragment, useEffect, useState, type ReactNode } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { podeVerBloco } from '../lib/permissoes';
import { comDemo, mockSeDemo } from '../lib/demo';
import { PaginaShell, EstadoCarregando, EstadoErro } from '../components/primitivos';
import { Card, Badge, Th, Td } from '../components/ui';

type StatusLead = 'NOVO' | 'CONTATADO' | 'QUALIFICADO' | 'PROPOSTA' | 'GANHO' | 'PERDIDO';
interface Lead {
  id: string; nome: string; empresa: string | null; origem: string | null; status: StatusLead;
  valorEstimado: string | null; criadoEm: string; responsavel?: { nome: string } | null;
}
interface Atividade {
  id: string; titulo: string; tipo: string; status: 'PENDENTE' | 'CONCLUIDA';
  vencimento: string | null; responsavel?: { nome: string } | null;
}

const MOCK_LEADS: Lead[] = [
  { id: 'm1', nome: 'Casa de assados Morsch', empresa: null, origem: 'Inbound', status: 'PROPOSTA', valorEstimado: '4150', criadoEm: '2026-07-07T16:08:00Z', responsavel: { nome: 'Gustavo Costa' } },
  { id: 'm2', nome: 'Cyborg Lanches', empresa: null, origem: 'Prospecção', status: 'GANHO', valorEstimado: '0', criadoEm: '2026-07-02T16:51:00Z', responsavel: { nome: 'Gustavo Costa' } },
  { id: 'm3', nome: 'Empório da Lasanha', empresa: null, origem: 'Prospecção', status: 'PERDIDO', valorEstimado: '0', criadoEm: '2026-07-02T12:05:00Z', responsavel: { nome: 'Gustavo Costa' } },
];
const MOCK_ATIV: Atividade[] = [
  { id: 'a1', titulo: 'WhatsApp', tipo: 'WHATSAPP', status: 'CONCLUIDA', vencimento: '2026-07-08T18:00:00Z', responsavel: { nome: 'Gustavo Costa' } },
];

const ROTULO_STATUS: Record<StatusLead, string> = {
  NOVO: 'Novo', CONTATADO: 'Contatado', QUALIFICADO: 'Qualificado', PROPOSTA: 'Proposta', GANHO: 'Ganho', PERDIDO: 'Perdido',
};

interface Report { g: string; n: string; e: string; v: string; vp: string; d: string; }
// Metadados dos 35 relatórios (do wireframe DMhub) — os NÚMEROS/registros vêm do banco.
const REPORTS: Report[] = [
  { g: 'Geral', n: 'Ganhos vs Perdidos', e: 'Negócios', v: 'Pizza', vp: 'Status', d: 'Proporção de negócios por status.' },
  { g: 'Geral', n: 'Receita Mensal', e: 'Negócios', v: 'Barras', vp: 'Data de fechamento (mês)', d: 'Receita ganha mês a mês (apenas ganhos).' },
  { g: 'Geral', n: 'Negócios Criados por Dia', e: 'Negócios', v: 'Barras', vp: 'Data de criação (dia)', d: 'Volume de negócios criados.' },
  { g: 'Geral', n: 'Receita por Responsável', e: 'Negócios', v: 'Barras', vp: 'Responsável', d: 'Receita ganha por vendedor (apenas ganhos).' },
  { g: 'Geral', n: 'Negócios por Responsável', e: 'Negócios', v: 'Barras empilhadas', vp: 'Responsável', d: 'Negócios por vendedor, por status.' },
  { g: 'Prospecção', n: 'Mix de Atividades', e: 'Atividades', v: 'Barras empilhadas', vp: 'Responsável', d: 'Atividades por vendedor, por tipo.' },
  { g: 'Prospecção', n: 'Atividades por Responsável', e: 'Atividades', v: 'Barras empilhadas', vp: 'Responsável', d: 'Atividades por vendedor: concluídas vs pendentes.' },
  { g: 'Prospecção', n: 'Negócios Abertos por Etapa', e: 'Negócios', v: 'Barras', vp: 'Etapa', d: 'Negócios em aberto por etapa.' },
  { g: 'Prospecção', n: 'Funil de Conversão', e: 'Negócios', v: 'Funil', vp: 'Etapa', d: 'Conversão entre etapas do funil.' },
  { g: 'Prospecção', n: 'Leads Ganhos', e: 'Negócios', v: 'Cartão nº', vp: '', d: 'Total de negócios ganhos.' },
  { g: 'Prospecção', n: 'Reuniões Agendadas', e: 'Negócios', v: 'Cartão nº', vp: '', d: 'Negócios na etapa de proposta/reunião.' },
  { g: 'Prospecção', n: 'Contatos Realizados com Decisor', e: 'Negócios', v: 'Cartão nº', vp: '', d: 'Negócios que atingiram contato/qualificação.' },
  { g: 'Prospecção', n: 'Novos Leads no Funil', e: 'Negócios', v: 'Cartão nº', vp: '', d: 'Negócios na 1ª etapa do funil.' },
  { g: 'Inbound', n: 'Mix de Atividades', e: 'Atividades', v: 'Barras empilhadas', vp: 'Responsável', d: 'Atividades por vendedor, por tipo.' },
  { g: 'Inbound', n: 'Atividades por Responsável', e: 'Atividades', v: 'Barras empilhadas', vp: 'Responsável', d: 'Atividades por vendedor: concluídas vs pendentes.' },
  { g: 'Inbound', n: 'Negócios Abertos por Etapa', e: 'Negócios', v: 'Barras', vp: 'Etapa', d: 'Negócios em aberto por etapa.' },
  { g: 'Inbound', n: 'Funil de Conversão', e: 'Negócios', v: 'Funil', vp: 'Etapa', d: 'Conversão entre etapas do funil.' },
  { g: 'Inbound', n: 'Leads Ganhos', e: 'Negócios', v: 'Cartão nº', vp: '', d: 'Total de negócios ganhos.' },
  { g: 'Inbound', n: 'Reuniões Agendadas', e: 'Negócios', v: 'Cartão nº', vp: '', d: 'Negócios na etapa de proposta/reunião.' },
  { g: 'Inbound', n: 'Leads Qualificados pelo Formulário', e: 'Negócios', v: 'Cartão nº', vp: '', d: 'Negócios qualificados.' },
  { g: 'Inbound', n: 'Leads em Formulário Preenchido', e: 'Negócios', v: 'Cartão nº', vp: '', d: 'Negócios novos no funil.' },
  { g: 'Social Selling', n: 'Mix de Atividades', e: 'Atividades', v: 'Barras empilhadas', vp: 'Responsável', d: 'Atividades por vendedor, por tipo.' },
  { g: 'Social Selling', n: 'Atividades por Responsável', e: 'Atividades', v: 'Barras empilhadas', vp: 'Responsável', d: 'Atividades por vendedor: concluídas vs pendentes.' },
  { g: 'Social Selling', n: 'Negócios Abertos por Etapa', e: 'Negócios', v: 'Barras', vp: 'Etapa', d: 'Negócios em aberto por etapa.' },
  { g: 'Social Selling', n: 'Funil de Conversão', e: 'Negócios', v: 'Funil', vp: 'Etapa', d: 'Conversão entre etapas do funil.' },
  { g: 'Social Selling', n: 'Leads Ganhos', e: 'Negócios', v: 'Cartão nº', vp: '', d: 'Total de negócios ganhos.' },
  { g: 'Social Selling', n: 'Reuniões Agendadas', e: 'Negócios', v: 'Cartão nº', vp: '', d: 'Negócios na etapa de proposta/reunião.' },
  { g: 'Social Selling', n: 'Novos Leads no Funil', e: 'Negócios', v: 'Cartão nº', vp: '', d: 'Negócios na 1ª etapa do funil.' },
  { g: 'Negociação', n: 'Mix de Atividades', e: 'Atividades', v: 'Barras empilhadas', vp: 'Responsável', d: 'Atividades por vendedor, por tipo.' },
  { g: 'Negociação', n: 'Atividades por Responsável', e: 'Atividades', v: 'Barras empilhadas', vp: 'Responsável', d: 'Atividades por vendedor: concluídas vs pendentes.' },
  { g: 'Negociação', n: 'Negócios Abertos por Etapa', e: 'Negócios', v: 'Barras', vp: 'Etapa', d: 'Negócios em aberto por etapa.' },
  { g: 'Negociação', n: 'Funil de Conversão', e: 'Negócios', v: 'Funil', vp: 'Etapa', d: 'Conversão entre etapas do funil.' },
  { g: 'Negociação', n: 'Leads Ganhos', e: 'Negócios', v: 'Cartão nº', vp: '', d: 'Total de negócios ganhos.' },
  { g: 'Negociação', n: 'Reuniões Agendadas', e: 'Negócios', v: 'Cartão nº', vp: '', d: 'Negócios na etapa de proposta/reunião.' },
  { g: 'Negociação', n: 'Novos Leads no Funil', e: 'Negócios', v: 'Cartão nº', vp: '', d: 'Negócios na 1ª etapa do funil.' },
];
const GRUPOS = ['Geral', 'Prospecção', 'Inbound', 'Social Selling', 'Negociação'];

function brl(v: string | null): string {
  const n = v ? Number(v) : 0;
  return `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function statusTag(s: StatusLead): ReactNode {
  if (s === 'GANHO') return <Badge cor="verde">Ganho</Badge>;
  if (s === 'PERDIDO') return <Badge cor="vermelho">Perdido</Badge>;
  return ROTULO_STATUS[s];
}

// Filtra os leads reais conforme o relatório selecionado (mapeamento aproximado
// para os status do sistema — GANHO/PERDIDO/abertos/etapas).
function leadsDoRelatorio(n: string, leads: Lead[]): Lead[] {
  const abertos = (l: Lead) => l.status !== 'GANHO' && l.status !== 'PERDIDO';
  if (n.includes('Ganhos vs Perdidos')) return leads.filter((l) => l.status === 'GANHO' || l.status === 'PERDIDO');
  if (n.includes('Leads Ganhos') || n.includes('Receita')) return leads.filter((l) => l.status === 'GANHO');
  if (n.includes('Reuniões')) return leads.filter((l) => l.status === 'PROPOSTA');
  if (n.includes('Decisor')) return leads.filter((l) => l.status === 'CONTATADO' || l.status === 'QUALIFICADO');
  if (n.includes('Qualificados')) return leads.filter((l) => l.status === 'QUALIFICADO');
  if (n.includes('Formulário') || n.includes('Novos Leads')) return leads.filter((l) => l.status === 'NOVO');
  if (n.includes('Abertos') || n.includes('Funil')) return leads.filter(abertos);
  return leads;
}

// ── Paleta e rótulos dos gráficos (tema do app) ──
const COR_STATUS: Record<StatusLead, string> = { NOVO: '#3b82f6', CONTATADO: '#f59e0b', QUALIFICADO: '#FF9406', PROPOSTA: '#8b5cf6', GANHO: '#22c55e', PERDIDO: '#ef4444' };
const PALETA = ['#3b82f6', '#22c55e', '#FF9406', '#8b5cf6', '#ef4444', '#14b8a6', '#eab308', '#ec4899'];
const FUNIL_ORDEM: StatusLead[] = ['NOVO', 'CONTATADO', 'QUALIFICADO', 'PROPOSTA', 'GANHO'];
const FUNIL_LABEL: Record<StatusLead, string> = { NOVO: 'Entrada de Leads', CONTATADO: 'Tentando contato', QUALIFICADO: 'Contato realizado', PROPOSTA: 'Contato com decisor', GANHO: 'Ganho', PERDIDO: 'Perdido' };
const MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
function diaLabel(iso: string): string { const d = new Date(iso + 'T00:00'); return `${String(d.getDate()).padStart(2, '0')} de ${MES[d.getMonth()]}`; }
function mesLabel(iso: string): string { const d = new Date(iso + 'T00:00'); return MES[d.getMonth()]; }
function agrupar<T>(itens: T[], chaveFn: (x: T) => string): { chave: string; itens: T[] }[] {
  const mapa = new Map<string, T[]>();
  for (const it of itens) { const k = chaveFn(it); const arr = mapa.get(k) ?? []; arr.push(it); mapa.set(k, arr); }
  return Array.from(mapa.entries()).map(([chave, itens]) => ({ chave, itens }));
}

function VazioMini() {
  return <div style={{ textAlign: 'center', color: 'var(--texto-fraco)', fontSize: 12.5, padding: '28px 0' }}>Nenhum dado encontrado</div>;
}
function Painel({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <Card>
      <h3 style={{ fontSize: 13.5, fontWeight: 700, margin: '0 0 12px' }}>{titulo}</h3>
      {children}
    </Card>
  );
}
function SecaoTitulo({ texto }: { texto: string }) {
  return <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, color: 'var(--texto-fraco)', textTransform: 'uppercase', margin: '8px 0 2px' }}>{texto}</div>;
}
function CartaoKpi({ titulo, sub, valor, cor }: { titulo: string; sub: string; valor: number; cor?: string }) {
  return (
    <Card>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--texto)' }}>{titulo}</div>
      <div style={{ fontSize: 10, letterSpacing: 0.5, color: 'var(--texto-fraco)', textTransform: 'uppercase', fontWeight: 700, margin: '3px 0 8px' }}>{sub}</div>
      <div style={{ fontSize: 30, fontWeight: 800, color: cor ?? 'var(--texto)', lineHeight: 1 }}>{valor}</div>
      <div style={{ fontSize: 11, color: 'var(--texto-fraco)', marginTop: 4 }}>no período</div>
    </Card>
  );
}
// Barras verticais simples (contagem ou moeda).
function BarrasV({ dados, moeda }: { dados: { rotulo: string; valor: number; cor: string }[]; moeda?: boolean }) {
  if (dados.length === 0 || dados.every((d) => d.valor === 0)) return <VazioMini />;
  const max = Math.max(...dados.map((d) => d.valor), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 170, paddingTop: 18, overflowX: 'auto' }}>
      {dados.map((d, i) => (
        <div key={i} style={{ flex: '1 0 44px', display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', minWidth: 44 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--texto-suave)', marginBottom: 3, whiteSpace: 'nowrap' }}>{moeda ? brl(String(d.valor)) : d.valor}</div>
          <div style={{ width: '100%', maxWidth: 46, height: `${(d.valor / max) * 100}%`, minHeight: d.valor > 0 ? 4 : 0, background: d.cor, borderRadius: '4px 4px 0 0' }} />
          <div style={{ fontSize: 10.5, color: 'var(--texto-fraco)', marginTop: 6, textAlign: 'center', maxWidth: 80, lineHeight: 1.2 }}>{d.rotulo}</div>
        </div>
      ))}
    </div>
  );
}
// Funil de conversão (barras decrescentes + % entre etapas).
function Funil({ etapas }: { etapas: { rotulo: string; valor: number }[] }) {
  if (etapas.every((e) => e.valor === 0)) return <VazioMini />;
  const max = Math.max(...etapas.map((e) => e.valor), 1);
  const taxa = etapas[0].valor > 0 ? Math.round((etapas[etapas.length - 1].valor / etapas[0].valor) * 100) : 0;
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Taxa de ganho: {taxa}%</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 170, paddingTop: 18, overflowX: 'auto' }}>
        {etapas.map((e, i) => (
          <Fragment key={i}>
            <div style={{ flex: '1 0 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', minWidth: 40 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--texto-suave)', marginBottom: 3 }}>{e.valor}</div>
              <div style={{ width: '100%', maxWidth: 44, height: `${(e.valor / max) * 100}%`, minHeight: e.valor > 0 ? 4 : 0, background: i === etapas.length - 1 ? '#22c55e' : '#FF9406', borderRadius: '4px 4px 0 0' }} />
              <div style={{ fontSize: 10, color: 'var(--texto-fraco)', marginTop: 6, textAlign: 'center', maxWidth: 64, lineHeight: 1.2 }}>{e.rotulo}</div>
            </div>
            {i < etapas.length - 1 && (
              <div style={{ alignSelf: 'center', fontSize: 10, fontWeight: 700, background: 'var(--superficie-4)', color: 'var(--texto-suave)', borderRadius: 6, padding: '2px 5px', whiteSpace: 'nowrap' }}>
                {etapas[i].valor > 0 ? Math.round((etapas[i + 1].valor / etapas[i].valor) * 100) : 0}%
              </div>
            )}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
// Barras horizontais empilhadas por grupo (responsável) + legenda.
function BarrasEmpilhadasH({ grupos, legenda }: { grupos: { rotulo: string; total: number; segmentos: { nome: string; valor: number; cor: string }[] }[]; legenda: { nome: string; cor: string }[] }) {
  const validos = grupos.filter((g) => g.total > 0);
  if (validos.length === 0) return <VazioMini />;
  const max = Math.max(...grupos.map((g) => g.total), 1);
  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {validos.map((g, i) => (
          <div key={i}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, marginBottom: 4 }}>
              <span style={{ color: 'var(--texto-suave)' }}>{g.rotulo}</span>
              <span style={{ color: 'var(--texto-fraco)', fontWeight: 700 }}>{g.total}</span>
            </div>
            <div style={{ display: 'flex', height: 22, borderRadius: 5, overflow: 'hidden', background: 'var(--superficie-3)', width: `${(g.total / max) * 100}%`, minWidth: 40 }}>
              {g.segmentos.filter((s) => s.valor > 0).map((s, j) => (
                <div key={j} title={`${s.nome}: ${s.valor}`} style={{ flex: s.valor, background: s.cor }} />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 12 }}>
        {legenda.map((l, i) => (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--texto-fraco)' }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: l.cor }} />{l.nome}
          </span>
        ))}
      </div>
    </div>
  );
}
// Pizza (CSS conic-gradient) + legenda.
function Pizza({ fatias }: { fatias: { nome: string; valor: number; cor: string }[] }) {
  const total = fatias.reduce((s, f) => s + f.valor, 0);
  if (total === 0) return <VazioMini />;
  let acc = 0;
  const paradas = fatias.map((f) => { const ini = (acc / total) * 360; acc += f.valor; const fim = (acc / total) * 360; return `${f.cor} ${ini}deg ${fim}deg`; }).join(', ');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '8px 0' }}>
      <div style={{ width: 140, height: 140, borderRadius: '50%', background: `conic-gradient(${paradas})` }} />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, justifyContent: 'center' }}>
        {fatias.map((f, i) => (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--texto-suave)' }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: f.cor }} />{f.nome} <b>{f.valor}</b>
          </span>
        ))}
      </div>
    </div>
  );
}

// Uma seção de funil (Prospecção/Inbound/Social Selling/Negociação): KPIs +
// Funil + Negócios Abertos por Etapa + Atividades por Responsável + Mix.
function SecaoFunil({ titulo, leads, ativ, kpis }: { titulo: string; leads: Lead[]; ativ: Atividade[]; kpis: { titulo: string; sub: string; valor: number; cor?: string }[] }) {
  const idx = (s: StatusLead) => FUNIL_ORDEM.indexOf(s);
  const etapasFunil = FUNIL_ORDEM.map((s, i) => ({ rotulo: FUNIL_LABEL[s], valor: leads.filter((l) => l.status !== 'PERDIDO' && idx(l.status) >= i).length }));
  const abertosEtapa = (['NOVO', 'CONTATADO', 'QUALIFICADO', 'PROPOSTA'] as StatusLead[]).map((s) => ({ rotulo: FUNIL_LABEL[s], valor: leads.filter((l) => l.status === s).length, cor: COR_STATUS[s] }));
  const respAtiv = agrupar(ativ, (a) => a.responsavel?.nome ?? '—');
  const tipos = Array.from(new Set(ativ.map((a) => a.tipo)));
  const atividadesResp = respAtiv.map(({ chave, itens }) => ({ rotulo: chave, total: itens.length, segmentos: [{ nome: 'Concluída', valor: itens.filter((a) => a.status === 'CONCLUIDA').length, cor: '#22c55e' }, { nome: 'Pendente', valor: itens.filter((a) => a.status === 'PENDENTE').length, cor: '#3b82f6' }] }));
  const mixResp = respAtiv.map(({ chave, itens }) => ({ rotulo: chave, total: itens.length, segmentos: tipos.map((t, i) => ({ nome: t, valor: itens.filter((a) => a.tipo === t).length, cor: PALETA[i % PALETA.length] })) }));
  return (
    <>
      <SecaoTitulo texto={titulo} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 12 }}>
        {kpis.map((k, i) => <CartaoKpi key={i} {...k} />)}
      </div>
      <div className="brk-rsplit" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        <Painel titulo="Funil de Conversão"><Funil etapas={etapasFunil} /></Painel>
        <Painel titulo="Negócios Abertos por Etapa"><BarrasV dados={abertosEtapa} /></Painel>
      </div>
      <div className="brk-rsplit" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        <Painel titulo="Atividades por Responsável"><BarrasEmpilhadasH grupos={atividadesResp} legenda={[{ nome: 'Concluída', cor: '#22c55e' }, { nome: 'Pendente', cor: '#3b82f6' }]} /></Painel>
        <Painel titulo="Mix de Atividades"><BarrasEmpilhadasH grupos={mixResp} legenda={tipos.map((t, i) => ({ nome: t, cor: PALETA[i % PALETA.length] }))} /></Painel>
      </div>
    </>
  );
}

function MeuPainelView({ leads, ativ }: { leads: Lead[]; ativ: Atividade[] }) {
  const abertos = (l: Lead) => l.status !== 'GANHO' && l.status !== 'PERDIDO';
  const c = (arr: Lead[], s: StatusLead) => arr.filter((l) => l.status === s).length;
  const orig = (re: RegExp) => leads.filter((l) => re.test(l.origem ?? ''));
  const secProsp = orig(/prospec|scrap|outbound|cold|ativa/i);
  const secInbound = orig(/inbound|formul|form|site|organ/i);
  const secSocial = orig(/social|linkedin|instagram|facebook|rede|mql/i);
  const secNeg = leads.filter((l) => l.status === 'PROPOSTA' || l.status === 'GANHO' || l.status === 'PERDIDO');

  const respL = agrupar(leads, (l) => l.responsavel?.nome ?? '—');
  const statusTodos = [...FUNIL_ORDEM, 'PERDIDO' as StatusLead];
  const negPorResp = respL.map(({ chave, itens }) => ({ rotulo: chave, total: itens.length, segmentos: statusTodos.map((s) => ({ nome: ROTULO_STATUS[s], valor: itens.filter((l) => l.status === s).length, cor: COR_STATUS[s] })) }));
  const receitaResp = respL.map(({ chave, itens }) => ({ rotulo: chave, valor: itens.filter((l) => l.status === 'GANHO').reduce((s, l) => s + Number(l.valorEstimado || 0), 0), cor: '#3b82f6' }));

  const dias = Array.from(new Set(leads.map((l) => l.criadoEm.slice(0, 10)))).sort();
  const negPorDia = dias.map((d) => ({ rotulo: diaLabel(d), valor: leads.filter((l) => l.criadoEm.slice(0, 10) === d).length, cor: '#3b82f6' }));
  const meses = Array.from(new Set(leads.filter((l) => l.status === 'GANHO').map((l) => l.criadoEm.slice(0, 7)))).sort();
  const receitaMes = meses.map((m) => ({ rotulo: mesLabel(m + '-01'), valor: leads.filter((l) => l.status === 'GANHO' && l.criadoEm.slice(0, 7) === m).reduce((s, l) => s + Number(l.valorEstimado || 0), 0), cor: '#3b82f6' }));

  const ganhos = c(leads, 'GANHO');
  const perdidos = c(leads, 'PERDIDO');
  const emAberto = leads.filter(abertos).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Meu Painel</h2>

      <SecaoFunil titulo="Prospecção" leads={secProsp} ativ={ativ} kpis={[
        { titulo: 'Novos Leads no Funil', sub: 'Entrada de leads', valor: c(secProsp, 'NOVO') },
        { titulo: 'Contatos Realizados com Decisor', sub: 'Contato com o decisor', valor: c(secProsp, 'CONTATADO') + c(secProsp, 'QUALIFICADO') },
        { titulo: 'Reuniões Agendadas', sub: 'Reunião agendada', valor: c(secProsp, 'PROPOSTA') },
        { titulo: 'Leads Ganhos', sub: 'Ganhos', valor: c(secProsp, 'GANHO'), cor: 'var(--verde)' },
      ]} />

      <SecaoFunil titulo="Inbound" leads={secInbound} ativ={ativ} kpis={[
        { titulo: 'Leads em Formulário Preenchido', sub: 'Formulário preenchido', valor: c(secInbound, 'NOVO') },
        { titulo: 'Leads Qualificados pelo Formulário', sub: 'Qualificado pelo formulário', valor: c(secInbound, 'QUALIFICADO') },
        { titulo: 'Reuniões Agendadas', sub: 'Reunião agendada', valor: c(secInbound, 'PROPOSTA') },
        { titulo: 'Leads Ganhos', sub: 'Ganhos', valor: c(secInbound, 'GANHO'), cor: 'var(--verde)' },
      ]} />

      <SecaoFunil titulo="Social Selling" leads={secSocial} ativ={ativ} kpis={[
        { titulo: 'Novos Leads no Funil', sub: 'MQL cadastrado', valor: c(secSocial, 'NOVO') },
        { titulo: 'Reuniões Agendadas', sub: 'Reunião agendada', valor: c(secSocial, 'PROPOSTA') },
        { titulo: 'Leads Ganhos', sub: 'Ganhos', valor: c(secSocial, 'GANHO'), cor: 'var(--verde)' },
      ]} />

      <SecaoFunil titulo="Negociação" leads={secNeg} ativ={ativ} kpis={[
        { titulo: 'Novos Leads no Funil', sub: 'Reunião realizada', valor: c(secNeg, 'PROPOSTA') },
        { titulo: 'Reuniões Agendadas', sub: 'Reunião realizada', valor: c(secNeg, 'PROPOSTA') },
        { titulo: 'Leads Ganhos', sub: 'Ganhos', valor: c(secNeg, 'GANHO'), cor: 'var(--verde)' },
      ]} />

      <SecaoTitulo texto="Geral" />
      <div className="brk-rsplit" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        <Painel titulo="Negócios por Responsável"><BarrasEmpilhadasH grupos={negPorResp} legenda={statusTodos.map((s) => ({ nome: ROTULO_STATUS[s], cor: COR_STATUS[s] }))} /></Painel>
        <Painel titulo="Receita por Responsável"><BarrasV dados={receitaResp} moeda /></Painel>
      </div>
      <div className="brk-rsplit" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        <Painel titulo="Negócios Criados por Dia"><BarrasV dados={negPorDia} /></Painel>
        <Painel titulo="Receita Mensal"><BarrasV dados={receitaMes} moeda /></Painel>
      </div>
      <Painel titulo="Ganhos vs Perdidos">
        <Pizza fatias={[
          { nome: 'Em aberto', valor: emAberto, cor: '#ec4899' },
          { nome: 'Ganho', valor: ganhos, cor: '#3b82f6' },
          { nome: 'Perdido', valor: perdidos, cor: '#22c55e' },
        ]} />
      </Painel>
    </div>
  );
}

function ReportView({ report, leads, ativ }: { report: Report; leads: Lead[]; ativ: Atividade[] }) {
  const ehAtividade = report.e === 'Atividades';
  const linhas = ehAtividade ? ativ : leadsDoRelatorio(report.n, leads);
  const count = linhas.length;
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>{report.n}</h2>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <Badge cor="azul">{report.g}</Badge>
        <Badge cor="neutro">{report.e}</Badge>
        <Badge cor="neutro">{report.v}</Badge>
        {report.vp && <Badge cor="neutro">Ver por: {report.vp}</Badge>}
      </div>
      <Card>
        <div style={{ color: 'var(--texto-fraco)', fontSize: 12.5, marginBottom: 10 }}>{report.d}</div>
        {report.v.indexOf('Cartão') >= 0 && (
          <div style={{ textAlign: 'center', margin: '18px 0' }}>
            <div style={{ fontSize: 48, fontWeight: 800, lineHeight: 1 }}>{count}</div>
            <div style={{ color: 'var(--texto-fraco)', fontSize: 12 }}>no período</div>
          </div>
        )}
        <div style={{ fontSize: 10, letterSpacing: 1, color: 'var(--texto-fraco)', textTransform: 'uppercase', fontWeight: 700, margin: '4px 0 6px' }}>Registros · {count}</div>
        {count === 0 ? (
          <div style={{ color: 'var(--texto-fraco)', fontSize: 12.5 }}>Sem registros para este relatório.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="brk-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              {ehAtividade ? (
                <>
                  <thead><tr><Th>Título</Th><Th>Tipo</Th><Th>Status</Th><Th>Vencimento</Th><Th>Responsável</Th></tr></thead>
                  <tbody>
                    {ativ.map((a) => (
                      <tr key={a.id}>
                        <Td>{a.titulo}</Td>
                        <Td>{a.tipo}</Td>
                        <Td>{a.status === 'CONCLUIDA' ? <Badge cor="verde">Concluída</Badge> : 'Pendente'}</Td>
                        <Td>{a.vencimento ? new Date(a.vencimento).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}</Td>
                        <Td>{a.responsavel?.nome ?? '—'}</Td>
                      </tr>
                    ))}
                  </tbody>
                </>
              ) : (
                <>
                  <thead><tr><Th>Título</Th><Th>Valor</Th><Th>Etapa</Th><Th>Origem</Th><Th>Responsável</Th><Th>Criado em</Th><Th>Status</Th></tr></thead>
                  <tbody>
                    {(linhas as Lead[]).map((l) => (
                      <tr key={l.id}>
                        <Td>{l.nome}</Td>
                        <Td>{brl(l.valorEstimado)}</Td>
                        <Td>{ROTULO_STATUS[l.status]}</Td>
                        <Td>{l.origem ?? '—'}</Td>
                        <Td>{l.responsavel?.nome ?? '—'}</Td>
                        <Td>{new Date(l.criadoEm).toLocaleDateString('pt-BR')}</Td>
                        <Td>{statusTag(l.status)}</Td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}
            </table>
          </div>
        )}
      </Card>
    </>
  );
}

function Submenu({ sel, onSel }: { sel: number | null; onSel: (v: number | null) => void }) {
  const { usuario } = useAuth();
  const verMeuPainel = podeVerBloco(usuario, 'metricas', 'bloco:metricas:meu-painel');
  const gruposVisiveis = GRUPOS.filter((g) => podeVerBloco(usuario, 'metricas', `bloco:metricas:${g}`));
  const itemStyle = (ativo: boolean): React.CSSProperties => ({
    padding: '7px 10px', borderRadius: 8, fontSize: 12.5, cursor: 'pointer',
    color: ativo ? 'var(--texto)' : 'var(--texto-suave)',
    background: ativo ? 'var(--superficie-3)' : 'transparent', fontWeight: ativo ? 600 : 400,
  });
  const totalReports = REPORTS.filter((r) => gruposVisiveis.includes(r.g)).length;
  return (
    <Card>
      {verMeuPainel && <div onClick={() => onSel(null)} style={itemStyle(sel === null)}>▦ Meu Painel</div>}
      <div style={{ fontSize: 10, letterSpacing: 1, color: 'var(--texto-fraco)', textTransform: 'uppercase', fontWeight: 700, padding: '12px 10px 4px' }}>Relatórios · {totalReports}</div>
      <div style={{ maxHeight: 460, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {gruposVisiveis.map((g) => (
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
  const { usuario } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [ativ, setAtiv] = useState<Atividade[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [sel, setSel] = useState<number | null>(null);
  const selPermitido = sel === null
    ? podeVerBloco(usuario, 'metricas', 'bloco:metricas:meu-painel')
    : podeVerBloco(usuario, 'metricas', `bloco:metricas:${REPORTS[sel].g}`);

  async function carregar() {
    setCarregando(true);
    setErro(null);
    try {
      const { data } = await api.get<Lead[]>('/comercial/leads');
      setLeads(comDemo(data, MOCK_LEADS));
      api.get<Atividade[]>('/comercial/atividades')
        .then(({ data: a }) => setAtiv(comDemo(a, MOCK_ATIV)))
        .catch(() => setAtiv(mockSeDemo(MOCK_ATIV)));
    } catch {
      setLeads(mockSeDemo(MOCK_LEADS));
      setAtiv(mockSeDemo(MOCK_ATIV));
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  return (
    <PaginaShell titulo="Métricas" subtitulo="Insights (BI) — painel próprio + 35 relatórios (dados reais)">
      {carregando ? (
        <EstadoCarregando />
      ) : erro ? (
        <EstadoErro mensagem={erro} onTentar={carregar} />
      ) : (
        <div className="brk-rsplit" style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 240px) 1fr', gap: 16, alignItems: 'start' }}>
          <Submenu sel={sel} onSel={setSel} />
          <div>{!selPermitido ? (
            <Card><div style={{ color: 'var(--texto-fraco)', fontSize: 13, padding: 8 }}>Seu perfil não tem acesso a esta métrica. Escolha outra no menu ao lado.</div></Card>
          ) : sel === null ? <MeuPainelView leads={leads} ativ={ativ} /> : <ReportView report={REPORTS[sel]} leads={leads} ativ={ativ} />}</div>
        </div>
      )}
    </PaginaShell>
  );
}
