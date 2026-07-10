// Tela de detalhe/edicao de um negocio (Lead) — estilo RD Station, aberta ao
// clicar num card do Kanban de "Negocios". Overlay em tela cheia sobre a pagina.
//  - Stepper de etapas (move a etapa real: PATCH /comercial/leads/:id/etapa).
//  - Botoes Ganho/Perdido (PATCH /comercial/leads/:id/status).
//  - RESUMO editavel (valor, previsao, etiquetas, contato/empresa) via
//    PATCH /comercial/leads/:id. "Na etapa" e "Probabilidade" derivados.
//  - Abas: Atividades (CRUD real), Notas (persistidas), Historico (persistido),
//    Ligacoes (atividades de ligacao), WhatsApp e Email (estados por contato).
// Mantem o mesmo design system (tokens) do restante do app.
import { useEffect, useState, type ReactNode, type CSSProperties } from 'react';
import { api } from '../lib/api';
import { Modal, Campo, CampoSelect, Btn } from './ui';
import { MensagemErro } from './primitivos';

type StatusLead = 'NOVO' | 'CONTATADO' | 'QUALIFICADO' | 'PROPOSTA' | 'GANHO' | 'PERDIDO';
type TipoAtividade = 'LIGACAO' | 'WHATSAPP' | 'EMAIL' | 'INSTAGRAM' | 'REUNIAO' | 'OUTRO';
type StatusAtividade = 'PENDENTE' | 'CONCLUIDA';

interface Etapa { id: string; nome: string; ordem: number; status: StatusLead }
interface Pipeline { id: string; nome: string; ordem: number; etapas: Etapa[] }
interface Etiqueta { id: string; nome: string; cor: string }
interface LeadEtiqueta { etiqueta: Etiqueta }
interface Lead {
  id: string; nome: string; empresa: string | null; email: string | null; telefone: string | null;
  origem: string | null; observacao?: string | null; status: StatusLead; valorEstimado: string | null;
  atualizadoEm: string; previsaoFechamento?: string | null;
  responsavel?: { nome: string } | null; cliente?: { nomeFantasia: string } | null;
  pipeline?: { id: string; nome: string } | null; etapa?: { id: string; nome: string; status: StatusLead } | null;
  etiquetas?: LeadEtiqueta[];
  planos?: LeadPlano[];
  produtos?: LeadProduto[];
}
interface ItemCatalogo { id: string; nome: string; valor: string; ativo: boolean }
interface LeadPlano { plano: { id: string; nome: string; valor: string }; quantidade: number }
interface LeadProduto { produto: { id: string; nome: string; valor: string }; quantidade: number }
interface Nota { id: string; texto: string; criadoEm: string; autor?: { nome: string } | null }
interface Historico { id: string; acao: string; de: string | null; para: string | null; criadoEm: string; autor?: { nome: string } | null }
interface Atividade { id: string; titulo: string; tipo: TipoAtividade; status: StatusAtividade; vencimento: string | null; notas?: string | null; lead?: { id: string } | null }

