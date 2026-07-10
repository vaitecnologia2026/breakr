// Tela "Negócios" (CRM Comercial) — estilo RD Station, ligada ao backend real.
//  - Pipelines e etapas vêm de /comercial/pipelines (a etapa mapeia para um
//    `status` do funil, que continua sendo a fonte de verdade). Kanban por etapa.
//  - Visão em LISTA com filtros (pipeline/etapa/status/etiqueta/busca) + Exportar.
//  - Modal "Novo Negócio" cria um Lead real (POST /comercial/leads).
//  - Etiquetas via /comercial/etiquetas. Drag-and-drop persiste a etapa
//    (PATCH /comercial/leads/:id/etapa). Estados carregando/erro/vazio no padrão.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { api } from '../lib/api';
import { comDemo, mockSeDemo } from '../lib/demo';
import { PaginaShell, EstadoCarregando, EstadoErro, MensagemErro } from '../components/primitivos';
import { Modal, Campo, CampoSelect, Btn, Badge } from '../components/ui';

type StatusLead = 'NOVO' | 'CONTATADO' | 'QUALIFICADO' | 'PROPOSTA' | 'GANHO' | 'PERDIDO';

interface Etapa { id: string; nome: string; ordem: number; status: StatusLead }
interface Pipeline { id: string; nome: string; ordem: number; etapas: Etapa[] }
interface Etiqueta { id: string; nome: string; cor: string }
interface LeadEtiqueta { etiqueta: Etiqueta }

interface Lead {
  id: string;
  nome: string;
  empresa: string | null;
  email: string | null;
  telefone: string | null;
  origem: string | null;
  observacao?: string | null;
  status: StatusLead;
  valorEstimado: string | null;
  atualizadoEm: string;
  previsaoFechamento?: string | null;
  responsavel?: { nome: string } | null;
  cliente?: { nomeFantasia: string } | null;
  pipeline?: { id: string; nome: string } | null;
  etapa?: { id: string; nome: string; status: StatusLead } | null;
  etiquetas?: LeadEtiqueta[];
}

type StatusAtividade = 'PENDENTE' | 'CONCLUIDA';
interface Atividade { id: string; titulo: string; status: StatusAtividade; vencimento: string | null; lead?: { id: string } | null }

const STATUS_LABEL: Record<StatusLead, string> = {
  NOVO: 'Entrada de Leads', CONTATADO: 'Tentando contato', QUALIFICADO: 'Qualificado',
  PROPOSTA: 'Proposta', GANHO: 'Ganho', PERDIDO: 'Perdido',
};
const STATUS_ORDEM: StatusLead[] = ['NOVO', 'CONTATADO', 'QUALIFICADO', 'PROPOSTA', 'GANHO', 'PERDIDO'];

const MOCK_PIPELINES: Pipeline[] = [
  { id: 'p1', nome: 'Prospecção', ordem: 0, etapas: [
    { id: 'e1', nome: 'Entrada de Leads', ordem: 0, status: 'NOVO' },
    { id: 'e2', nome: 'Tentando contato', ordem: 1, status: 'CONTATADO' },
    { id: 'e3', nome: 'Contato realizado com a empresa', ordem: 2, status: 'QUALIFICADO' },
    { id: 'e4', nome: 'Contato realizado com o decisor', ordem: 3, status: 'PROPOSTA' },
    { id: 'e5', nome: 'Reunião Agendada [R1]', ordem: 4, status: 'PROPOSTA' },
  ] },
];
const MOCK_LEADS: Lead[] = [
  { id: 'm1', nome: 'Guria Doceira', empresa: 'Guria Doceira Ltda', email: null, telefone: null, origem: 'Inbound', status: 'NOVO', valorEstimado: null, atualizadoEm: '2026-07-03T12:00:00Z', responsavel: { nome: 'Gustavo Costa' } },
  { id: 'm2', nome: 'Pizzayou', empresa: 'Pizzayou Ltda', email: null, telefone: null, origem: 'Scraping', status: 'CONTATADO', valorEstimado: null, atualizadoEm: '2026-07-06T12:00:00Z', responsavel: { nome: 'Gustavo Costa' } },
  { id: 'm3', nome: 'Fornalha Pizzaria', empresa: null, email: null, telefone: null, origem: null, status: 'QUALIFICADO', valorEstimado: '4150', atualizadoEm: '2026-07-06T12:00:00Z', responsavel: { nome: 'Gustavo Costa' } },
];
const MOCK_ATIVIDADES: Atividade[] = [
  { id: 'a1', titulo: 'Ligação', status: 'PENDENTE', vencimento: new Date(Date.now() - 86400000).toISOString(), lead: { id: 'm2' } },
];

