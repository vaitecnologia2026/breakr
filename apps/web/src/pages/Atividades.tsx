// Tela "Atividades" (CRM Comercial) — ligada ao backend real
// (/comercial/atividades). Layout no padrão do wireframe (RD Station):
//  - Cabeçalho com contagem + alternador Lista/Calendário + filtros (tipo e
//    usuário) + "Nova Atividade".
//  - Abas de período: Hoje / Amanhã / Esta semana / Próxima semana / Vencido /
//    Selecionar período / Concluídas.
//  - Visão Lista (cards com ícone do tipo, negócio, empresa, responsável,
//    data e badge) e visão Calendário (grade do mês com pílulas por dia).
//  - Modal Nova/Editar Atividade: 8 tipos (Videochamada e LinkedIn são salvos
//    como "Outro" no backend), data + hora início/fim, negócio, notas,
//    responsável e "Marcar como feito".
// Estados carregando/erro/vazio no padrão do app; em modo demo usa mock.
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { api } from '../lib/api';
import { comDemo, mockSeDemo } from '../lib/demo';
import { useAuth } from '../lib/auth';
import { PaginaShell, EstadoCarregando, EstadoErro, PainelVazio, MensagemErro } from '../components/primitivos';
import { Badge, Btn, Modal } from '../components/ui';

// ── Tipos ──
type TipoAtividade = 'LIGACAO' | 'WHATSAPP' | 'EMAIL' | 'INSTAGRAM' | 'REUNIAO' | 'OUTRO';
type StatusAtividade = 'PENDENTE' | 'CONCLUIDA';

interface Atividade {
  id: string;
  titulo: string;
  tipo: TipoAtividade;
  status: StatusAtividade;
  vencimento: string | null;
  horaFim: string | null;
  notas: string | null;
  criadoEm: string;
  lead?: { id: string; nome: string; empresa: string | null } | null;
  responsavel?: { nome: string } | null;
}

// Negócio (lead) para vincular a atividade — liga a tela Atividades ao pipeline
// de Negócios (/comercial/leads). Só o necessário para o seletor do modal.
interface LeadOpcao {
  id: string;
  nome: string;
  empresa: string | null;
}

// Tipo "visual" do wireframe (8 opções). O backend só tem 6 tipos, então
// Videochamada e LinkedIn são gravados como OUTRO (mapeamento abaixo). Ao
// recarregar, ambos aparecem como "Outro" (limitação aceita do mapeamento).
type TipoVisual = 'REUNIAO' | 'LIGACAO' | 'VIDEOCHAMADA' | 'EMAIL' | 'WHATSAPP' | 'INSTAGRAM' | 'LINKEDIN' | 'OUTRO';

const TIPOS_VISUAIS: { chave: TipoVisual; rotulo: string }[] = [
  { chave: 'REUNIAO', rotulo: 'Reunião' },
  { chave: 'LIGACAO', rotulo: 'Ligação' },
  { chave: 'VIDEOCHAMADA', rotulo: 'Videochamada' },
  { chave: 'EMAIL', rotulo: 'E-mail' },
  { chave: 'WHATSAPP', rotulo: 'WhatsApp' },
  { chave: 'INSTAGRAM', rotulo: 'Instagram' },
  { chave: 'LINKEDIN', rotulo: 'LinkedIn' },
  { chave: 'OUTRO', rotulo: 'Outro' },
];

const VISUAL_PARA_BACKEND: Record<TipoVisual, TipoAtividade> = {
  REUNIAO: 'REUNIAO', LIGACAO: 'LIGACAO', VIDEOCHAMADA: 'OUTRO', EMAIL: 'EMAIL',
  WHATSAPP: 'WHATSAPP', INSTAGRAM: 'INSTAGRAM', LINKEDIN: 'OUTRO', OUTRO: 'OUTRO',
};

const ROTULO_TIPO: Record<TipoAtividade, string> = {
  LIGACAO: 'Ligação', WHATSAPP: 'WhatsApp', EMAIL: 'E-mail', INSTAGRAM: 'Instagram', REUNIAO: 'Reunião', OUTRO: 'Outro',
};

const MOCK_ATIVIDADES: Atividade[] = [
  { id: 'm1', titulo: 'Tentativa de contato via ligação', tipo: 'LIGACAO', status: 'PENDENTE', vencimento: new Date().toISOString(), horaFim: null, notas: null, criadoEm: new Date().toISOString(), lead: { id: 'l1', nome: 'KI PIZZA TEUTÔNIA', empresa: null }, responsavel: { nome: 'Gustavo Costa' } },
  { id: 'm2', titulo: 'Tentativa de agendar reunião', tipo: 'WHATSAPP', status: 'PENDENTE', vencimento: new Date().toISOString(), horaFim: null, notas: null, criadoEm: new Date().toISOString(), lead: { id: 'l2', nome: 'Ditto Pizzaria', empresa: null }, responsavel: { nome: 'Gustavo Costa' } },
];