const STATUS_LABEL: Record<StatusLead, string> = {
  NOVO: 'Entrada de Leads', CONTATADO: 'Tentando contato', QUALIFICADO: 'Qualificado',
  PROPOSTA: 'Proposta', GANHO: 'Ganho', PERDIDO: 'Perdido',
};
const PROBABILIDADE: Record<StatusLead, number> = { NOVO: 10, CONTATADO: 25, QUALIFICADO: 50, PROPOSTA: 75, GANHO: 100, PERDIDO: 0 };
const TIPO_LABEL: Record<TipoAtividade, string> = { LIGACAO: 'Ligação', WHATSAPP: 'WhatsApp', EMAIL: 'E-mail', INSTAGRAM: 'Instagram', REUNIAO: 'Reunião', OUTRO: 'Tarefa' };
const TIPOS: TipoAtividade[] = ['LIGACAO', 'WHATSAPP', 'EMAIL', 'INSTAGRAM', 'REUNIAO', 'OUTRO'];

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
function contatoDe(l: Lead | null): string {
  const m = (l?.observacao ?? '').match(/Contato:\s*(.+)/i);
  return m ? m[1].trim() : '';
}
function ehUrl(s?: string | null): boolean { return !!s && /^https?:\/\//i.test(s.trim()); }
function fmtDataHora(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}
function toLocalInput(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function soDigitos(s?: string | null): string { return (s ?? '').replace(/\D/g, ''); }

function Ico({ children, size = 14 }: { children: ReactNode; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>{children}</svg>;
}
const IcoVoltar = () => <Ico size={18}><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></Ico>;
const IcoPessoa = () => <Ico><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></Ico>;
const IcoEmpresa = () => <Ico><path d="M3 21h18" /><path d="M5 21V7l7-4 7 4v14" /><path d="M9 9h.01M9 12h.01M9 15h.01M15 9h.01M15 12h.01M15 15h.01" /></Ico>;
const IcoDinheiro = () => <Ico><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></Ico>;
const IcoCalendario = () => <Ico><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></Ico>;
const IcoRelogio = () => <Ico><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></Ico>;
const IcoPercent = () => <Ico><line x1="19" y1="5" x2="5" y2="19" /><circle cx="6.5" cy="6.5" r="2.5" /><circle cx="17.5" cy="17.5" r="2.5" /></Ico>;
const IcoTag = () => <Ico><path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" /></Ico>;
const IcoTelefone = () => <Ico><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" /></Ico>;
const IcoMail = () => <Ico><rect x="2" y="4" width="20" height="16" rx="2" /><polyline points="22,6 12,13 2,6" /></Ico>;
const IcoEditar = () => <Ico size={13}><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></Ico>;
const IcoLixeira = () => <Ico size={13}><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></Ico>;
const IcoSeta = () => <Ico size={13}><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></Ico>;
const IcoLink = () => <Ico size={12}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></Ico>;
const IcoOk = () => <Ico size={13}><polyline points="20 6 9 17 4 12" /></Ico>;
const IcoChevron = () => <Ico size={13}><polyline points="6 9 12 15 18 9" /></Ico>;

type Aba = 'atividades' | 'notas' | 'historico' | 'ligacoes' | 'whatsapp' | 'email';

interface Props {
  leadId: string;
  pipelines: Pipeline[];
  etiquetas: Etiqueta[];
  onFechar: () => void;
  onMudou: () => void;
  onEtiquetasMudou: () => void;
}

interface CampoEdit { campo: 'valor' | 'previsao' | 'contato' | 'empresa' | 'telefone' | 'email'; label: string; tipo: 'text' | 'number' | 'date'; valor: string }
interface AtivForm { id?: string; titulo: string; tipo: TipoAtividade; vencimento: string; notas: string }

export function NegocioDetalhe({ leadId, pipelines, etiquetas, onFechar, onMudou, onEtiquetasMudou }: Props) {
  const [lead, setLead] = useState<Lead | null>(null);
  const [notas, setNotas] = useState<Nota[]>([]);
  const [historico, setHistorico] = useState<Historico[]>([]);
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [erroAcao, setErroAcao] = useState<string | null>(null);
  const [aba, setAba] = useState<Aba>('atividades');

  const [editor, setEditor] = useState<CampoEdit | null>(null);
  const [modalEtiquetas, setModalEtiquetas] = useState(false);
  const [novaEtiqueta, setNovaEtiqueta] = useState('');
  const [planosCat, setPlanosCat] = useState<ItemCatalogo[]>([]);
  const [produtosCat, setProdutosCat] = useState<ItemCatalogo[]>([]);
  const [modalProdutos, setModalProdutos] = useState(false);
  const [selPlanos, setSelPlanos] = useState<Record<string, number>>({});
  const [selProdutos, setSelProdutos] = useState<Record<string, number>>({});
  const [salvandoItens, setSalvandoItens] = useState(false);
  const [ativForm, setAtivForm] = useState<AtivForm | null>(null);
  const [novaNota, setNovaNota] = useState('');
  const [salvandoNota, setSalvandoNota] = useState(false);

  async function carregar() {
    setErro(null);
    try {
      const [l, n, h, a, pls, prs] = await Promise.all([
        api.get<Lead>(`/comercial/leads/${leadId}`),
        api.get<Nota[]>(`/comercial/leads/${leadId}/notas`),
        api.get<Historico[]>(`/comercial/leads/${leadId}/historico`),
        api.get<Atividade[]>(`/comercial/atividades`),
        api.get<ItemCatalogo[]>('/planos').catch(() => ({ data: [] as ItemCatalogo[] })),
        api.get<ItemCatalogo[]>('/produtos').catch(() => ({ data: [] as ItemCatalogo[] })),
      ]);
      setLead(l.data);
      setNotas(n.data);
      setHistorico(h.data);
      setAtividades(a.data.filter((x) => x.lead?.id === leadId));
      setPlanosCat(pls.data.filter((x) => x.ativo));
      setProdutosCat(prs.data.filter((x) => x.ativo));
    } catch {
      setErro('Não foi possível carregar o negócio.');
    } finally {
      setCarregando(false);
    }
  }
  useEffect(() => { setCarregando(true); carregar(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [leadId]);

  // Fecha com ESC.
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape' && !editor && !ativForm && !modalEtiquetas) onFechar(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editor, ativForm, modalEtiquetas, onFechar]);

  const pipelineDoLead =
    pipelines.find((p) => p.id === lead?.pipeline?.id) ??
    pipelines.find((p) => p.etapas.some((e) => e.id === lead?.etapa?.id)) ??
    pipelines[0] ?? null;
  const etapas = pipelineDoLead ? [...pipelineDoLead.etapas].sort((a, b) => a.ordem - b.ordem) : [];
  function etapaAtualId(): string | undefined {
    if (!lead) return undefined;
    if (lead.etapa && etapas.some((e) => e.id === lead.etapa!.id)) return lead.etapa.id;
    return etapas.find((e) => e.status === lead.status)?.id;
  }
  const atualId = etapaAtualId();
  const etapaAtual = etapas.find((e) => e.id === atualId) ?? null;
  const naEtapaDesde = historico[0]?.criadoEm ?? lead?.atualizadoEm ?? null;

  async function patchLead(patch: Record<string, unknown>) {
    setErroAcao(null);
    try { await api.patch(`/comercial/leads/${leadId}`, patch); await carregar(); onMudou(); }
    catch (e: any) { setErroAcao(e?.response?.data?.message ?? 'Não foi possível salvar. Tente novamente.'); }
  }
  async function moverEtapa(etapaId: string) {
    if (etapaId === atualId) return;
    setErroAcao(null);
    try { await api.patch(`/comercial/leads/${leadId}/etapa`, { etapaId }); await carregar(); onMudou(); }
    catch (e: any) { setErroAcao(e?.response?.data?.message ?? 'Não foi possível mover a etapa.'); }
  }
  async function marcar(status: 'GANHO' | 'PERDIDO') {
    setErroAcao(null);
    try { await api.patch(`/comercial/leads/${leadId}/status`, { status }); await carregar(); onMudou(); }
    catch (e: any) { setErroAcao(e?.response?.data?.message ?? 'Não foi possível atualizar o status.'); }
  }

  function abrirEditor(campo: CampoEdit['campo']) {
    if (!lead) return;
    const mapa: Record<CampoEdit['campo'], CampoEdit> = {
      valor: { campo: 'valor', label: 'Valor (R$)', tipo: 'number', valor: lead.valorEstimado ? String(Number(lead.valorEstimado)) : '' },
      previsao: { campo: 'previsao', label: 'Previsão de fechamento', tipo: 'date', valor: lead.previsaoFechamento ? new Date(lead.previsaoFechamento).toISOString().slice(0, 10) : '' },
      contato: { campo: 'contato', label: 'Contato (Pessoa)', tipo: 'text', valor: contatoDe(lead) },
      empresa: { campo: 'empresa', label: 'Empresa', tipo: 'text', valor: lead.empresa ?? '' },
      telefone: { campo: 'telefone', label: 'Telefone', tipo: 'text', valor: lead.telefone ?? '' },
      email: { campo: 'email', label: 'E-mail', tipo: 'text', valor: lead.email ?? '' },
    };
    setEditor(mapa[campo]);
  }
  async function salvarEditor() {
    if (!editor) return;
    const patch: Record<string, unknown> = {};
    if (editor.campo === 'valor') patch.valorEstimado = editor.valor ? String(Number(editor.valor)) : '0';
    else if (editor.campo === 'previsao') { if (editor.valor) patch.previsaoFechamento = new Date(editor.valor).toISOString(); }
    else if (editor.campo === 'contato') patch.observacao = editor.valor.trim() ? `Contato: ${editor.valor.trim()}` : '';
    else if (editor.campo === 'empresa') patch.empresa = editor.valor.trim();
    else if (editor.campo === 'telefone') patch.telefone = editor.valor.trim();
    else if (editor.campo === 'email') patch.email = editor.valor.trim();
    await patchLead(patch);
    setEditor(null);
  }

  async function toggleEtiqueta(id: string) {
    const atuais = (lead?.etiquetas ?? []).map((e) => e.etiqueta.id);
    const novo = atuais.includes(id) ? atuais.filter((x) => x !== id) : [...atuais, id];
    await patchLead({ etiquetaIds: novo });
  }
  async function criarEtiqueta() {
    const nome = novaEtiqueta.trim();
    if (!nome) return;
    try {
      const { data } = await api.post<Etiqueta>('/comercial/etiquetas', { nome });
      setNovaEtiqueta('');
      onEtiquetasMudou();
      const atuais = (lead?.etiquetas ?? []).map((e) => e.etiqueta.id);
      await patchLead({ etiquetaIds: [...atuais, data.id] });
    } catch (e: any) { setErroAcao(e?.response?.data?.message ?? 'Erro ao criar etiqueta.'); }
  }

  // ── Produtos/Planos do negócio ("+ Produtos") ──────────────────────────────
  function abrirProdutos() {
    const sp: Record<string, number> = {};
    (lead?.planos ?? []).forEach((p) => { sp[p.plano.id] = p.quantidade; });
    const spr: Record<string, number> = {};
    (lead?.produtos ?? []).forEach((p) => { spr[p.produto.id] = p.quantidade; });
    setSelPlanos(sp); setSelProdutos(spr); setModalProdutos(true);
  }
  function toggleSel(mapa: Record<string, number>, set: (m: Record<string, number>) => void, id: string) {
    const novo = { ...mapa };
    if (novo[id] !== undefined) delete novo[id]; else novo[id] = 1;
    set(novo);
  }
  function setQtd(mapa: Record<string, number>, set: (m: Record<string, number>) => void, id: string, q: number) {
    set({ ...mapa, [id]: Math.max(1, q || 1) });
  }
  async function salvarItens() {
    setSalvandoItens(true);
    const corpo = {
      planos: Object.entries(selPlanos).map(([planoId, quantidade]) => ({ planoId, quantidade })),
      produtos: Object.entries(selProdutos).map(([produtoId, quantidade]) => ({ produtoId, quantidade })),
    };
    try { await api.put(`/comercial/leads/${leadId}/itens`, corpo); setModalProdutos(false); await carregar(); onMudou(); }
    catch (e: any) { setErroAcao(e?.response?.data?.message ?? 'Não foi possível salvar os itens.'); }
    finally { setSalvandoItens(false); }
  }

  // ── Atividades ─────────────────────────────────────────────────────────────
  function abrirAddAtiv() { setAtivForm({ titulo: '', tipo: 'LIGACAO', vencimento: '', notas: '' }); }
  function abrirEditAtiv(a: Atividade) { setAtivForm({ id: a.id, titulo: a.titulo, tipo: a.tipo, vencimento: toLocalInput(a.vencimento), notas: a.notas ?? '' }); }
  async function salvarAtiv() {
    if (!ativForm || !ativForm.titulo.trim()) return;
    const corpo: Record<string, unknown> = {
      titulo: ativForm.titulo.trim(), tipo: ativForm.tipo,
      ...(ativForm.vencimento && { vencimento: new Date(ativForm.vencimento).toISOString() }),
      ...(ativForm.notas.trim() && { notas: ativForm.notas.trim() }),
      leadId,
    };
    try {
      if (ativForm.id) await api.patch(`/comercial/atividades/${ativForm.id}`, corpo);
      else await api.post('/comercial/atividades', corpo);
      setAtivForm(null); await carregar(); onMudou();
    } catch (e: any) { setErroAcao(e?.response?.data?.message ?? 'Erro ao salvar atividade.'); }
  }
  async function concluirAtiv(id: string) {
    try { await api.patch(`/comercial/atividades/${id}`, { status: 'CONCLUIDA' }); await carregar(); onMudou(); }
    catch (e: any) { setErroAcao(e?.response?.data?.message ?? 'Erro ao concluir atividade.'); }
  }
  async function excluirAtiv(id: string) {
    if (!window.confirm('Excluir esta atividade?')) return;
    try { await api.delete(`/comercial/atividades/${id}`); await carregar(); onMudou(); }
    catch (e: any) { setErroAcao(e?.response?.data?.message ?? 'Erro ao excluir atividade.'); }
  }

  async function salvarNota() {
    const texto = novaNota.trim();
    if (!texto) return;
    setSalvandoNota(true);
    try { await api.post(`/comercial/leads/${leadId}/notas`, { texto }); setNovaNota(''); await carregar(); }
    catch (e: any) { setErroAcao(e?.response?.data?.message ?? 'Erro ao salvar nota.'); }
    finally { setSalvandoNota(false); }
  }

  const ligacoes = atividades.filter((a) => a.tipo === 'LIGACAO');
  const etiquetasLead = lead?.etiquetas ?? [];
  const numVal = (v: string) => Number(v) || 0;
  const totalItens =
    Object.entries(selPlanos).reduce((s, [id, q]) => s + numVal(planosCat.find((p) => p.id === id)?.valor ?? '0') * q, 0) +
    Object.entries(selProdutos).reduce((s, [id, q]) => s + numVal(produtosCat.find((p) => p.id === id)?.valor ?? '0') * q, 0);

  const abaEstilo = (a: Aba, cor = 'var(--amarelo-fagulha)'): CSSProperties => ({
    padding: '10px 4px', border: 'none', background: 'transparent', cursor: 'pointer',
    fontSize: 13.5, fontWeight: 600, color: aba === a ? 'var(--texto)' : 'var(--texto-fraco)',
    borderBottom: `2px solid ${aba === a ? cor : 'transparent'}`,
    display: 'inline-flex', alignItems: 'center', gap: 6,
  });

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'var(--fundo, var(--preto-fumaca))', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
      {/* Cabecalho */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 20px', borderBottom: '1px solid var(--borda)', background: 'var(--superficie)', position: 'sticky', top: 0, zIndex: 5 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <button type="button" onClick={onFechar} title="Voltar" style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid var(--borda)', background: 'var(--superficie-2)', color: 'var(--texto)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}><IcoVoltar /></button>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--texto)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead?.nome ?? 'Negócio'}</div>
            <div style={{ fontSize: 12, color: 'var(--texto-fraco)', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span>{pipelineDoLead?.nome ?? '—'}</span><span>›</span><span style={{ color: 'var(--texto-suave)' }}>{etapaAtual?.nome ?? STATUS_LABEL[lead?.status ?? 'NOVO']}</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: '0 0 auto' }}>
          {lead?.responsavel?.nome && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 4 }}>
              <span style={{ width: 30, height: 30, borderRadius: 999, background: 'var(--gradiente-brasa)', color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{iniciais(lead.responsavel.nome)}</span>
              <div style={{ lineHeight: 1.1 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--texto)' }}>{lead.responsavel.nome}</div>
                <div style={{ fontSize: 10.5, color: 'var(--texto-fraco)' }}>Proprietário</div>
              </div>
            </div>
          )}
          <button type="button" onClick={() => marcar('PERDIDO')} disabled={lead?.status === 'PERDIDO'} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid var(--vermelho-borda)', background: lead?.status === 'PERDIDO' ? 'color-mix(in srgb, var(--vermelho) 22%, transparent)' : 'transparent', color: 'var(--vermelho)', fontSize: 13, fontWeight: 700, cursor: lead?.status === 'PERDIDO' ? 'default' : 'pointer' }}>Perdido</button>
          <button type="button" onClick={() => marcar('GANHO')} disabled={lead?.status === 'GANHO'} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: 'var(--verde)', color: '#052e16', fontSize: 13, fontWeight: 700, cursor: lead?.status === 'GANHO' ? 'default' : 'pointer', opacity: lead?.status === 'GANHO' ? 0.7 : 1 }}>✓ Ganho</button>
        </div>
      </div>

      {carregando ? (
        <div style={{ padding: 40, color: 'var(--texto-fraco)', fontSize: 14 }}>Carregando…</div>
      ) : erro || !lead ? (
        <div style={{ padding: 24 }}><MensagemErro texto={erro ?? 'Negócio não encontrado.'} /></div>
      ) : (
        <>
          {/* Stepper de etapas */}
          {etapas.length > 0 && (
            <div style={{ display: 'flex', gap: 6, padding: '12px 20px', overflowX: 'auto', borderBottom: '1px solid var(--borda)', background: 'var(--superficie)' }}>
              {etapas.map((e) => {
                const ativo = e.id === atualId;
                return (
                  <button key={e.id} type="button" onClick={() => moverEtapa(e.id)}
                    style={{ flex: '1 0 auto', minWidth: 150, padding: '9px 12px', borderRadius: 8, cursor: ativo ? 'default' : 'pointer', fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap',
                      border: `1px solid ${ativo ? 'var(--texto)' : 'var(--borda)'}`, background: ativo ? 'var(--texto)' : 'var(--superficie-2)', color: ativo ? 'var(--superficie)' : 'var(--texto-suave)' }}>
                    {e.nome}
                  </button>
                );
              })}
            </div>
          )}

          {erroAcao && <div style={{ padding: '10px 20px 0' }}><MensagemErro texto={erroAcao} /></div>}

          {/* Corpo: RESUMO + abas */}
          <div style={{ display: 'grid', gridTemplateColumns: '272px 1fr', gap: 0, flex: 1, minHeight: 0 }}>
            {/* RESUMO */}
            <aside style={{ borderRight: '1px solid var(--borda)', padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: 14, background: 'var(--superficie)' }}>
              <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.08em', color: 'var(--texto-fraco)' }}>RESUMO</span>

              <ResumoLinha icone={<IcoDinheiro />} label={<b style={{ fontSize: 15, color: 'var(--texto)' }}>{formatValor(lead.valorEstimado)}</b>} acao={<button type="button" onClick={abrirProdutos} style={linkBtn}>+ Produtos</button>} />
              {((lead.planos?.length ?? 0) > 0 || (lead.produtos?.length ?? 0) > 0) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: -8, marginLeft: 22 }}>
                  {(lead.planos ?? []).map((p) => (
                    <ItemLinha key={`pl-${p.plano.id}`} tag="Plano" nome={p.plano.nome} qtd={p.quantidade} valor={formatValor(String(numVal(p.plano.valor) * p.quantidade))} />
                  ))}
                  {(lead.produtos ?? []).map((p) => (
                    <ItemLinha key={`pr-${p.produto.id}`} tag="Produto" nome={p.produto.nome} qtd={p.quantidade} valor={formatValor(String(numVal(p.produto.valor) * p.quantidade))} />
                  ))}
                </div>
              )}
              <ResumoLinha icone={<IcoCalendario />} label={<span style={{ fontSize: 13, color: 'var(--texto-suave)' }}>Previsão</span>} acao={<button type="button" onClick={() => abrirEditor('previsao')} style={linkBtn}>{lead.previsaoFechamento ? new Date(lead.previsaoFechamento).toLocaleDateString('pt-BR') : 'Definir data'}</button>} />
              <ResumoLinha icone={<IcoRelogio />} label={<span style={{ fontSize: 13, color: 'var(--texto-suave)' }}>Na etapa</span>} acao={<span style={{ fontSize: 13, fontWeight: 700, color: 'var(--texto)' }}>{naEtapaDesde ? `${diasDesde(naEtapaDesde)} dias` : '—'}</span>} />
              <ResumoLinha icone={<IcoPercent />} label={<span style={{ fontSize: 13, color: 'var(--texto-suave)' }}>Probabilidade</span>} acao={<span style={{ fontSize: 13, fontWeight: 700, color: 'var(--texto)' }}>{PROBABILIDADE[lead.status]}%</span>} />

              <div style={{ borderTop: '1px solid var(--borda)', paddingTop: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--texto-suave)' }}><IcoTag /> Etiquetas</span>
                  <button type="button" onClick={() => setModalEtiquetas(true)} style={linkBtn}>Editar</button>
                </div>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {etiquetasLead.length === 0 ? (
                    <button type="button" onClick={() => setModalEtiquetas(true)} style={{ fontSize: 11.5, padding: '4px 10px', borderRadius: 999, border: '1px dashed var(--borda-forte)', background: 'transparent', color: 'var(--texto-fraco)', cursor: 'pointer' }}>+ Adicionar etiqueta</button>
                  ) : etiquetasLead.map((e) => (
                    <span key={e.etiqueta.id} style={{ fontSize: 10.5, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: `color-mix(in srgb, ${e.etiqueta.cor} 18%, transparent)`, color: e.etiqueta.cor, border: `1px solid color-mix(in srgb, ${e.etiqueta.cor} 45%, transparent)` }}>{e.etiqueta.nome}</span>
                  ))}
                </div>
              </div>

              <button type="button" onClick={() => abrirEditor('contato')} style={vincularBtn}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0 }}><IcoPessoa /><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{contatoDe(lead) || 'Vincular contato'}</span></span>
                <IcoLink />
              </button>
              <button type="button" onClick={() => abrirEditor('empresa')} style={vincularBtn}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0 }}><IcoEmpresa /><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.empresa || lead.cliente?.nomeFantasia || 'Vincular empresa'}</span></span>
                <IcoLink />
              </button>
            </aside>

            {/* Abas + conteudo */}
            <section style={{ display: 'flex', flexDirection: 'column', minWidth: 0, background: 'var(--superficie-2)' }}>
              <div style={{ display: 'flex', gap: 18, padding: '0 20px', borderBottom: '1px solid var(--borda)', background: 'var(--superficie)', overflowX: 'auto' }}>
                <button type="button" style={abaEstilo('atividades')} onClick={() => setAba('atividades')}>Atividades <Contador n={atividades.length} /></button>
                <button type="button" style={abaEstilo('notas')} onClick={() => setAba('notas')}>Notas</button>
                <button type="button" style={abaEstilo('historico')} onClick={() => setAba('historico')}>Histórico</button>
                <button type="button" style={abaEstilo('ligacoes', '#a855f7')} onClick={() => setAba('ligacoes')}>Ligações</button>
                <button type="button" style={abaEstilo('whatsapp', 'var(--verde)')} onClick={() => setAba('whatsapp')}>WhatsApp</button>
                <button type="button" style={abaEstilo('email', 'var(--azul)')} onClick={() => setAba('email')}>Email</button>
              </div>

              <div style={{ padding: 20, flex: 1, minWidth: 0 }}>
                {aba === 'atividades' && (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                      <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', color: 'var(--texto-fraco)' }}>ATIVIDADES</span>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button type="button" title="Sequências (em breve)" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 11px', borderRadius: 8, border: '1px solid var(--borda)', background: 'var(--superficie)', color: 'var(--texto-suave)', fontSize: 12.5, cursor: 'default' }}>Sequências <IcoChevron /></button>
                        <Btn tamanho="sm" onClick={abrirAddAtiv}>+ Adicionar</Btn>
                      </div>
                    </div>
                    {atividades.length === 0 ? (
                      <Vazio icone={<IcoRelogio />} titulo="Nenhuma atividade" sub="Use “+ Adicionar” para registrar uma tarefa, ligação ou reunião." />
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {atividades.map((a) => {
                          const hoje = a.vencimento ? mesmaData(new Date(a.vencimento), new Date()) : false;
                          const concluida = a.status === 'CONCLUIDA';
                          return (
                            <div key={a.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', background: 'var(--superficie)', border: '1px solid var(--borda)', borderRadius: 10, padding: 12, opacity: concluida ? 0.6 : 1 }}>
                              <span style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--superficie-3)', color: 'var(--texto-suave)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}><IcoRelogio /></span>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--texto)', textDecoration: concluida ? 'line-through' : 'none' }}>{a.titulo}</div>
                                {a.notas && (ehUrl(a.notas)
                                  ? <a href={a.notas} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--azul)', display: 'inline-flex', alignItems: 'center', gap: 4, wordBreak: 'break-all' }}><IcoLink /> {a.notas}</a>
                                  : <div style={{ fontSize: 12, color: 'var(--texto-suave)' }}>{a.notas}</div>)}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, fontSize: 11.5, color: 'var(--texto-fraco)' }}>
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><IcoCalendario /> {a.vencimento ? fmtDataHora(a.vencimento) : TIPO_LABEL[a.tipo]}</span>
                                  {hoje && !concluida && <span style={{ fontSize: 10.5, fontWeight: 700, padding: '1px 7px', borderRadius: 6, background: 'color-mix(in srgb, var(--verde) 18%, transparent)', color: 'var(--verde)' }}>Hoje</span>}
                                  {concluida && <span style={{ fontSize: 10.5, fontWeight: 700, padding: '1px 7px', borderRadius: 6, background: 'var(--superficie-3)', color: 'var(--texto-suave)' }}>Concluída</span>}
                                </div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: '0 0 auto' }}>
                                <button type="button" title="Editar" onClick={() => abrirEditAtiv(a)} style={iconBtn}><IcoEditar /></button>
                                <button type="button" title="Excluir" onClick={() => excluirAtiv(a.id)} style={iconBtn}><IcoLixeira /></button>
                                {!concluida && <button type="button" onClick={() => concluirAtiv(a.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 7, border: '1px solid var(--borda)', background: 'var(--superficie-2)', color: 'var(--texto-suave)', fontSize: 12, cursor: 'pointer' }}><IcoOk /> Concluir</button>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}

                {aba === 'notas' && (
                  <>
                    <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', color: 'var(--texto-fraco)' }}>NOTAS</span>
                    <div style={{ marginTop: 10, background: 'var(--superficie)', border: '1px solid var(--borda)', borderRadius: 10, padding: 12 }}>
                      <textarea value={novaNota} onChange={(e) => setNovaNota(e.target.value)} placeholder="Adicione uma nota sobre este negócio..." rows={3}
                        style={{ width: '100%', resize: 'vertical', background: 'transparent', border: 'none', outline: 'none', color: 'var(--texto)', fontSize: 13.5, fontFamily: 'inherit' }} />
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                        <Btn tamanho="sm" onClick={salvarNota} disabled={salvandoNota || !novaNota.trim()}>{salvandoNota ? 'Salvando…' : 'Salvar Nota'}</Btn>
                      </div>
                    </div>
                    {notas.length === 0 ? (
                      <Vazio icone={<IcoEditar />} titulo="Nenhuma nota ainda" />
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
                        {notas.map((n) => (
                          <div key={n.id} style={{ background: 'var(--superficie)', border: '1px solid var(--borda)', borderRadius: 10, padding: 12 }}>
                            <div style={{ fontSize: 13.5, color: 'var(--texto)', whiteSpace: 'pre-wrap' }}>{n.texto}</div>
                            <div style={{ fontSize: 11, color: 'var(--texto-fraco)', marginTop: 6 }}>{fmtDataHora(n.criadoEm)}{n.autor?.nome ? ` · ${n.autor.nome}` : ''}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {aba === 'historico' && (
                  <>
                    <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', color: 'var(--texto-fraco)' }}>HISTÓRICO</span>
                    {historico.length === 0 ? (
                      <Vazio icone={<IcoSeta />} titulo="Nenhum histórico ainda" sub="As mudanças de etapa e status aparecem aqui." />
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
                        {historico.map((h) => (
                          <div key={h.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                            <span style={{ width: 30, height: 30, borderRadius: 999, background: 'color-mix(in srgb, var(--azul) 18%, transparent)', color: 'var(--azul)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}><IcoSeta /></span>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--texto)' }}>{h.acao}</div>
                              {(h.de || h.para) && <div style={{ fontSize: 12.5, color: 'var(--texto-suave)' }}>{h.de ?? '—'} → {h.para ?? '—'}</div>}
                              <div style={{ fontSize: 11, color: 'var(--texto-fraco)', marginTop: 2 }}>{fmtDataHora(h.criadoEm)}{h.autor?.nome ? ` · ${h.autor.nome}` : ''}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {aba === 'ligacoes' && (
                  ligacoes.length === 0 ? (
                    <Vazio icone={<IcoTelefone />} titulo="Nenhuma ligação registrada" sub="Registre uma atividade do tipo Ligação para acompanhar aqui." />
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {ligacoes.map((a) => (
                        <div key={a.id} style={{ display: 'flex', gap: 12, alignItems: 'center', background: 'var(--superficie)', border: '1px solid var(--borda)', borderRadius: 10, padding: 12 }}>
                          <span style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--superficie-3)', color: 'var(--texto-suave)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IcoTelefone /></span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--texto)' }}>{a.titulo}</div>
                            <div style={{ fontSize: 11.5, color: 'var(--texto-fraco)' }}>{a.vencimento ? fmtDataHora(a.vencimento) : ''}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}

                {aba === 'whatsapp' && (
                  soDigitos(lead.telefone) ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '30px 10px' }}>
                      <span style={{ fontSize: 14, color: 'var(--texto)' }}>{lead.telefone}</span>
                      <a href={`https://wa.me/${soDigitos(lead.telefone)}`} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, background: 'var(--verde)', color: '#052e16', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}><IcoTelefone /> Abrir no WhatsApp</a>
                    </div>
                  ) : (
                    <Vazio icone={<IcoTelefone />} titulo="Contato sem telefone" sub="Adicione um telefone ao contato para enviar mensagens" acao={<Btn tamanho="sm" variante="secondary" onClick={() => abrirEditor('telefone')}>Adicionar telefone</Btn>} />
                  )
                )}

                {aba === 'email' && (
                  lead.email ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '30px 10px' }}>
                      <span style={{ fontSize: 14, color: 'var(--texto)' }}>{lead.email}</span>
                      <a href={`mailto:${lead.email}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, background: 'var(--azul)', color: '#fff', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}><IcoMail /> Enviar e-mail</a>
                    </div>
                  ) : (
                    <Vazio icone={<IcoMail />} titulo="Contato sem email" sub="Adicione um email ao contato para enviar e receber emails" acao={<Btn tamanho="sm" variante="secondary" onClick={() => abrirEditor('email')}>Adicionar email</Btn>} />
                  )
                )}
              </div>
            </section>
          </div>
        </>
      )}

      {/* Editor de campo simples */}
      {editor && (
        <Modal titulo={`Editar ${editor.label}`} onFechar={() => setEditor(null)}
          rodape={<><Btn variante="secondary" onClick={() => setEditor(null)}>Cancelar</Btn><Btn onClick={salvarEditor}>Salvar</Btn></>}>
          <Campo rotulo={editor.label} type={editor.tipo === 'number' ? 'number' : editor.tipo === 'date' ? 'date' : 'text'}
            {...(editor.tipo === 'number' ? { step: '0.01', min: '0' } : {})}
            value={editor.valor} onChange={(e) => setEditor((ed) => (ed ? { ...ed, valor: e.target.value } : ed))} autoFocus />
        </Modal>
      )}

      {/* Editor de etiquetas */}
      {modalEtiquetas && (
        <Modal titulo="Etiquetas do negócio" onFechar={() => setModalEtiquetas(false)}
          rodape={<Btn onClick={() => setModalEtiquetas(false)}>Concluir</Btn>}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            {etiquetas.length === 0 && <span style={{ fontSize: 12.5, color: 'var(--texto-fraco)' }}>Nenhuma etiqueta criada ainda.</span>}
            {etiquetas.map((e) => {
              const marcada = (lead?.etiquetas ?? []).some((x) => x.etiqueta.id === e.id);
              return (
                <button key={e.id} type="button" onClick={() => toggleEtiqueta(e.id)}
                  style={{ fontSize: 11.5, padding: '4px 10px', borderRadius: 999, cursor: 'pointer', border: `1px solid color-mix(in srgb, ${e.cor} 45%, transparent)`, background: marcada ? `color-mix(in srgb, ${e.cor} 22%, transparent)` : 'transparent', color: e.cor, fontWeight: marcada ? 700 : 500 }}>
                  {marcada ? '✓ ' : ''}{e.nome}
                </button>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="brk-input" placeholder="Nova etiqueta…" value={novaEtiqueta} onChange={(e) => setNovaEtiqueta(e.target.value)} style={{ flex: 1 }} />
            <Btn variante="secondary" tamanho="sm" onClick={criarEtiqueta} disabled={!novaEtiqueta.trim()}>Criar</Btn>
          </div>
        </Modal>
      )}

      {/* Planos e Produtos do negócio ("+ Produtos") */}
      {modalProdutos && (
        <Modal titulo="Planos e Produtos do negócio" onFechar={() => setModalProdutos(false)}
          rodape={<><Btn variante="secondary" onClick={() => setModalProdutos(false)}>Cancelar</Btn><Btn onClick={salvarItens} disabled={salvandoItens}>{salvandoItens ? 'Salvando…' : 'Salvar'}</Btn></>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ fontSize: 12, color: 'var(--texto-fraco)', margin: 0 }}>Selecione um plano, um produto, ou ambos. O valor do negócio passa a somar os itens.</p>
            <SecaoItens titulo="Planos" itens={planosCat} sel={selPlanos} onToggle={(id) => toggleSel(selPlanos, setSelPlanos, id)} onQtd={(id, q) => setQtd(selPlanos, setSelPlanos, id, q)} />
            <SecaoItens titulo="Produtos" itens={produtosCat} sel={selProdutos} onToggle={(id) => toggleSel(selProdutos, setSelProdutos, id)} onQtd={(id, q) => setQtd(selProdutos, setSelProdutos, id, q)} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--borda)', paddingTop: 12 }}>
              <span style={{ fontSize: 13, color: 'var(--texto-suave)' }}>Total do negócio</span>
              <b style={{ fontSize: 16, color: 'var(--texto)' }}>{formatValor(String(totalItens))}</b>
            </div>
          </div>
        </Modal>
      )}

      {/* Editor de atividade */}
      {ativForm && (
        <Modal titulo={ativForm.id ? 'Editar atividade' : 'Nova atividade'} onFechar={() => setAtivForm(null)}
          rodape={<><Btn variante="secondary" onClick={() => setAtivForm(null)}>Cancelar</Btn><Btn onClick={salvarAtiv} disabled={!ativForm.titulo.trim()}>Salvar</Btn></>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Campo rotulo="Título" value={ativForm.titulo} onChange={(e) => setAtivForm((f) => (f ? { ...f, titulo: e.target.value } : f))} placeholder="Ex.: Dia 1 - Instagram 1" autoFocus />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <CampoSelect rotulo="Tipo" value={ativForm.tipo} onChange={(e) => setAtivForm((f) => (f ? { ...f, tipo: e.target.value as TipoAtividade } : f))}>
                {TIPOS.map((t) => <option key={t} value={t}>{TIPO_LABEL[t]}</option>)}
              </CampoSelect>
              <Campo rotulo="Data/hora" type="datetime-local" value={ativForm.vencimento} onChange={(e) => setAtivForm((f) => (f ? { ...f, vencimento: e.target.value } : f))} />
            </div>
            <Campo rotulo="Nota / link" value={ativForm.notas} onChange={(e) => setAtivForm((f) => (f ? { ...f, notas: e.target.value } : f))} placeholder="Descrição ou link (https://…)" />
          </div>
        </Modal>
      )}
    </div>
  );
}

const linkBtn: CSSProperties = { border: 'none', background: 'transparent', color: 'var(--amarelo-fagulha)', fontSize: 12.5, cursor: 'pointer', padding: 0, fontWeight: 600 };
const vincularBtn: CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, width: '100%', padding: '10px 12px', borderRadius: 9, border: '1px solid var(--borda)', background: 'var(--superficie-2)', color: 'var(--texto-suave)', fontSize: 12.5, cursor: 'pointer' };
const iconBtn: CSSProperties = { width: 28, height: 28, borderRadius: 7, border: '1px solid var(--borda)', background: 'transparent', color: 'var(--texto-fraco)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' };

function ResumoLinha({ icone, label, acao }: { icone: ReactNode; label: ReactNode; acao: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--texto-fraco)', minWidth: 0 }}>{icone}{label}</span>
      {acao}
    </div>
  );
}
function Contador({ n }: { n: number }) {
  return <span style={{ fontSize: 10.5, fontWeight: 700, padding: '1px 7px', borderRadius: 999, background: 'var(--superficie-3)', color: 'var(--texto-suave)' }}>{n}</span>;
}
function ItemLinha({ tag, nome, qtd, valor }: { tag: string; nome: string; qtd: number; valor: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, fontSize: 11.5, color: 'var(--texto-suave)' }}>
      <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        <span style={{ fontSize: 9.5, fontWeight: 700, padding: '0 5px', borderRadius: 5, background: 'var(--superficie-4)', color: 'var(--texto-fraco)', marginRight: 5 }}>{tag}</span>
        {nome}{qtd > 1 ? ` ×${qtd}` : ''}
      </span>
      <span style={{ flex: '0 0 auto', color: 'var(--texto-fraco)' }}>{valor}</span>
    </div>
  );
}
function SecaoItens({ titulo, itens, sel, onToggle, onQtd }: { titulo: string; itens: ItemCatalogo[]; sel: Record<string, number>; onToggle: (id: string) => void; onQtd: (id: string, q: number) => void }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', color: 'var(--texto-fraco)', marginBottom: 8 }}>{titulo.toUpperCase()}</div>
      {itens.length === 0 ? (
        <div style={{ fontSize: 12.5, color: 'var(--texto-fraco)' }}>Nenhum {titulo.toLowerCase().replace(/s$/, '')} cadastrado.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {itens.map((it) => {
            const marcado = sel[it.id] !== undefined;
            return (
              <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 9, border: `1px solid ${marcado ? 'var(--amarelo-fagulha)' : 'var(--borda)'}`, background: marcado ? 'color-mix(in srgb, var(--amarelo-fagulha) 10%, transparent)' : 'var(--superficie-2)' }}>
                <input type="checkbox" checked={marcado} onChange={() => onToggle(it.id)} style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--amarelo-fagulha)' }} />
                <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: 'var(--texto)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.nome}</span>
                <span style={{ fontSize: 12.5, color: 'var(--texto-suave)', flex: '0 0 auto' }}>R$ {(Number(it.valor) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                {marcado && (
                  <input type="number" min={1} value={sel[it.id]} onChange={(e) => onQtd(it.id, parseInt(e.target.value, 10))} title="Quantidade" className="brk-input" style={{ width: 58, flex: '0 0 auto', padding: '4px 6px' }} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
function Vazio({ icone, titulo, sub, acao }: { icone: ReactNode; titulo: string; sub?: string; acao?: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '40px 16px', textAlign: 'center', color: 'var(--texto-fraco)' }}>
      <span style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--superficie-3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icone}</span>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--texto-suave)' }}>{titulo}</div>
      {sub && <div style={{ fontSize: 12.5 }}>{sub}</div>}
      {acao && <div style={{ marginTop: 6 }}>{acao}</div>}
    </div>
  );
}