function formatValor(v: string | null): string {
  const n = v ? Number(v) : 0;
  return `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function diasDesde(iso: string): number { return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)); }
function mesmaData(a: Date, b: Date): boolean { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
function iniciais(nome?: string | null): string {
  if (!nome) return '—';
  const p = nome.trim().split(/\s+/);
  const s = (p[0]?.[0] ?? '') + (p.length > 1 ? p[p.length - 1][0] : '');
  return s.toUpperCase() || '—';
}
// Contato (Pessoa) fica gravado em observacao como "Contato: X" quando informado.
function contatoDoLead(l: Lead): string {
  const m = (l.observacao ?? '').match(/Contato:\s*(.+)/i);
  return m ? m[1].trim() : '';
}

function melhorAtividade(ativs: Atividade[], leadId: string): Atividade | undefined {
  const pend = ativs.filter((a) => a.status === 'PENDENTE' && a.lead?.id === leadId);
  if (pend.length === 0) return undefined;
  const comData = pend.filter((a) => a.vencimento);
  if (comData.length === 0) return pend[0];
  return comData.sort((a, b) => new Date(a.vencimento as string).getTime() - new Date(b.vencimento as string).getTime())[0];
}
type TomAtividade = 'atrasada' | 'hoje' | 'neutro' | 'sem';
function etiquetaAtividade(atv: Atividade | undefined): { texto: string; tom: TomAtividade } {
  if (!atv) return { texto: 'Sem atividade', tom: 'sem' };
  if (!atv.vencimento) return { texto: atv.titulo, tom: 'neutro' };
  const v = new Date(atv.vencimento);
  const hoje = new Date();
  const hm = v.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const dm = v.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  if (mesmaData(v, hoje)) return { texto: `Hoje: ${atv.titulo} ${hm}`, tom: 'hoje' };
  if (v.getTime() < hoje.getTime()) return { texto: `Atrasada: ${atv.titulo}`, tom: 'atrasada' };
  return { texto: `${dm} ${hm}: ${atv.titulo}`, tom: 'neutro' };
}
const TOM_ESTILO: Record<TomAtividade, { bg: string; cor: string; borda: string }> = {
  atrasada: { bg: 'rgba(239,68,68,0.14)', cor: '#f5a3ae', borda: 'var(--vermelho-borda)' },
  hoje: { bg: 'rgba(34,197,94,0.14)', cor: '#86efac', borda: 'var(--verde-borda)' },
  neutro: { bg: 'var(--superficie-4)', cor: 'var(--texto-suave)', borda: 'var(--borda)' },
  sem: { bg: 'transparent', cor: 'var(--texto-fraco)', borda: 'var(--borda)' },
};

function Ico({ children, size = 13 }: { children: ReactNode; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>{children}</svg>;
}
const IcoPessoa = () => <Ico><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></Ico>;
const IcoEmpresa = () => <Ico><path d="M3 21h18" /><path d="M5 21V7l7-4 7 4v14" /><path d="M9 9h.01M9 12h.01M9 15h.01M15 9h.01M15 12h.01M15 15h.01" /></Ico>;
const IcoAlerta = () => <Ico><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></Ico>;
const IcoEditar = () => <Ico><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></Ico>;
const IcoLixeira = () => <Ico><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></Ico>;
const IcoEsquerda = () => <Ico><polyline points="15 18 9 12 15 6" /></Ico>;
const IcoDireita = () => <Ico><polyline points="9 18 15 12 9 6" /></Ico>;
const IcoKanban = () => <Ico size={15}><rect x="3" y="3" width="7" height="18" rx="1" /><rect x="14" y="3" width="7" height="11" rx="1" /></Ico>;
const IcoLista = () => <Ico size={15}><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></Ico>;
const IcoChevron = () => <Ico size={14}><polyline points="6 9 12 15 18 9" /></Ico>;
const IcoBusca = () => <Ico size={14}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></Ico>;
const IcoExportar = () => <Ico size={14}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></Ico>;

// Editor de etapa (modal add/edit).
interface EditorEtapa { modo: 'add' | 'edit'; id?: string; nome: string; status: StatusLead }

export function Negocios() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [pipelineSel, setPipelineSel] = useState<string | null>(null);
  const [etiquetas, setEtiquetas] = useState<Etiqueta[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [erroAcao, setErroAcao] = useState<string | null>(null);

  const [visao, setVisao] = useState<'kanban' | 'lista'>('kanban');
  const [somenteAtivos, setSomenteAtivos] = useState(true);
  const [dropdownPipeline, setDropdownPipeline] = useState(false);

  // Kanban drag
  const arrastando = useRef<string | null>(null);
  const [alvo, setAlvo] = useState<string | null>(null);

  // Editor de etapa
  const [editorEtapa, setEditorEtapa] = useState<EditorEtapa | null>(null);

  // Filtros da lista
  const [busca, setBusca] = useState('');
  const [fPipeline, setFPipeline] = useState('');
  const [fEtapa, setFEtapa] = useState('');
  const [fStatus, setFStatus] = useState('');
  const [fEtiqueta, setFEtiqueta] = useState('');

  // Modal Novo Negócio
  const [modalNovo, setModalNovo] = useState(false);
  const [salvandoNovo, setSalvandoNovo] = useState(false);
  const [erroNovo, setErroNovo] = useState<string | null>(null);
  const [form, setForm] = useState({ titulo: '', etapaId: '', valor: '', previsao: '', contato: '', empresa: '', etiquetaIds: [] as string[] });
  const [novaEtiqueta, setNovaEtiqueta] = useState('');

  async function carregarPipelines(): Promise<Pipeline[]> {
    try {
      const { data } = await api.get<Pipeline[]>('/comercial/pipelines');
      const ps = comDemo(data, MOCK_PIPELINES);
      setPipelines(ps);
      setPipelineSel((sel) => sel && ps.some((p) => p.id === sel) ? sel : (ps[0]?.id ?? null));
      return ps;
    } catch { setPipelines(mockSeDemo(MOCK_PIPELINES)); return mockSeDemo(MOCK_PIPELINES); }
  }
  async function carregarEtiquetas() {
    try { const { data } = await api.get<Etiqueta[]>('/comercial/etiquetas'); setEtiquetas(data); } catch { setEtiquetas([]); }
  }
  async function carregarLeads() {
    try {
      const { data } = await api.get<Lead[]>('/comercial/leads');
      setLeads(comDemo(data, MOCK_LEADS));
    } catch { setLeads(mockSeDemo(MOCK_LEADS)); }
    try {
      const { data } = await api.get<Atividade[]>('/comercial/atividades');
      setAtividades(comDemo(data, MOCK_ATIVIDADES));
    } catch { setAtividades(mockSeDemo(MOCK_ATIVIDADES)); }
  }
  async function carregar() {
    setCarregando(true); setErro(null);
    try { await Promise.all([carregarPipelines(), carregarEtiquetas(), carregarLeads()]); }
    catch { setErro('Não foi possível carregar os negócios.'); }
    finally { setCarregando(false); }
  }
  useEffect(() => { carregar(); }, []);

  const pipelineAtual = pipelines.find((p) => p.id === pipelineSel) ?? null;
  const etapas = [...(pipelineAtual?.etapas ?? [])].sort((a, b) => a.ordem - b.ordem);

  // Leads deste pipeline: os que pertencem a ele + os "soltos" (sem pipeline, legado).
  const leadsDoPipeline = leads.filter((l) => !l.pipeline || l.pipeline.id === pipelineSel);
  // Primeira etapa (na ordem) para cada status — usada como fallback do legado.
  const primeiraEtapaDoStatus = new Map<StatusLead, string>();
  etapas.forEach((e) => { if (!primeiraEtapaDoStatus.has(e.status)) primeiraEtapaDoStatus.set(e.status, e.id); });
  function etapaDoLead(l: Lead): string | undefined {
    if (l.etapa && etapas.some((e) => e.id === l.etapa!.id)) return l.etapa.id;
    return primeiraEtapaDoStatus.get(l.status);
  }
  const leadsVisiveis = leadsDoPipeline.filter((l) => (somenteAtivos ? l.status !== 'GANHO' && l.status !== 'PERDIDO' : true));

  async function aoSoltar(etapa: Etapa) {
    const id = arrastando.current; arrastando.current = null; setAlvo(null);
    if (!id) return;
    const atual = leads.find((l) => l.id === id);
    if (!atual) return;
    setErroAcao(null);
    setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, status: etapa.status, etapa: { id: etapa.id, nome: etapa.nome, status: etapa.status } } : l)));
    try { await api.patch(`/comercial/leads/${id}/etapa`, { etapaId: etapa.id }); await carregarLeads(); }
    catch { setErroAcao('Não foi possível mover o negócio. Tente novamente.'); await carregarLeads(); }
  }

  // ── Pipelines ────────────────────────────────────────────────────────────
  async function novaPipeline() {
    const nome = window.prompt('Nome do novo pipeline:');
    if (!nome || !nome.trim()) return;
    try { const { data } = await api.post<Pipeline>('/comercial/pipelines', { nome: nome.trim() }); await carregarPipelines(); setPipelineSel(data.id); setDropdownPipeline(false); }
    catch (e: any) { setErroAcao(e?.response?.data?.message ?? 'Erro ao criar pipeline.'); }
  }
  async function excluirPipeline(id: string) {
    if (!window.confirm('Excluir este pipeline? As etapas serão removidas; os negócios NÃO são apagados (voltam a aparecer por status).')) return;
    try { await api.delete(`/comercial/pipelines/${id}`); const ps = await carregarPipelines(); setPipelineSel(ps[0]?.id ?? null); }
    catch (e: any) { setErroAcao(e?.response?.data?.message ?? 'Erro ao excluir pipeline.'); }
  }

  // ── Etapas ───────────────────────────────────────────────────────────────
  function abrirAddEtapa() { setEditorEtapa({ modo: 'add', nome: STATUS_LABEL.NOVO, status: 'NOVO' }); }
  function abrirEditEtapa(e: Etapa) { setEditorEtapa({ modo: 'edit', id: e.id, nome: e.nome, status: e.status }); }
  async function salvarEtapa() {
    if (!editorEtapa || !pipelineSel || !editorEtapa.nome.trim()) return;
    try {
      if (editorEtapa.modo === 'add') await api.post(`/comercial/pipelines/${pipelineSel}/etapas`, { nome: editorEtapa.nome.trim(), status: editorEtapa.status });
      else await api.patch(`/comercial/etapas/${editorEtapa.id}`, { nome: editorEtapa.nome.trim(), status: editorEtapa.status });
      setEditorEtapa(null); await carregarPipelines();
    } catch (e: any) { setErroAcao(e?.response?.data?.message ?? 'Erro ao salvar etapa.'); }
  }
  async function excluirEtapa(id: string) {
    if (!window.confirm('Excluir esta etapa? Os negócios nela deixam de aparecer no quadro (não são apagados).')) return;
    try { await api.delete(`/comercial/etapas/${id}`); await carregarPipelines(); }
    catch (e: any) { setErroAcao(e?.response?.data?.message ?? 'Erro ao excluir etapa.'); }
  }
  async function moverEtapaOrdem(idx: number, dir: -1 | 1) {
    if (!pipelineSel) return;
    const j = idx + dir;
    if (j < 0 || j >= etapas.length) return;
    const novos = [...etapas];
    [novos[idx], novos[j]] = [novos[j], novos[idx]];
    try { await api.patch(`/comercial/pipelines/${pipelineSel}/etapas/ordem`, { ids: novos.map((e) => e.id) }); await carregarPipelines(); }
    catch (e: any) { setErroAcao(e?.response?.data?.message ?? 'Erro ao reordenar.'); }
  }

  // ── Novo Negócio ─────────────────────────────────────────────────────────
  function abrirNovo() {
    setForm({ titulo: '', etapaId: etapas[0]?.id ?? '', valor: '', previsao: '', contato: '', empresa: '', etiquetaIds: [] });
    setErroNovo(null); setNovaEtiqueta(''); setModalNovo(true);
  }
  function abrirNovoNaEtapa(etapaId: string) {
    setForm({ titulo: '', etapaId, valor: '', previsao: '', contato: '', empresa: '', etiquetaIds: [] });
    setErroNovo(null); setNovaEtiqueta(''); setModalNovo(true);
  }
  function alternarEtiquetaForm(id: string) {
    setForm((f) => ({ ...f, etiquetaIds: f.etiquetaIds.includes(id) ? f.etiquetaIds.filter((x) => x !== id) : [...f.etiquetaIds, id] }));
  }
  async function criarEtiqueta() {
    const nome = novaEtiqueta.trim();
    if (!nome) return;
    try { const { data } = await api.post<Etiqueta>('/comercial/etiquetas', { nome }); setEtiquetas((es) => [...es, data]); setForm((f) => ({ ...f, etiquetaIds: [...f.etiquetaIds, data.id] })); setNovaEtiqueta(''); }
    catch (e: any) { setErroNovo(e?.response?.data?.message ?? 'Erro ao criar etiqueta.'); }
  }
  async function salvarNovo() {
    if (!form.titulo.trim()) { setErroNovo('Informe o título do negócio.'); return; }
    setSalvandoNovo(true); setErroNovo(null);
    const corpo: Record<string, unknown> = {
      nome: form.titulo.trim(),
      ...(form.empresa.trim() && { empresa: form.empresa.trim() }),
      ...(form.valor && { valorEstimado: String(Number(form.valor)) }),
      ...(form.previsao && { previsaoFechamento: new Date(form.previsao).toISOString() }),
      ...(form.etapaId && { etapaId: form.etapaId }),
      ...(form.contato.trim() && { observacao: `Contato: ${form.contato.trim()}` }),
      ...(form.etiquetaIds.length && { etiquetaIds: form.etiquetaIds }),
    };
    try { await api.post('/comercial/leads', corpo); setModalNovo(false); await carregarLeads(); }
    catch (e: any) { setErroNovo(e?.response?.data?.message ?? 'Erro ao criar o negócio.'); }
    finally { setSalvandoNovo(false); }
  }

  // ── Lista (filtros + export) ──────────────────────────────────────────────
  const leadsLista = leads.filter((l) => {
    if (fPipeline && l.pipeline?.id !== fPipeline) return false;
    if (fEtapa && l.etapa?.id !== fEtapa) return false;
    if (fStatus === 'ABERTOS' && (l.status === 'GANHO' || l.status === 'PERDIDO')) return false;
    if (fStatus === 'GANHOS' && l.status !== 'GANHO') return false;
    if (fStatus === 'PERDIDOS' && l.status !== 'PERDIDO') return false;
    if (fEtiqueta && !(l.etiquetas ?? []).some((e) => e.etiqueta.id === fEtiqueta)) return false;
    if (busca) {
      const q = busca.toLowerCase();
      const alvos = [l.nome, l.empresa, l.cliente?.nomeFantasia, contatoDoLead(l), l.responsavel?.nome].filter(Boolean).join(' ').toLowerCase();
      if (!alvos.includes(q)) return false;
    }
    return true;
  });
  const etapasFiltro = fPipeline ? (pipelines.find((p) => p.id === fPipeline)?.etapas ?? []) : pipelines.flatMap((p) => p.etapas);

  function etapaLabel(l: Lead): string { return l.etapa?.nome ?? STATUS_LABEL[l.status]; }
  function statusBadge(s: StatusLead): ReactNode {
    if (s === 'GANHO') return <Badge cor="verde">Ganho</Badge>;
    if (s === 'PERDIDO') return <Badge cor="vermelho">Perdido</Badge>;
    return <span style={{ fontSize: 12.5, color: 'var(--texto-suave)' }}>Aberto</span>;
  }
  function exportarCsv() {
    const cab = ['Título', 'Valor', 'Etapa', 'Pipeline', 'Empresa', 'Contato', 'Proprietário', 'Status'];
    const linhas = leadsLista.map((l) => [
      l.nome, formatValor(l.valorEstimado), etapaLabel(l), l.pipeline?.nome ?? '',
      l.empresa || l.cliente?.nomeFantasia || '', contatoDoLead(l), l.responsavel?.nome ?? '',
      l.status === 'GANHO' ? 'Ganho' : l.status === 'PERDIDO' ? 'Perdido' : 'Aberto',
    ]);
    const esc = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = [cab, ...linhas].map((r) => r.map(esc).join(';')).join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'negocios.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  const total = visao === 'kanban' ? leadsVisiveis.length : leadsLista.length;

  const toggleBtn = (ativo: boolean): React.CSSProperties => ({
    width: 30, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: '1px solid var(--borda)', borderRadius: 7, cursor: 'pointer',
    background: ativo ? 'var(--superficie-3)' : 'transparent', color: ativo ? 'var(--texto)' : 'var(--texto-fraco)',
  });

  return (
    <PaginaShell titulo="Negócios" subtitulo="Pipeline de vendas — Kanban, lista e negócios">
      {carregando ? (
        <EstadoCarregando />
      ) : erro ? (
        <EstadoErro mensagem={erro} onTentar={carregar} />
      ) : (
        <>
          {erroAcao && <MensagemErro texto={erroAcao} />}

          {/* Cabeçalho: seletor de pipeline + contador + visão + Ativos + Novo Negócio */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }}>
              <button type="button" onClick={() => setDropdownPipeline((v) => !v)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderRadius: 9, border: '1px solid var(--borda)', background: 'var(--superficie-2)', color: 'var(--texto)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>
                {pipelineAtual?.nome ?? 'Pipeline'} <IcoChevron />
              </button>
              <span style={{ fontSize: 12.5, color: 'var(--texto-suave)', fontWeight: 600 }}>{total} negócios</span>
              {dropdownPipeline && (
                <div style={{ position: 'absolute', top: 40, left: 0, zIndex: 30, minWidth: 240, background: 'var(--superficie)', border: '1px solid var(--borda)', borderRadius: 10, padding: 6, boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
                  {pipelines.map((p) => (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '7px 8px', borderRadius: 7, cursor: 'pointer', background: p.id === pipelineSel ? 'var(--superficie-3)' : 'transparent' }}
                      onClick={() => { setPipelineSel(p.id); setDropdownPipeline(false); }}>
                      <span style={{ fontSize: 13, color: 'var(--texto)' }}>{p.id === pipelineSel ? '✓ ' : ''}{p.nome}</span>
                      <button type="button" title="Excluir pipeline" onClick={(ev) => { ev.stopPropagation(); excluirPipeline(p.id); }} style={{ border: 'none', background: 'transparent', color: 'var(--texto-fraco)', cursor: 'pointer', display: 'flex' }}><IcoLixeira /></button>
                    </div>
                  ))}
                  <div onClick={novaPipeline} style={{ padding: '8px', borderTop: '1px solid var(--borda)', marginTop: 4, fontSize: 13, color: 'var(--amarelo-fagulha)', cursor: 'pointer' }}>+ Novo Pipeline</div>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: 4 }}>
                <button type="button" title="Kanban" style={toggleBtn(visao === 'kanban')} onClick={() => setVisao('kanban')}><IcoKanban /></button>
                <button type="button" title="Lista" style={toggleBtn(visao === 'lista')} onClick={() => setVisao('lista')}><IcoLista /></button>
              </div>
              {visao === 'kanban' && (
                <CampoSelect rotulo="" value={somenteAtivos ? 'ativos' : 'todos'} onChange={(e) => setSomenteAtivos(e.target.value === 'ativos')}>
                  <option value="ativos">Ativos</option>
                  <option value="todos">Todos</option>
                </CampoSelect>
              )}
              {visao === 'lista' && (
                <Btn variante="secondary" tamanho="sm" onClick={exportarCsv}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><IcoExportar /> Exportar</span></Btn>
              )}
              <Btn tamanho="sm" onClick={abrirNovo}>+ Novo Negócio</Btn>
            </div>
          </div>

          {visao === 'kanban' ? (
            <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8, alignItems: 'stretch' }}>
              {etapas.length === 0 ? (
                <div style={{ color: 'var(--texto-fraco)', fontSize: 13, padding: 16 }}>Este pipeline não tem etapas. Use “+ Coluna”.</div>
              ) : etapas.map((et, idx) => {
                const daEtapa = leadsVisiveis.filter((l) => etapaDoLead(l) === et.id);
                const soma = daEtapa.reduce((acc, l) => acc + (l.valorEstimado ? Number(l.valorEstimado) : 0), 0);
                return (
                  <div key={et.id}
                    onDragOver={(e) => { e.preventDefault(); if (alvo !== et.id) setAlvo(et.id); }}
                    onDragLeave={(e) => { if (e.currentTarget === e.target) setAlvo((a) => (a === et.id ? null : a)); }}
                    onDrop={() => aoSoltar(et)}
                    style={{ flex: '0 0 272px', background: 'var(--superficie-2)', borderRadius: 12, padding: 10, border: `1px solid ${alvo === et.id ? 'var(--amarelo-fagulha)' : 'var(--borda)'}`, transition: 'border-color 0.12s ease', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                        <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--texto)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{et.nome}</span>
                        <span style={{ background: 'var(--superficie-4)', borderRadius: 999, fontSize: 10.5, fontWeight: 700, padding: '1px 7px', color: 'var(--texto-suave)', flex: '0 0 auto' }}>{daEtapa.length}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 2, flex: '0 0 auto' }}>
                        <button type="button" title="Mover para a esquerda" onClick={() => moverEtapaOrdem(idx, -1)} disabled={idx === 0} style={{ width: 20, height: 20, border: 'none', background: 'transparent', color: 'var(--texto-fraco)', cursor: idx === 0 ? 'default' : 'pointer', opacity: idx === 0 ? 0.35 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IcoEsquerda /></button>
                        <button type="button" title="Mover para a direita" onClick={() => moverEtapaOrdem(idx, 1)} disabled={idx === etapas.length - 1} style={{ width: 20, height: 20, border: 'none', background: 'transparent', color: 'var(--texto-fraco)', cursor: idx === etapas.length - 1 ? 'default' : 'pointer', opacity: idx === etapas.length - 1 ? 0.35 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IcoDireita /></button>
                        <button type="button" title="Novo negócio nesta etapa" onClick={() => abrirNovoNaEtapa(et.id)} style={{ width: 20, height: 20, border: 'none', background: 'transparent', color: 'var(--texto-fraco)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                        <button type="button" title="Editar etapa" onClick={() => abrirEditEtapa(et)} style={{ width: 20, height: 20, border: 'none', background: 'transparent', color: 'var(--texto-fraco)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IcoEditar /></button>
                        <button type="button" title="Excluir etapa" onClick={() => excluirEtapa(et.id)} style={{ width: 20, height: 20, border: 'none', background: 'transparent', color: 'var(--texto-fraco)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IcoLixeira /></button>
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--texto-fraco)', marginTop: 2, marginBottom: 10 }}>{formatValor(String(soma))}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minHeight: 40 }}>
                      {daEtapa.length === 0 ? (
                        <div style={{ border: '1px dashed var(--borda-forte)', borderRadius: 10, padding: '16px 10px', textAlign: 'center', fontSize: 11.5, color: 'var(--texto-fraco)' }}>+ Negócio</div>
                      ) : daEtapa.map((l) => {
                        const dias = diasDesde(l.atualizadoEm);
                        const at = etiquetaAtividade(melhorAtividade(atividades, l.id));
                        const est = TOM_ESTILO[at.tom];
                        const empresa = l.empresa || l.cliente?.nomeFantasia || null;
                        const contato = contatoDoLead(l);
                        return (
                          <div key={l.id} draggable
                            onDragStart={(e) => { arrastando.current = l.id; e.dataTransfer.effectAllowed = 'move'; }}
                            onDragEnd={() => { arrastando.current = null; setAlvo(null); }}
                            style={{ background: 'var(--superficie)', border: '1px solid var(--borda)', borderRadius: 10, padding: 11, cursor: 'grab', display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 600, fontSize: 12.5, lineHeight: 1.3, color: 'var(--texto)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.nome}</div>
                              </div>
                              <span style={{ width: 26, height: 26, borderRadius: 999, background: 'var(--gradiente-brasa)', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>{iniciais(l.responsavel?.nome ?? l.nome)}</span>
                            </div>
                            {contato && <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--texto-suave)' }}><IcoPessoa /><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{contato}</span></div>}
                            {empresa && <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--texto-fraco)' }}><IcoEmpresa /><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{empresa}</span></div>}
                            {(l.etiquetas ?? []).length > 0 && (
                              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                {(l.etiquetas ?? []).map((e) => (
                                  <span key={e.etiqueta.id} style={{ fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 6, background: `color-mix(in srgb, ${e.etiqueta.cor} 18%, transparent)`, color: e.etiqueta.cor, border: `1px solid color-mix(in srgb, ${e.etiqueta.cor} 45%, transparent)` }}>{e.etiqueta.nome}</span>
                                ))}
                              </div>
                            )}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 2 }}>
                              <b style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{formatValor(l.valorEstimado)}</b>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10.5, fontWeight: 600, padding: '2px 7px', borderRadius: 6, background: est.bg, color: est.cor, border: `1px solid ${est.borda}`, maxWidth: 150, minWidth: 0 }}>
                                  {at.tom === 'sem' && <IcoAlerta />}
                                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{at.texto}</span>
                                </span>
                                <span style={{ fontSize: 11, color: 'var(--texto-fraco)', flex: '0 0 auto' }}>{dias}d</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {/* + Coluna (nova etapa) */}
              <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'flex-start' }}>
                <Btn variante="secondary" tamanho="sm" onClick={abrirAddEtapa}>+ Coluna</Btn>
              </div>
            </div>
          ) : (
            <>
              {/* Filtros da lista */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <CampoSelect rotulo="" value={fPipeline} onChange={(e) => { setFPipeline(e.target.value); setFEtapa(''); }}>
                  <option value="">Todos os pipelines</option>
                  {pipelines.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </CampoSelect>
                <CampoSelect rotulo="" value={fEtapa} onChange={(e) => setFEtapa(e.target.value)}>
                  <option value="">Todas as etapas</option>
                  {etapasFiltro.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
                </CampoSelect>
                <CampoSelect rotulo="" value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
                  <option value="">Todos os status</option>
                  <option value="ABERTOS">Abertos</option>
                  <option value="GANHOS">Ganhos</option>
                  <option value="PERDIDOS">Perdidos</option>
                </CampoSelect>
                <CampoSelect rotulo="" value={fEtiqueta} onChange={(e) => setFEtiqueta(e.target.value)}>
                  <option value="">Todas as etiquetas</option>
                  {etiquetas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
                </CampoSelect>
                <div className="brk-search" style={{ maxWidth: 280, flex: 1, minWidth: 180 }}>
                  <span className="brk-search-icon"><IcoBusca /></span>
                  <input className="brk-input" placeholder="Buscar negócio…" value={busca} onChange={(e) => setBusca(e.target.value)} style={{ paddingLeft: 34 }} />
                </div>
              </div>

              <div className="brk-table-wrap">
                <table className="brk-table">
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left' }}>Título</th>
                      <th style={{ textAlign: 'left' }}>Valor</th>
                      <th style={{ textAlign: 'left' }}>Etapa</th>
                      <th style={{ textAlign: 'left' }}>Pipeline</th>
                      <th style={{ textAlign: 'left' }}>Empresa</th>
                      <th style={{ textAlign: 'left' }}>Contato</th>
                      <th style={{ textAlign: 'left' }}>Proprietário</th>
                      <th style={{ textAlign: 'left' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leadsLista.length === 0 ? (
                      <tr><td colSpan={8} style={{ padding: 20, textAlign: 'center', color: 'var(--texto-fraco)', fontSize: 13 }}>Nenhum negócio encontrado.</td></tr>
                    ) : leadsLista.map((l) => (
                      <tr key={l.id} className="brk-tr">
                        <td><span style={{ fontSize: 13, fontWeight: 600, color: 'var(--texto)' }}>{l.nome}</span></td>
                        <td><span style={{ fontSize: 12.5, color: 'var(--texto-suave)' }}>{formatValor(l.valorEstimado)}</span></td>
                        <td><span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: 'var(--superficie-3)', color: 'var(--texto-suave)' }}>{etapaLabel(l)}</span></td>
                        <td><span style={{ fontSize: 12.5, color: 'var(--texto-suave)' }}>{l.pipeline?.nome ?? '—'}</span></td>
                        <td><span style={{ fontSize: 12.5, color: 'var(--texto-suave)' }}>{l.empresa || l.cliente?.nomeFantasia || '—'}</span></td>
                        <td><span style={{ fontSize: 12.5, color: 'var(--texto-suave)' }}>{contatoDoLead(l) || '—'}</span></td>
                        <td><span style={{ fontSize: 12.5, color: 'var(--texto-suave)' }}>{l.responsavel?.nome ?? '—'}</span></td>
                        <td>{statusBadge(l.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}

      {/* Modal Novo Negócio */}
      {modalNovo && (
        <Modal titulo="Novo Negócio" onFechar={() => setModalNovo(false)}
          rodape={<><Btn variante="secondary" onClick={() => setModalNovo(false)}>Cancelar</Btn><Btn onClick={salvarNovo} disabled={salvandoNovo || !form.titulo.trim()}>{salvandoNovo ? 'Criando…' : 'Criar Negócio'}</Btn></>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {erroNovo && <MensagemErro texto={erroNovo} />}
            <Campo rotulo="Título do Negócio" value={form.titulo} onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))} placeholder="Ex: Proposta Agência XYZ" autoFocus />
            <div>
              <span className="brk-campo-label" style={{ display: 'block', marginBottom: 6 }}>Etapa</span>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {etapas.map((e) => (
                  <button key={e.id} type="button" onClick={() => setForm((f) => ({ ...f, etapaId: e.id }))}
                    style={{ fontSize: 12, padding: '6px 10px', borderRadius: 8, cursor: 'pointer', border: `1px solid ${form.etapaId === e.id ? 'var(--texto)' : 'var(--borda)'}`, background: form.etapaId === e.id ? 'var(--texto)' : 'transparent', color: form.etapaId === e.id ? 'var(--superficie)' : 'var(--texto-suave)', fontWeight: form.etapaId === e.id ? 700 : 400 }}>
                    {e.nome}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Campo rotulo="Valor (R$)" type="number" step="0.01" min="0" value={form.valor} onChange={(e) => setForm((f) => ({ ...f, valor: e.target.value }))} placeholder="0" />
              <Campo rotulo="Previsão de Fechamento" type="date" value={form.previsao} onChange={(e) => setForm((f) => ({ ...f, previsao: e.target.value }))} />
            </div>
            <Campo rotulo="Contato (Pessoa)" value={form.contato} onChange={(e) => setForm((f) => ({ ...f, contato: e.target.value }))} placeholder="Nome do contato" />
            <Campo rotulo="Empresa" value={form.empresa} onChange={(e) => setForm((f) => ({ ...f, empresa: e.target.value }))} placeholder="Nome da empresa" />
            <div>
              <span className="brk-campo-label" style={{ display: 'block', marginBottom: 6 }}>Etiquetas</span>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                {etiquetas.map((e) => (
                  <button key={e.id} type="button" onClick={() => alternarEtiquetaForm(e.id)}
                    style={{ fontSize: 11.5, padding: '4px 9px', borderRadius: 999, cursor: 'pointer', border: `1px solid color-mix(in srgb, ${e.cor} 45%, transparent)`, background: form.etiquetaIds.includes(e.id) ? `color-mix(in srgb, ${e.cor} 22%, transparent)` : 'transparent', color: e.cor, fontWeight: form.etiquetaIds.includes(e.id) ? 700 : 500 }}>
                    {form.etiquetaIds.includes(e.id) ? '✓ ' : ''}{e.nome}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="brk-input" placeholder="Nova etiqueta…" value={novaEtiqueta} onChange={(e) => setNovaEtiqueta(e.target.value)} style={{ flex: 1 }} />
                <Btn variante="secondary" tamanho="sm" onClick={criarEtiqueta} disabled={!novaEtiqueta.trim()}>Criar</Btn>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal etapa (add/edit) */}
      {editorEtapa && (
        <Modal titulo={editorEtapa.modo === 'add' ? 'Nova etapa (coluna)' : 'Editar etapa'} onFechar={() => setEditorEtapa(null)}
          rodape={<><Btn variante="secondary" onClick={() => setEditorEtapa(null)}>Cancelar</Btn><Btn onClick={salvarEtapa} disabled={!editorEtapa.nome.trim()}>Salvar</Btn></>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Campo rotulo="Nome da etapa" value={editorEtapa.nome} onChange={(e) => setEditorEtapa((ed) => (ed ? { ...ed, nome: e.target.value } : ed))} placeholder="Ex.: Reunião agendada" autoFocus />
            <CampoSelect rotulo="Status do funil" value={editorEtapa.status} onChange={(e) => setEditorEtapa((ed) => (ed ? { ...ed, status: e.target.value as StatusLead } : ed))}>
              {STATUS_ORDEM.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </CampoSelect>
            <p style={{ fontSize: 11.5, color: 'var(--texto-fraco)' }}>
              O status liga a etapa ao funil do backend — ao arrastar um card para cá, o negócio recebe esse status. Meu Painel/Métricas seguem funcionando pelo status.
            </p>
          </div>
        </Modal>
      )}
    </PaginaShell>
  );
}