const MOCK_LEADS: LeadOpcao[] = [
  { id: 'l1', nome: 'KI PIZZA TEUTÔNIA', empresa: null },
  { id: 'l2', nome: 'Ditto Pizzaria', empresa: null },
];

// ── Ícones (padrão SVG monocromático do app) ──
function Ico({ children, tamanho = 16 }: { children: ReactNode; tamanho?: number }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
  );
}
const IcoPessoas = (p: { tamanho?: number }) => <Ico tamanho={p.tamanho}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></Ico>;
const IcoTelefone = (p: { tamanho?: number }) => <Ico tamanho={p.tamanho}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" /></Ico>;
const IcoVideo = (p: { tamanho?: number }) => <Ico tamanho={p.tamanho}><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" /></Ico>;
const IcoEmail = (p: { tamanho?: number }) => <Ico tamanho={p.tamanho}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></Ico>;
const IcoChat = (p: { tamanho?: number }) => <Ico tamanho={p.tamanho}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></Ico>;
const IcoInstagram = (p: { tamanho?: number }) => <Ico tamanho={p.tamanho}><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></Ico>;
const IcoLinkedin = (p: { tamanho?: number }) => <Ico tamanho={p.tamanho}><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" /><rect x="2" y="9" width="4" height="12" /><circle cx="4" cy="4" r="2" /></Ico>;
const IcoCirculo = (p: { tamanho?: number }) => <Ico tamanho={p.tamanho}><circle cx="12" cy="12" r="10" /></Ico>;
const IcoCalendario = (p: { tamanho?: number }) => <Ico tamanho={p.tamanho}><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></Ico>;
const IcoEmpresa = (p: { tamanho?: number }) => <Ico tamanho={p.tamanho}><path d="M3 21h18" /><path d="M5 21V7l8-4v18" /><path d="M19 21V11l-6-4" /></Ico>;
const IcoUsuario = (p: { tamanho?: number }) => <Ico tamanho={p.tamanho}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></Ico>;
const IcoFiltro = (p: { tamanho?: number }) => <Ico tamanho={p.tamanho}><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></Ico>;
const IcoChevron = (p: { tamanho?: number }) => <Ico tamanho={p.tamanho}><polyline points="6 9 12 15 18 9" /></Ico>;
const IcoCheck = (p: { tamanho?: number }) => <Ico tamanho={p.tamanho}><polyline points="20 6 9 17 4 12" /></Ico>;
const IcoLista = (p: { tamanho?: number }) => <Ico tamanho={p.tamanho}><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></Ico>;
const IcoSetaEsq = (p: { tamanho?: number }) => <Ico tamanho={p.tamanho}><polyline points="15 18 9 12 15 6" /></Ico>;
const IcoSetaDir = (p: { tamanho?: number }) => <Ico tamanho={p.tamanho}><polyline points="9 18 15 12 9 6" /></Ico>;

function iconeVisual(chave: TipoVisual, tamanho = 15) {
  switch (chave) {
    case 'REUNIAO': return <IcoPessoas tamanho={tamanho} />;
    case 'LIGACAO': return <IcoTelefone tamanho={tamanho} />;
    case 'VIDEOCHAMADA': return <IcoVideo tamanho={tamanho} />;
    case 'EMAIL': return <IcoEmail tamanho={tamanho} />;
    case 'WHATSAPP': return <IcoChat tamanho={tamanho} />;
    case 'INSTAGRAM': return <IcoInstagram tamanho={tamanho} />;
    case 'LINKEDIN': return <IcoLinkedin tamanho={tamanho} />;
    default: return <IcoCirculo tamanho={tamanho} />;
  }
}
function iconeBackend(tipo: TipoAtividade, tamanho = 16) {
  switch (tipo) {
    case 'REUNIAO': return <IcoPessoas tamanho={tamanho} />;
    case 'LIGACAO': return <IcoTelefone tamanho={tamanho} />;
    case 'EMAIL': return <IcoEmail tamanho={tamanho} />;
    case 'WHATSAPP': return <IcoChat tamanho={tamanho} />;
    case 'INSTAGRAM': return <IcoInstagram tamanho={tamanho} />;
    default: return <IcoCirculo tamanho={tamanho} />;
  }
}

// ── Datas ──
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const MES_CURTO = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const DIAS_SEMANA = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];
const p2 = (n: number) => String(n).padStart(2, '0');

function inicioDoDia(d: Date): Date { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function addDias(d: Date, n: number): Date { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
function inicioSemana(d: Date): Date { const s = inicioDoDia(d); s.setDate(s.getDate() - s.getDay()); return s; }
function fimSemana(d: Date): Date { const e = inicioSemana(d); e.setDate(e.getDate() + 6); e.setHours(23, 59, 59, 999); return e; }
function mesmaData(a: Date, b: Date): boolean { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }

function dataParaInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso); if (isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
}
function horaParaInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso); if (isNaN(d.getTime())) return '';
  if (d.getHours() === 0 && d.getMinutes() === 0) return '';
  return `${p2(d.getHours())}:${p2(d.getMinutes())}`;
}
function combinarISO(data: string, hora: string): string | undefined {
  if (!data) return undefined;
  const h = /^\d{2}:\d{2}$/.test(hora) ? hora : '00:00';
  const d = new Date(`${data}T${h}`);
  if (isNaN(d.getTime())) return undefined;
  return d.toISOString();
}
function textoDataCard(iso: string): string {
  const d = new Date(iso);
  const base = `${p2(d.getDate())} de ${MES_CURTO[d.getMonth()]}.`;
  if (d.getHours() === 0 && d.getMinutes() === 0) return base;
  return `${base} ${p2(d.getHours())}:${p2(d.getMinutes())}`;
}

// ── Abas de período ──
type Aba = 'Hoje' | 'Amanhã' | 'Esta semana' | 'Próxima semana' | 'Vencido' | 'Selecionar período' | 'Concluídas';
const ABAS: Aba[] = ['Hoje', 'Amanhã', 'Esta semana', 'Próxima semana', 'Vencido', 'Selecionar período', 'Concluídas'];

// ── Dropdown de filtro (botão + menu) ──
function Dropdown({ icone, itens, valor, aoEscolher }: {
  icone: ReactNode;
  itens: { valor: string; rotulo: string; icone?: ReactNode }[];
  valor: string;
  aoEscolher: (v: string) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function fora(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false); }
    document.addEventListener('mousedown', fora);
    return () => document.removeEventListener('mousedown', fora);
  }, []);
  const atual = itens.find((i) => i.valor === valor);
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button type="button" onClick={() => setAberto((v) => !v)} style={{
        display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 12px', fontSize: 12.5,
        background: 'var(--superficie-2)', border: '1px solid var(--borda)', borderRadius: 8,
        color: 'var(--texto-suave)', cursor: 'pointer', whiteSpace: 'nowrap',
      }}>
        <span style={{ color: 'var(--texto-fraco)', display: 'inline-flex' }}>{icone}</span>
        {atual?.rotulo ?? ''}
        <span style={{ color: 'var(--texto-fraco)', display: 'inline-flex' }}><IcoChevron tamanho={13} /></span>
      </button>
      {aberto && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', right: 0, zIndex: 30, minWidth: 190,
          background: 'var(--superficie-3)', border: '1px solid var(--borda-forte)', borderRadius: 10,
          padding: 5, boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
        }}>
          {itens.map((i) => (
            <button key={i.valor} type="button" onClick={() => { aoEscolher(i.valor); setAberto(false); }} style={{
              display: 'flex', alignItems: 'center', gap: 9, width: '100%', textAlign: 'left',
              padding: '8px 10px', fontSize: 12.5, borderRadius: 7, cursor: 'pointer', border: 'none',
              background: i.valor === valor ? 'var(--superficie-4)' : 'transparent',
              color: i.valor === valor ? 'var(--texto)' : 'var(--texto-suave)',
            }}>
              {i.icone && <span style={{ color: 'var(--texto-fraco)', display: 'inline-flex' }}>{i.icone}</span>}
              <span style={{ flex: 1 }}>{i.rotulo}</span>
              {i.valor === valor && <span style={{ color: 'var(--amarelo-fagulha)', display: 'inline-flex' }}><IcoCheck tamanho={14} /></span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function Atividades() {
  const { usuario } = useAuth();
  const [lista, setLista] = useState<Atividade[]>([]);
  const [leads, setLeads] = useState<LeadOpcao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [erroAcao, setErroAcao] = useState<string | null>(null);

  const [visao, setVisao] = useState<'lista' | 'calendario'>('lista');
  const [aba, setAba] = useState<Aba>('Hoje');
  const [filtroTipo, setFiltroTipo] = useState<string>('TODOS');
  const [filtroUsuario, setFiltroUsuario] = useState<string>('TODOS');

  const agora = new Date();
  const [periodoDe, setPeriodoDe] = useState<string>(`${agora.getFullYear()}-${p2(agora.getMonth() + 1)}-01`);
  const [periodoAte, setPeriodoAte] = useState<string>(`${agora.getFullYear()}-${p2(agora.getMonth() + 1)}-${p2(agora.getDate())}`);
  const [mesRef, setMesRef] = useState<{ ano: number; mes: number }>({ ano: agora.getFullYear(), mes: agora.getMonth() });

  const [modal, setModal] = useState<'novo' | 'editar' | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState<{
    id?: string; tipoVisual: TipoVisual; titulo: string; data: string; horaInicio: string; horaFim: string;
    leadId: string; buscaLead: string; notas: string; responsavelId: string; marcarFeito: boolean;
  }>({ id: undefined, tipoVisual: 'LIGACAO', titulo: '', data: '', horaInicio: '', horaFim: '', leadId: '', buscaLead: '', notas: '', responsavelId: '', marcarFeito: false });

  async function carregar() {
    setCarregando(true);
    setErro(null);
    try {
      const { data } = await api.get<Atividade[]>('/comercial/atividades');
      setLista(comDemo(data, MOCK_ATIVIDADES));
    } catch {
      setLista(mockSeDemo(MOCK_ATIVIDADES));
    } finally {
      setCarregando(false);
    }
  }

  // Carrega os Negócios (leads) para o seletor de vínculo do modal. Falha aqui
  // não bloqueia a lista de atividades — o seletor só fica sem opções.
  async function carregarLeads() {
    try {
      const { data } = await api.get<LeadOpcao[]>('/comercial/leads');
      setLeads(comDemo(data, MOCK_LEADS));
    } catch {
      setLeads(mockSeDemo(MOCK_LEADS));
    }
  }

  useEffect(() => {
    carregar();
    carregarLeads();
  }, []);

  async function concluir(id: string) {
    setErroAcao(null);
    try {
      await api.patch(`/comercial/atividades/${id}`, { status: 'CONCLUIDA' });
      await carregar();
    } catch {
      setErroAcao('Não foi possível concluir a atividade.');
    }
  }

  function abrirNovo() {
    setErroAcao(null);
    setForm({
      id: undefined, tipoVisual: 'LIGACAO', titulo: '',
      data: `${agora.getFullYear()}-${p2(agora.getMonth() + 1)}-${p2(agora.getDate())}`,
      horaInicio: '', horaFim: '', leadId: '', buscaLead: '', notas: '',
      responsavelId: usuario?.id ?? '', marcarFeito: false,
    });
    setModal('novo');
  }

  function abrirEditar(a: Atividade) {
    setErroAcao(null);
    setForm({
      id: a.id,
      tipoVisual: a.tipo as TipoVisual,
      titulo: a.titulo,
      data: dataParaInput(a.vencimento),
      horaInicio: horaParaInput(a.vencimento),
      horaFim: horaParaInput(a.horaFim),
      leadId: a.lead?.id ?? '',
      buscaLead: a.lead ? (a.lead.empresa ? `${a.lead.nome} · ${a.lead.empresa}` : a.lead.nome) : '',
      notas: a.notas ?? '',
      responsavelId: usuario?.id ?? '',
      marcarFeito: false,
    });
    setModal('editar');
  }

  async function salvar() {
    if (!form.titulo.trim() || !form.leadId) return;
    setSalvando(true);
    setErroAcao(null);
    const vencimento = combinarISO(form.data, form.horaInicio || '00:00');
    const horaFimIso = form.data && form.horaFim ? combinarISO(form.data, form.horaFim) : undefined;
    const tipo = VISUAL_PARA_BACKEND[form.tipoVisual];
    try {
      if (modal === 'novo') {
        const { data } = await api.post<Atividade>('/comercial/atividades', {
          titulo: form.titulo.trim(),
          tipo,
          ...(vencimento ? { vencimento } : {}),
          ...(horaFimIso ? { horaFim: horaFimIso } : {}),
          ...(form.notas.trim() ? { notas: form.notas.trim() } : {}),
          leadId: form.leadId,
          ...(form.responsavelId ? { responsavelId: form.responsavelId } : {}),
        });
        if (form.marcarFeito && data?.id) {
          await api.patch(`/comercial/atividades/${data.id}`, { status: 'CONCLUIDA' });
        }
      } else if (modal === 'editar' && form.id) {
        await api.patch(`/comercial/atividades/${form.id}`, {
          titulo: form.titulo.trim(),
          tipo,
          ...(vencimento ? { vencimento } : {}),
          ...(horaFimIso ? { horaFim: horaFimIso } : {}),
          notas: form.notas.trim(),
          leadId: form.leadId,
        });
      }
      setModal(null);
      await carregar();
    } catch {
      setErroAcao(modal === 'editar' ? 'Não foi possível salvar as alterações.' : 'Não foi possível criar a atividade.');
    } finally {
      setSalvando(false);
    }
  }

  // Filtro base (tipo + usuário) aplicado a todas as visões.
  const base = useMemo(() => lista.filter((a) => {
    const tipoOk = filtroTipo === 'TODOS' || a.tipo === VISUAL_PARA_BACKEND[filtroTipo as TipoVisual];
    const usuarioOk = filtroUsuario === 'TODOS' || (!!a.responsavel?.nome && !!usuario?.nome && a.responsavel.nome === usuario.nome);
    return tipoOk && usuarioOk;
  }), [lista, filtroTipo, filtroUsuario, usuario]);

  function pertenceAba(a: Atividade): boolean {
    if (aba === 'Concluídas') return a.status === 'CONCLUIDA';
    if (a.status !== 'PENDENTE' || !a.vencimento) return false;
    const v = new Date(a.vencimento);
    switch (aba) {
      case 'Hoje': return mesmaData(v, agora);
      case 'Amanhã': return mesmaData(v, addDias(agora, 1));
      case 'Esta semana': return v >= inicioSemana(agora) && v <= fimSemana(agora);
      case 'Próxima semana': return v >= inicioSemana(addDias(agora, 7)) && v <= fimSemana(addDias(agora, 7));
      case 'Vencido': return v < inicioDoDia(agora);
      case 'Selecionar período': {
        const de = periodoDe ? new Date(`${periodoDe}T00:00`) : null;
        const ate = periodoAte ? new Date(`${periodoAte}T23:59:59`) : null;
        if (de && v < de) return false;
        if (ate && v > ate) return false;
        return true;
      }
      default: return false;
    }
  }

  const filtradas = base
    .filter(pertenceAba)
    .sort((a, b) => {
      const va = a.vencimento ? new Date(a.vencimento).getTime() : Infinity;
      const vb = b.vencimento ? new Date(b.vencimento).getTime() : Infinity;
      return va - vb;
    });

  // ── Calendário ──
  const primeiroDoMes = new Date(mesRef.ano, mesRef.mes, 1);
  const offsetInicio = primeiroDoMes.getDay();
  const diasNoMes = new Date(mesRef.ano, mesRef.mes + 1, 0).getDate();
  const celulas: (number | null)[] = [];
  for (let i = 0; i < offsetInicio; i++) celulas.push(null);
  for (let d = 1; d <= diasNoMes; d++) celulas.push(d);
  while (celulas.length % 7 !== 0) celulas.push(null);

  function atividadesDoDia(dia: number): Atividade[] {
    return base
      .filter((a) => {
        if (!a.vencimento) return false;
        const v = new Date(a.vencimento);
        return v.getFullYear() === mesRef.ano && v.getMonth() === mesRef.mes && v.getDate() === dia;
      })
      .sort((a, b) => new Date(a.vencimento!).getTime() - new Date(b.vencimento!).getTime());
  }
  function mudarMes(delta: number) {
    setMesRef((m) => { const nd = new Date(m.ano, m.mes + delta, 1); return { ano: nd.getFullYear(), mes: nd.getMonth() }; });
  }

  const leadsFiltrados = form.buscaLead.trim()
    ? leads.filter((l) => `${l.nome} ${l.empresa ?? ''}`.toLowerCase().includes(form.buscaLead.trim().toLowerCase()))
    : leads;

  // Controles do cabeçalho (alternador de visão + filtros + novo).
  const toolbar = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <div style={{ display: 'inline-flex', border: '1px solid var(--borda)', borderRadius: 8, overflow: 'hidden' }}>
        {([['lista', 'Lista', <IcoLista tamanho={14} />], ['calendario', 'Calendário', <IcoCalendario tamanho={14} />]] as const).map(([v, rot, ic]) => (
          <button key={v} type="button" onClick={() => setVisao(v)} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', fontSize: 12.5, cursor: 'pointer', border: 'none',
            background: visao === v ? 'var(--amarelo-fagulha)' : 'var(--superficie-2)',
            color: visao === v ? '#1a1200' : 'var(--texto-suave)', fontWeight: visao === v ? 600 : 400,
          }}>{ic}{rot}</button>
        ))}
      </div>
      <Dropdown
        icone={<IcoFiltro tamanho={13} />}
        valor={filtroTipo}
        aoEscolher={setFiltroTipo}
        itens={[{ valor: 'TODOS', rotulo: 'Todos' }, ...TIPOS_VISUAIS.map((t) => ({ valor: t.chave, rotulo: t.rotulo, icone: iconeVisual(t.chave, 14) }))]}
      />
      <Dropdown
        icone={<IcoUsuario tamanho={13} />}
        valor={filtroUsuario}
        aoEscolher={setFiltroUsuario}
        itens={[{ valor: 'TODOS', rotulo: 'Todos os usuarios' }, { valor: 'MINHAS', rotulo: 'Minhas atividades' }]}
      />
      <Btn variante="primary" onClick={abrirNovo}>+ Nova Atividade</Btn>
    </div>
  );

  const total = lista.length;

  return (
    <PaginaShell
      titulo="Atividades"
      subtitulo={`${total} atividade${total === 1 ? '' : 's'}`}
      acao={toolbar}
    >
      {carregando ? (
        <EstadoCarregando />
      ) : erro ? (
        <EstadoErro mensagem={erro} onTentar={carregar} />
      ) : (
        <>
          {erroAcao && <MensagemErro texto={erroAcao} />}

          {/* Abas de período */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', overflowX: 'auto' }}>
            {ABAS.map((t) => (
              <button key={t} type="button" onClick={() => setAba(t)} style={{
                padding: '7px 12px', fontSize: 12.5, cursor: 'pointer', border: 'none', borderRadius: 8, whiteSpace: 'nowrap',
                background: aba === t ? 'var(--azul-fundo)' : 'transparent',
                color: aba === t ? 'var(--azul)' : 'var(--texto-fraco)', fontWeight: aba === t ? 600 : 400,
              }}>{t}</button>
            ))}
            {aba === 'Selecionar período' && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginLeft: 4 }}>
                <input type="date" value={periodoDe} onChange={(e) => setPeriodoDe(e.target.value)} className="brk-input" style={{ width: 'auto', padding: '6px 10px', fontSize: 12.5 }} />
                <span style={{ fontSize: 12.5, color: 'var(--texto-fraco)' }}>até</span>
                <input type="date" value={periodoAte} onChange={(e) => setPeriodoAte(e.target.value)} className="brk-input" style={{ width: 'auto', padding: '6px 10px', fontSize: 12.5 }} />
              </div>
            )}
          </div>

          {visao === 'calendario' ? (
            <Calendario
              ano={mesRef.ano} mes={mesRef.mes} celulas={celulas} hoje={agora}
              atividadesDoDia={atividadesDoDia} aoMudarMes={mudarMes} aoClicar={abrirEditar}
            />
          ) : filtradas.length === 0 ? (
            <PainelVazio titulo="Nenhuma atividade" descricao="Crie uma atividade ou troque o período." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2px' }}>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: 'var(--texto-fraco)', textTransform: 'uppercase' }}>{aba}</span>
                <span style={{ fontSize: 12, color: 'var(--texto-fraco)' }}>{filtradas.length}</span>
              </div>
              {filtradas.map((a) => {
                const feita = a.status === 'CONCLUIDA';
                const atrasada = !feita && !!a.vencimento && new Date(a.vencimento) < inicioDoDia(agora);
                const ehVoce = !!a.responsavel?.nome && !!usuario?.nome && a.responsavel.nome === usuario.nome;
                return (
                  <div key={a.id} onClick={() => abrirEditar(a)} className="brk-card brk-card-p" style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <button type="button" aria-label={feita ? 'Concluída' : 'Concluir'} onClick={(e) => { e.stopPropagation(); if (!feita) concluir(a.id); }} style={{
                        width: 20, height: 20, borderRadius: '50%', flex: '0 0 auto', marginTop: 1, cursor: feita ? 'default' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: `2px solid ${feita ? 'var(--verde)' : 'var(--borda-forte)'}`,
                        background: feita ? 'var(--verde)' : 'transparent', color: '#0a1f10', padding: 0,
                      }}>{feita && <IcoCheck tamanho={12} />}</button>
                      <span style={{ color: 'var(--texto-fraco)', display: 'flex', marginTop: 1, flex: '0 0 auto' }}>{iconeBackend(a.tipo)}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--texto)', textDecoration: feita ? 'line-through' : 'none', opacity: feita ? 0.6 : 1 }}>{a.titulo}</div>
                        {a.notas && <div style={{ fontSize: 12, color: 'var(--texto-fraco)', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.notas}</div>}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 6, flexWrap: 'wrap', fontSize: 11.5 }}>
                          {a.vencimento && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: atrasada ? 'var(--vermelho)' : 'var(--amarelo-fagulha)' }}>
                              <IcoCalendario tamanho={13} />{textoDataCard(a.vencimento)}
                            </span>
                          )}
                          {a.lead?.nome && <span style={{ color: 'var(--amarelo-fagulha)', fontWeight: 500 }}>{a.lead.nome}</span>}
                          {a.lead?.empresa && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--texto-fraco)' }}><IcoEmpresa tamanho={13} />{a.lead.empresa}</span>}
                          {a.responsavel?.nome && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--texto-fraco)' }}><IcoUsuario tamanho={13} />{a.responsavel.nome}{ehVoce ? ' (você)' : ''}</span>}
                        </div>
                      </div>
                      <Badge cor={feita ? 'verde' : 'neutro'}>{ROTULO_TIPO[a.tipo]}</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {modal && (
        <Modal titulo={modal === 'editar' ? 'Editar Atividade' : 'Nova Atividade'} onFechar={() => setModal(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Tipo */}
            <div>
              <label className="brk-campo-label">Tipo</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                {TIPOS_VISUAIS.map((t) => {
                  const ativo = form.tipoVisual === t.chave;
                  return (
                    <button key={t.chave} type="button" onClick={() => setForm((f) => ({ ...f, tipoVisual: t.chave }))} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 11px', fontSize: 12.5, borderRadius: 8, cursor: 'pointer',
                      border: `1px solid ${ativo ? 'var(--amarelo-fagulha)' : 'var(--borda)'}`,
                      background: ativo ? 'var(--amarelo-fundo)' : 'var(--superficie-2)',
                      color: ativo ? 'var(--amarelo-fagulha)' : 'var(--texto-suave)', fontWeight: ativo ? 600 : 400,
                    }}>{iconeVisual(t.chave, 14)}{t.rotulo}</button>
                  );
                })}
              </div>
            </div>

            {/* Título */}
            <div className="brk-campo">
              <label className="brk-campo-label" htmlFor="ativ-titulo">Título *</label>
              <input id="ativ-titulo" className="brk-input" value={form.titulo} onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))} placeholder="Ex.: Ligar para o cliente" autoFocus />
            </div>

            {/* Data e horário */}
            <div>
              <label className="brk-campo-label">Data e horário</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                <input type="date" className="brk-input" style={{ width: 'auto', flex: '1 1 140px' }} value={form.data} onChange={(e) => setForm((f) => ({ ...f, data: e.target.value }))} />
                <input type="time" className="brk-input" style={{ width: 'auto', flex: '0 1 110px' }} value={form.horaInicio} onChange={(e) => setForm((f) => ({ ...f, horaInicio: e.target.value }))} />
                <span style={{ color: 'var(--texto-fraco)' }}>–</span>
                <input type="time" className="brk-input" style={{ width: 'auto', flex: '0 1 110px' }} value={form.horaFim} onChange={(e) => setForm((f) => ({ ...f, horaFim: e.target.value }))} />
              </div>
              <span style={{ fontSize: 11.5, color: 'var(--texto-fraco)', marginTop: 4, display: 'block' }}>Deixe a hora em branco para um lembrete sem horário.</span>
            </div>

            {/* Negócio */}
            <div className="brk-campo">
              <label className="brk-campo-label">Negócio *</label>
              {form.leadId ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '9px 12px', marginTop: 2, borderRadius: 8, border: '1px solid var(--amarelo-borda)', background: 'var(--amarelo-fundo)', color: 'var(--amarelo-fagulha)', fontSize: 13 }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{form.buscaLead}</span>
                  <button type="button" aria-label="Remover negócio" onClick={() => setForm((f) => ({ ...f, leadId: '', buscaLead: '' }))} style={{ border: 'none', background: 'transparent', color: 'var(--amarelo-fagulha)', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 0 }}>×</button>
                </div>
              ) : (
                <>
                  <input className="brk-input" value={form.buscaLead} onChange={(e) => setForm((f) => ({ ...f, buscaLead: e.target.value }))} placeholder="Buscar negócio..." />
                  {form.buscaLead.trim() && (
                    <div style={{ marginTop: 4, maxHeight: 168, overflowY: 'auto', border: '1px solid var(--borda)', borderRadius: 8, background: 'var(--superficie-2)' }}>
                      {leadsFiltrados.length === 0 ? (
                        <div style={{ padding: '10px 12px', fontSize: 12.5, color: 'var(--texto-fraco)' }}>Nenhum negócio encontrado.</div>
                      ) : leadsFiltrados.slice(0, 20).map((l) => (
                        <button key={l.id} type="button" onClick={() => setForm((f) => ({ ...f, leadId: l.id, buscaLead: l.empresa ? `${l.nome} · ${l.empresa}` : l.nome }))} style={{
                          display: 'block', width: '100%', textAlign: 'left', padding: '9px 12px', fontSize: 12.5, border: 'none',
                          borderBottom: '1px solid var(--borda)', background: 'transparent', color: 'var(--texto-suave)', cursor: 'pointer',
                        }}>{l.nome}{l.empresa ? <span style={{ color: 'var(--texto-fraco)' }}> · {l.empresa}</span> : null}</button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Notas */}
            <div className="brk-campo">
              <label className="brk-campo-label" htmlFor="ativ-notas">Notas</label>
              <textarea id="ativ-notas" className="brk-input" rows={3} style={{ resize: 'vertical' }} value={form.notas} onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))} placeholder="Observacoes opcionais..." />
            </div>

            {/* Responsável */}
            <div className="brk-campo">
              <label className="brk-campo-label" htmlFor="ativ-resp">Responsável</label>
              <select id="ativ-resp" className="brk-input" value={form.responsavelId} onChange={(e) => setForm((f) => ({ ...f, responsavelId: e.target.value }))}>
                {usuario ? <option value={usuario.id}>{usuario.nome} (você)</option> : <option value="">—</option>}
              </select>
            </div>

            {modal === 'novo' && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--texto-suave)', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.marcarFeito} onChange={(e) => setForm((f) => ({ ...f, marcarFeito: e.target.checked }))} />
                Marcar como feito
              </label>
            )}

            <Btn variante="primary" onClick={salvar} disabled={salvando || !form.titulo.trim() || !form.leadId} style={{ width: '100%' }}>
              {salvando ? 'Salvando…' : modal === 'editar' ? 'Salvar Alterações' : 'Salvar Atividade'}
            </Btn>
          </div>
        </Modal>
      )}
    </PaginaShell>
  );
}

// ── Visão Calendário ──
function Calendario({ ano, mes, celulas, hoje, atividadesDoDia, aoMudarMes, aoClicar }: {
  ano: number; mes: number; celulas: (number | null)[]; hoje: Date;
  atividadesDoDia: (dia: number) => Atividade[]; aoMudarMes: (delta: number) => void; aoClicar: (a: Atividade) => void;
}) {
  const ehHojeMes = hoje.getFullYear() === ano && hoje.getMonth() === mes;
  return (
    <div className="brk-card" style={{ padding: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18, marginBottom: 12 }}>
        <button type="button" aria-label="Mês anterior" onClick={() => aoMudarMes(-1)} style={{ display: 'inline-flex', padding: 6, borderRadius: 8, border: '1px solid var(--borda)', background: 'var(--superficie-2)', color: 'var(--texto-suave)', cursor: 'pointer' }}><IcoSetaEsq tamanho={16} /></button>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--texto)', minWidth: 150, textAlign: 'center' }}>{MESES[mes]} De {ano}</span>
        <button type="button" aria-label="Próximo mês" onClick={() => aoMudarMes(1)} style={{ display: 'inline-flex', padding: 6, borderRadius: 8, border: '1px solid var(--borda)', background: 'var(--superficie-2)', color: 'var(--texto-suave)', cursor: 'pointer' }}><IcoSetaDir tamanho={16} /></button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, background: 'var(--borda)', border: '1px solid var(--borda)', borderRadius: 8, overflow: 'hidden' }}>
        {DIAS_SEMANA.map((d) => (
          <div key={d} style={{ padding: '8px 6px', fontSize: 10.5, fontWeight: 700, letterSpacing: 0.5, textAlign: 'center', color: 'var(--texto-fraco)', background: 'var(--superficie-2)' }}>{d}</div>
        ))}
        {celulas.map((dia, i) => {
          const doDia = dia ? atividadesDoDia(dia) : [];
          const ehHoje = ehHojeMes && dia === hoje.getDate();
          return (
            <div key={i} style={{ minHeight: 96, padding: 5, background: 'var(--superficie)', display: 'flex', flexDirection: 'column', gap: 3 }}>
              {dia && (
                <span style={{
                  fontSize: 11.5, fontWeight: 600, width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: ehHoje ? '#1a1200' : 'var(--texto-fraco)', background: ehHoje ? 'var(--amarelo-fagulha)' : 'transparent',
                }}>{dia}</span>
              )}
              {doDia.slice(0, 3).map((a) => {
                const feita = a.status === 'CONCLUIDA';
                const atrasada = !feita && !!a.vencimento && new Date(a.vencimento) < inicioDoDia(hoje);
                const cor = feita ? 'var(--verde)' : atrasada ? 'var(--vermelho)' : 'var(--azul)';
                const fundo = feita ? 'var(--verde-fundo)' : atrasada ? 'var(--vermelho-fundo)' : 'var(--azul-fundo)';
                const v = a.vencimento ? new Date(a.vencimento) : null;
                const hora = v && !(v.getHours() === 0 && v.getMinutes() === 0) ? `${p2(v.getHours())}:${p2(v.getMinutes())} ` : '';
                return (
                  <button key={a.id} type="button" onClick={() => aoClicar(a)} title={a.titulo} style={{
                    display: 'block', width: '100%', textAlign: 'left', padding: '2px 6px', fontSize: 10.5, borderRadius: 5, border: 'none', cursor: 'pointer',
                    background: fundo, color: cor, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    textDecoration: feita ? 'line-through' : 'none',
                  }}>{hora}{a.titulo}</button>
                );
              })}
              {doDia.length > 3 && <span style={{ fontSize: 10, color: 'var(--texto-fraco)', paddingLeft: 4 }}>+{doDia.length - 3} mais</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
