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
import { Modal, Campo, Btn } from './ui';
import { MensagemErro } from './primitivos';

type StatusLead = 'NOVO' | 'CONTATADO' | 'QUALIFICADO' | 'PROPOSTA' | 'GANHO' | 'PERDIDO';
type TipoAtividade = 'LIGACAO' | 'WHATSAPP' | 'EMAIL' | 'INSTAGRAM' | 'REUNIAO' | 'OUTRO' | 'VIDEOCHAMADA' | 'LINKEDIN';
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
interface LeadPlano { plano: { id: string; nome: string; valor: string; entregaveis?: unknown; produtos?: { produto: { id: string; nome: string; descricao?: string | null } }[] }; quantidade: number }
interface LeadProduto { produto: { id: string; nome: string; valor: string; descricao?: string | null }; quantidade: number }
interface Nota { id: string; texto: string; criadoEm: string; autor?: { nome: string } | null }
interface Historico { id: string; acao: string; de: string | null; para: string | null; criadoEm: string; autor?: { nome: string } | null }
interface Atividade { id: string; titulo: string; tipo: TipoAtividade; status: StatusAtividade; vencimento: string | null; horaFim?: string | null; notas?: string | null; lead?: { id: string } | null }
interface PessoaVinc { nome: string; email: string; telefone: string; empresa: string }

// Agrega os leads em pessoas únicas (chave: e-mail em minúsculas ou nome) — mesma
// fonte da tela "Contatos"/"Pessoas" (/comercial/leads), usada para vincular.
function agregarPessoasVinc(leads: { nome: string; email: string | null; telefone: string | null; empresa: string | null }[]): PessoaVinc[] {
  const mapa = new Map<string, PessoaVinc>();
  for (const l of leads) {
    const chave = (l.email?.trim().toLowerCase() || l.nome.trim().toLowerCase());
    if (!chave) continue;
    const atual = mapa.get(chave);
    if (atual) {
      if (!atual.email && l.email) atual.email = l.email;
      if (!atual.telefone && l.telefone) atual.telefone = l.telefone;
      if (!atual.empresa && l.empresa) atual.empresa = l.empresa;
    } else {
      mapa.set(chave, { nome: l.nome, email: l.email || '', telefone: l.telefone || '', empresa: l.empresa || '' });
    }
  }
  return [...mapa.values()].sort((a, b) => a.nome.localeCompare(b.nome));
}

const STATUS_LABEL: Record<StatusLead, string> = {
  NOVO: 'Entrada de Leads', CONTATADO: 'Tentando contato', QUALIFICADO: 'Qualificado',
  PROPOSTA: 'Proposta', GANHO: 'Ganho', PERDIDO: 'Perdido',
};
const PROBABILIDADE: Record<StatusLead, number> = { NOVO: 10, CONTATADO: 25, QUALIFICADO: 50, PROPOSTA: 75, GANHO: 100, PERDIDO: 0 };
const TIPO_LABEL: Record<TipoAtividade, string> = { REUNIAO: 'Reunião', LIGACAO: 'Ligação', VIDEOCHAMADA: 'Videochamada', EMAIL: 'E-mail', WHATSAPP: 'WhatsApp', INSTAGRAM: 'Instagram', LINKEDIN: 'LinkedIn', OUTRO: 'Outro' };
const TIPOS: TipoAtividade[] = ['REUNIAO', 'LIGACAO', 'VIDEOCHAMADA', 'EMAIL', 'WHATSAPP', 'INSTAGRAM', 'LINKEDIN', 'OUTRO'];

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
function toDateInput(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function toTimeInput(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
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
const IcoUsers = () => <Ico><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></Ico>;
const IcoVideo = () => <Ico><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" /></Ico>;
const IcoWhats = () => <Ico><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></Ico>;
const IcoInstagram = () => <Ico><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></Ico>;
const IcoLinkedin = () => <Ico><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" /><rect x="2" y="9" width="4" height="12" /><circle cx="4" cy="4" r="2" /></Ico>;
const IcoCirculo = () => <Ico><circle cx="12" cy="12" r="10" /></Ico>;
const IcoCadastro = () => <Ico size={15}><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" /><path d="M9 12h6M9 16h4" /></Ico>;
const IcoDoc = () => <Ico size={15}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></Ico>;
const TIPO_ICONE: Record<TipoAtividade, ReactNode> = {
  REUNIAO: <IcoUsers />, LIGACAO: <IcoTelefone />, VIDEOCHAMADA: <IcoVideo />, EMAIL: <IcoMail />,
  WHATSAPP: <IcoWhats />, INSTAGRAM: <IcoInstagram />, LINKEDIN: <IcoLinkedin />, OUTRO: <IcoCirculo />,
};

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
interface AtivForm { id?: string; tipo: TipoAtividade; titulo: string; data: string; horaInicio: string; horaFim: string; notas: string; feito: boolean }

// ── Cadastro Completo (captação de dados p/ contrato) ────────────────────────
type MascaraTipo = 'data' | 'cnpj' | 'cpf' | 'telefone' | 'cep';
interface CampoCadastro { chave: string; rotulo: string; ajuda?: string; placeholder?: string; tipo?: string; mascara?: MascaraTipo }
// Máscara de data DD/MM/AAAA a partir dos dígitos digitados (tolera colar/apagar).
function mascaraDataNascimento(valor: string): string {
  const d = valor.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}
// CNPJ AA.AAA.AAA/AAAA-DV (14 dígitos).
function mascaraCnpj(valor: string): string {
  const d = valor.replace(/\D/g, '').slice(0, 14);
  let out = d.slice(0, 2);
  if (d.length > 2) out += '.' + d.slice(2, 5);
  if (d.length > 5) out += '.' + d.slice(5, 8);
  if (d.length > 8) out += '/' + d.slice(8, 12);
  if (d.length > 12) out += '-' + d.slice(12, 14);
  return out;
}
// CPF AAA.AAA.AAA-DV (11 dígitos).
function mascaraCpf(valor: string): string {
  const d = valor.replace(/\D/g, '').slice(0, 11);
  let out = d.slice(0, 3);
  if (d.length > 3) out += '.' + d.slice(3, 6);
  if (d.length > 6) out += '.' + d.slice(6, 9);
  if (d.length > 9) out += '-' + d.slice(9, 11);
  return out;
}
// CEP AAAAA-AAA (8 dígitos).
function mascaraCep(valor: string): string {
  const d = valor.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}
// Telefone (AA) AAAAA-AAAA ou (AA) AAAA-AAAA (10 ou 11 dígitos).
function mascaraTelefone(valor: string): string {
  const d = valor.replace(/\D/g, '').slice(0, 11);
  if (d.length === 0) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
// Aplica a máscara conforme o tipo do campo (sem máscara devolve o valor cru).
function aplicarMascara(mascara: MascaraTipo | undefined, valor: string): string {
  switch (mascara) {
    case 'data': return mascaraDataNascimento(valor);
    case 'cnpj': return mascaraCnpj(valor);
    case 'cpf': return mascaraCpf(valor);
    case 'telefone': return mascaraTelefone(valor);
    case 'cep': return mascaraCep(valor);
    default: return valor;
  }
}
// Limite de caracteres do valor já formatado, por tipo de máscara.
const MASCARA_MAXLEN: Record<MascaraTipo, number> = {
  data: 10, cnpj: 18, cpf: 14, telefone: 15, cep: 9,
};
const CADASTRO_CAMPOS: CampoCadastro[] = [
  { chave: 'razaoSocial', rotulo: 'Razão Social *', ajuda: 'Adicione a razão social conforme aparece no seu contrato social.' },
  { chave: 'nomeFantasia', rotulo: 'Nome Fantasia *' },
  { chave: 'cnpj', rotulo: 'CNPJ *', mascara: 'cnpj', placeholder: 'AA.AAA.AAA/AAAA-DV' },
  { chave: 'nomeSocio', rotulo: 'Nome do Sócio(a) *' },
  { chave: 'cpfSocio', rotulo: 'CPF Sócio *', mascara: 'cpf', placeholder: '000.000.000-00' },
  { chave: 'dataNascimentoSocio', rotulo: 'Data de Nascimento (Sócio) *', mascara: 'data', placeholder: 'DD/MM/AAAA' },
  { chave: 'profissao', rotulo: 'Sua Profissão *' },
  { chave: 'nacionalidade', rotulo: 'Sua Nacionalidade *' },
  { chave: 'email', rotulo: 'E-mail *', placeholder: 'Inserir e-mail', tipo: 'email' },
  { chave: 'whatsappSocio', rotulo: 'WhatsApp Sócio *', mascara: 'telefone', placeholder: '(00) 00000-0000' },
  { chave: 'whatsappFinanceiro', rotulo: 'WhatsApp Financeiro *', mascara: 'telefone', placeholder: '(00) 00000-0000' },
  { chave: 'cep', rotulo: 'CEP *', mascara: 'cep', placeholder: '00000-000', ajuda: 'Insira no formato XXXXX-XXX' },
  { chave: 'endereco', rotulo: 'Endereço *' },
  { chave: 'numero', rotulo: 'Número *' },
  { chave: 'complemento', rotulo: 'Complemento *' },
  { chave: 'bairro', rotulo: 'Bairro *' },
  { chave: 'cidade', rotulo: 'Cidade *' },
  { chave: 'estado', rotulo: 'Estado *' },
  { chave: 'inscricaoMunicipal', rotulo: 'Inscrição Municipal', ajuda: 'Se não possuir, deixe em branco.' },
  { chave: 'inscricaoEstadual', rotulo: 'Inscrição Estadual', ajuda: 'Se não possuir, deixe em branco.' },
];

// ── Criar Contrato ───────────────────────────────────────────────────────────
type TipoContrato = 'COM_MARKETING' | 'SEM_MARKETING';
type FormaPagamento = 'CARTAO' | 'PIX' | 'BOLETO';
interface ContratoForm { tipo: TipoContrato; duracaoMeses: number; descontoPct: number; formaPagamento: FormaPagamento; diaPagamento: string; dataAssinatura: string }
const CONTRATO_PADRAO: ContratoForm = { tipo: 'COM_MARKETING', duracaoMeses: 12, descontoPct: 0, formaPagamento: 'PIX', diaPagamento: '10', dataAssinatura: '' };
// Rótulos e opções de forma de pagamento (cobrança no Asaas).
const FORMAS_PAGAMENTO: { valor: FormaPagamento; rotulo: string }[] = [
  { valor: 'CARTAO', rotulo: 'Cartão de Crédito' },
  { valor: 'PIX', rotulo: 'PIX' },
  { valor: 'BOLETO', rotulo: 'Boleto' },
];
const FORMA_PAGAMENTO_ROTULO: Record<string, string> = {
  CARTAO: 'Cartão de Crédito', PIX: 'PIX', BOLETO: 'Boleto', BOLETO_PIX: 'Boleto/PIX',
};
const TIPO_CONTRATO_ROTULO: Record<string, string> = {
  COM_MARKETING: 'Planos COM Marketing', SEM_MARKETING: 'Planos SEM Marketing',
};

// Descreve o JSON de entregaveis de um plano numa linha legivel (preview da tag {{ENTREGAVEIS}}).
function descreverEntregaveis(entregaveis: unknown): string {
  if (entregaveis == null) return '';
  if (typeof entregaveis === 'string') return entregaveis;
  if (Array.isArray(entregaveis)) return entregaveis.map((x) => String(x)).join(', ');
  if (typeof entregaveis === 'object') {
    return Object.entries(entregaveis as Record<string, unknown>)
      .map(([k, v]) => (v === true ? k : v === false ? '' : `${k}: ${String(v)}`))
      .filter(Boolean)
      .join('; ');
  }
  return String(entregaveis);
}

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
  const [vincular, setVincular] = useState<'contato' | 'empresa' | null>(null);
  const [buscaVinc, setBuscaVinc] = useState('');
  const [pessoasVinc, setPessoasVinc] = useState<PessoaVinc[]>([]);
  const [empresasVinc, setEmpresasVinc] = useState<string[]>([]);
  const [carregandoVinc, setCarregandoVinc] = useState(false);
  const [modalCadastro, setModalCadastro] = useState(false);
  const [cadastro, setCadastro] = useState<Record<string, string>>({});
  const [salvandoCadastro, setSalvandoCadastro] = useState(false);
  const [modalContrato, setModalContrato] = useState(false);
  const [contratoForm, setContratoForm] = useState<ContratoForm>(CONTRATO_PADRAO);
  const [gerandoContrato, setGerandoContrato] = useState(false);
  const [contratoGerado, setContratoGerado] = useState<{ id: string; codigo: string } | null>(null);
  // Pré-visualização: revisa os dados antes de gerar o contrato.
  const [previewContrato, setPreviewContrato] = useState(false);
  const [cadastroPreview, setCadastroPreview] = useState<Record<string, string> | null>(null);
  const [checandoPreview, setChecandoPreview] = useState(false);
  const [enviandoAssinatura, setEnviandoAssinatura] = useState(false);
  const [linkAssinatura, setLinkAssinatura] = useState<string | null>(null);

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
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape' && !editor && !ativForm && !modalEtiquetas && !vincular && !modalCadastro && !modalContrato) onFechar(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editor, ativForm, modalEtiquetas, vincular, modalCadastro, modalContrato, onFechar]);

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

  // ── Vincular contato/empresa (fonte: menu Contatos) ────────────────────────
  async function abrirVincular(tipo: 'contato' | 'empresa') {
    setBuscaVinc('');
    setVincular(tipo);
    setCarregandoVinc(true);
    try {
      if (tipo === 'contato') {
        const { data } = await api.get<PessoaVinc[]>('/comercial/leads');
        setPessoasVinc(agregarPessoasVinc(data as unknown as { nome: string; email: string | null; telefone: string | null; empresa: string | null }[]));
      } else {
        const { data } = await api.get<{ nomeFantasia?: string | null }[]>('/clientes');
        const nomes = Array.from(new Set((data ?? []).map((c) => (c.nomeFantasia ?? '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));
        setEmpresasVinc(nomes);
      }
    } catch {
      if (tipo === 'contato') setPessoasVinc([]); else setEmpresasVinc([]);
    } finally {
      setCarregandoVinc(false);
    }
  }
  async function escolherContato(nome: string) {
    const t = nome.trim();
    await patchLead({ observacao: t ? `Contato: ${t}` : '' });
    setVincular(null);
  }
  async function escolherEmpresa(nome: string) {
    await patchLead({ empresa: nome.trim() });
    setVincular(null);
  }

  // ── Cadastro Completo (dados p/ contrato) ──────────────────────────────────
  async function abrirCadastro() {
    setErroAcao(null);
    const base: Record<string, string> = {};
    CADASTRO_CAMPOS.forEach((c) => { base[c.chave] = ''; });
    try {
      const { data } = await api.get<Record<string, string> | null>(`/comercial/leads/${leadId}/cadastro`);
      if (data) CADASTRO_CAMPOS.forEach((c) => { const v = (data as Record<string, unknown>)[c.chave]; if (v != null) base[c.chave] = String(v); });
    } catch { /* sem cadastro ainda */ }
    // Prefill a partir do negócio quando vazio.
    if (!base.nomeFantasia && lead?.empresa) base.nomeFantasia = lead.empresa;
    if (!base.email && lead?.email) base.email = lead.email;
    setCadastro(base);
    setModalCadastro(true);
  }
  async function salvarCadastro() {
    setSalvandoCadastro(true);
    setErroAcao(null);
    try { await api.put(`/comercial/leads/${leadId}/cadastro`, cadastro); setModalCadastro(false); }
    catch (e: any) { setErroAcao(e?.response?.data?.message ?? 'Erro ao salvar cadastro.'); }
    finally { setSalvandoCadastro(false); }
  }

  // ── Criar Contrato (gera o .docx a partir do cadastro + planos/produtos) ────
  function abrirContrato() { setErroAcao(null); setContratoForm(CONTRATO_PADRAO); setContratoGerado(null); setLinkAssinatura(null); setPreviewContrato(false); setCadastroPreview(null); setModalContrato(true); }
  // Passo de revisão: busca o Cadastro Completo e abre a pré-visualização dos dados
  // antes de gerar o contrato (o usuário confere se está tudo preenchido).
  async function revisarContrato() {
    setChecandoPreview(true);
    setErroAcao(null);
    try {
      const { data } = await api.get<Record<string, string> | null>(`/comercial/leads/${leadId}/cadastro`);
      setCadastroPreview(data ?? {});
    } catch { setCadastroPreview({}); }
    finally { setChecandoPreview(false); setPreviewContrato(true); }
  }
  async function gerarContrato() {
    setGerandoContrato(true);
    setErroAcao(null);
    const f = contratoForm;
    const corpo: Record<string, unknown> = {
      tipo: f.tipo, duracaoMeses: f.duracaoMeses, descontoPct: f.descontoPct, formaPagamento: f.formaPagamento,
      ...(f.diaPagamento && { diaPagamento: Number(f.diaPagamento) }),
      ...(f.dataAssinatura && { dataAssinatura: new Date(f.dataAssinatura).toISOString() }),
    };
    try {
      const { data: novo } = await api.post<{ id: string; codigoUnico?: string }>(`/contratos/do-lead/${leadId}`, corpo);
      const resp = await api.get(`/contratos/${novo.id}/docx`, { responseType: 'blob' });
      const url = URL.createObjectURL(resp.data as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contrato-${novo.codigoUnico ?? 'breakr'}.docx`;
      a.click();
      URL.revokeObjectURL(url);
      // Mantém o modal aberto para oferecer o envio para assinatura.
      setContratoGerado({ id: novo.id, codigo: novo.codigoUnico ?? '' });
      onMudou();
    } catch (e: any) { setErroAcao(e?.response?.data?.message ?? 'Erro ao gerar contrato.'); }
    finally { setGerandoContrato(false); }
  }
  async function enviarAssinatura() {
    if (!contratoGerado) return;
    setEnviandoAssinatura(true);
    setErroAcao(null);
    try {
      const { data } = await api.post<{ docUrl?: string }>(`/contratos/${contratoGerado.id}/enviar-assinatura-docx`, {});
      setLinkAssinatura(data?.docUrl ?? '');
      onMudou();
    } catch (e: any) { setErroAcao(e?.response?.data?.message ?? 'Erro ao enviar para assinatura.'); }
    finally { setEnviandoAssinatura(false); }
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
  function abrirAddAtiv() { setAtivForm({ tipo: 'LIGACAO', titulo: '', data: '', horaInicio: '', horaFim: '', notas: '', feito: false }); }
  function abrirEditAtiv(a: Atividade) { setAtivForm({ id: a.id, tipo: a.tipo, titulo: a.titulo, data: toDateInput(a.vencimento), horaInicio: toTimeInput(a.vencimento), horaFim: toTimeInput(a.horaFim), notas: a.notas ?? '', feito: a.status === 'CONCLUIDA' }); }
  async function salvarAtiv() {
    if (!ativForm || !ativForm.titulo.trim()) return;
    const f = ativForm;
    let vencimento: string | undefined;
    let horaFim: string | undefined;
    if (f.data) {
      vencimento = new Date(`${f.data}T${f.horaInicio || '00:00'}`).toISOString();
      if (f.horaFim) horaFim = new Date(`${f.data}T${f.horaFim}`).toISOString();
    }
    const corpo: Record<string, unknown> = {
      titulo: f.titulo.trim(), tipo: f.tipo,
      ...(vencimento && { vencimento }),
      ...(horaFim && { horaFim }),
      ...(f.notas.trim() && { notas: f.notas.trim() }),
      leadId,
    };
    try {
      if (f.id) {
        await api.patch(`/comercial/atividades/${f.id}`, { ...corpo, status: f.feito ? 'CONCLUIDA' : 'PENDENTE' });
      } else {
        const { data: nova } = await api.post<{ id: string }>('/comercial/atividades', corpo);
        if (f.feito && nova?.id) await api.patch(`/comercial/atividades/${nova.id}`, { status: 'CONCLUIDA' });
      }
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
              <button type="button" onClick={abrirCadastro} style={acaoContrato}><IcoCadastro /> Cadastro Completo</button>
              <button type="button" onClick={abrirContrato} style={acaoContrato}><IcoDoc /> Criar Contrato</button>

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

              <button type="button" onClick={() => abrirVincular('contato')} style={vincularBtn}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0 }}><IcoPessoa /><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{contatoDe(lead) || 'Vincular contato'}</span></span>
                <IcoLink />
              </button>
              <button type="button" onClick={() => abrirVincular('empresa')} style={vincularBtn}>
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

      {/* Vincular contato / empresa (a partir do menu Contatos) */}
      {vincular && (
        <Modal titulo={vincular === 'contato' ? 'Vincular contato' : 'Vincular empresa'} onFechar={() => setVincular(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input className="brk-input" autoFocus value={buscaVinc} onChange={(e) => setBuscaVinc(e.target.value)}
              placeholder={vincular === 'contato' ? 'Buscar pessoa por nome, e-mail…' : 'Buscar empresa por nome…'} />
            {carregandoVinc ? (
              <div style={{ fontSize: 13, color: 'var(--texto-fraco)', padding: '8px 2px' }}>Carregando…</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 280, overflowY: 'auto' }}>
                {vincular === 'contato' ? (() => {
                  const q = buscaVinc.trim().toLowerCase();
                  const lista = pessoasVinc.filter((p) => !q || p.nome.toLowerCase().includes(q) || p.email.toLowerCase().includes(q) || p.empresa.toLowerCase().includes(q));
                  if (lista.length === 0) return <VazioVinc texto="Nenhuma pessoa encontrada no menu Contatos." />;
                  return lista.map((p, i) => (
                    <button key={`${p.nome}-${i}`} type="button" onClick={() => escolherContato(p.nome)} style={itemVinc}>
                      <span style={avatarVinc}>{iniciais(p.nome)}</span>
                      <span style={{ minWidth: 0, flex: 1, textAlign: 'left' }}>
                        <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--texto)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nome}</span>
                        <span style={{ display: 'block', fontSize: 11.5, color: 'var(--texto-fraco)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{[p.email, p.empresa].filter(Boolean).join(' · ') || '—'}</span>
                      </span>
                    </button>
                  ));
                })() : (() => {
                  const q = buscaVinc.trim().toLowerCase();
                  const lista = empresasVinc.filter((n) => !q || n.toLowerCase().includes(q));
                  if (lista.length === 0) return <VazioVinc texto="Nenhuma empresa encontrada no menu Contatos." />;
                  return lista.map((n) => (
                    <button key={n} type="button" onClick={() => escolherEmpresa(n)} style={itemVinc}>
                      <span style={{ ...avatarVinc, color: 'var(--amarelo-fagulha)' }}>{n.charAt(0).toUpperCase()}</span>
                      <span style={{ flex: 1, minWidth: 0, textAlign: 'left', fontSize: 13, fontWeight: 600, color: 'var(--texto)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n}</span>
                    </button>
                  ));
                })()}
              </div>
            )}
            {buscaVinc.trim() && (
              <button type="button" onClick={() => (vincular === 'contato' ? escolherContato(buscaVinc) : escolherEmpresa(buscaVinc))} style={{ ...linkBtn, textAlign: 'left' }}>
                + Usar “{buscaVinc.trim()}”
              </button>
            )}
            {((vincular === 'contato' && !!contatoDe(lead)) || (vincular === 'empresa' && !!lead?.empresa)) && (
              <button type="button" onClick={() => (vincular === 'contato' ? escolherContato('') : escolherEmpresa(''))} style={{ ...linkBtn, color: 'var(--vermelho)', textAlign: 'left' }}>
                Remover vínculo
              </button>
            )}
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

      {/* Cadastro Completo (dados de captação p/ contrato) */}
      {modalCadastro && (
        <Modal titulo="Cadastro Completo" onFechar={() => setModalCadastro(false)}
          rodape={<><Btn variante="secondary" onClick={() => setModalCadastro(false)}>Cancelar</Btn><Btn onClick={salvarCadastro} disabled={salvandoCadastro}>{salvandoCadastro ? 'Salvando…' : 'Salvar Cadastro'}</Btn></>}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
            {CADASTRO_CAMPOS.map((c) => (
              <div key={c.chave} style={{ minWidth: 0 }}>
                <label className="brk-campo-label" style={{ display: 'block', marginBottom: 5 }}>{c.rotulo}</label>
                <input className="brk-input" type={c.tipo ?? 'text'} placeholder={c.placeholder ?? 'Inserir texto'}
                  inputMode={c.mascara ? 'numeric' : undefined} maxLength={c.mascara ? MASCARA_MAXLEN[c.mascara] : undefined}
                  spellCheck={!c.mascara && c.tipo !== 'email'}
                  value={c.mascara ? aplicarMascara(c.mascara, cadastro[c.chave] ?? '') : (cadastro[c.chave] ?? '')}
                  onChange={(e) => { const v = c.mascara ? aplicarMascara(c.mascara, e.target.value) : e.target.value; setCadastro((m) => ({ ...m, [c.chave]: v })); }} style={{ width: '100%' }} />
                {c.ajuda && <span style={{ display: 'block', marginTop: 4, fontSize: 11, color: 'var(--texto-fraco)' }}>{c.ajuda}</span>}
              </div>
            ))}
          </div>
        </Modal>
      )}

      {/* Criar Contrato (gera o .docx a partir do cadastro + planos/produtos) */}
      {modalContrato && (() => {
        const entregaveis = [
          ...(lead?.planos ?? []).flatMap((p) => (p.plano.produtos && p.plano.produtos.length)
            ? p.plano.produtos.map((pp) => ({ nome: pp.produto.nome, desc: pp.produto.descricao ?? '' }))
            : [{ nome: p.plano.nome, desc: descreverEntregaveis(p.plano.entregaveis) }]),
          ...(lead?.produtos ?? []).map((p) => ({ nome: p.produto.nome, desc: p.produto.descricao ?? '' })),
        ];
        return (
          <Modal titulo="Criar Contrato" onFechar={() => setModalContrato(false)}
            rodape={contratoGerado ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
                <div style={{ fontSize: 12.5, color: 'var(--verde)' }}>✓ Contrato {contratoGerado.codigo} criado e baixado.</div>
                {linkAssinatura !== null && (
                  <div style={{ fontSize: 12.5, color: 'var(--texto-suave)' }}>
                    ✓ Enviado para assinatura{linkAssinatura ? <> — <a href={linkAssinatura} target="_blank" rel="noreferrer" style={{ color: 'var(--azul)' }}>abrir link</a></> : ' (via Autentique).'}
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <Btn variante="secondary" onClick={() => setModalContrato(false)}>Fechar</Btn>
                  {linkAssinatura === null && <Btn onClick={enviarAssinatura} disabled={enviandoAssinatura}>{enviandoAssinatura ? 'Enviando…' : 'Enviar para assinatura'}</Btn>}
                </div>
              </div>
            ) : previewContrato ? (
              <><Btn variante="secondary" onClick={() => setPreviewContrato(false)} disabled={gerandoContrato}>← Voltar</Btn><Btn onClick={gerarContrato} disabled={gerandoContrato}>{gerandoContrato ? 'Gerando…' : 'Confirmar e gerar contrato'}</Btn></>
            ) : (
              <><Btn variante="secondary" onClick={() => setModalContrato(false)}>Cancelar</Btn><Btn onClick={revisarContrato} disabled={checandoPreview}>{checandoPreview ? 'Carregando…' : 'Revisar dados'}</Btn></>
            )}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Pré-visualização dos dados antes de gerar (confere cadastro + termos). */}
              {previewContrato && (() => {
                const cad = cadastroPreview ?? {};
                const faltando = CADASTRO_CAMPOS.filter((c) => c.rotulo.trim().endsWith('*') && !String((cad as Record<string, unknown>)[c.chave] ?? '').trim());
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ fontSize: 12.5, color: 'var(--texto-suave)' }}>Confira os dados abaixo antes de gerar o contrato.</div>
                    {faltando.length > 0 && (
                      <div style={{ fontSize: 12.5, color: 'var(--amarelo-fagulha)', background: 'color-mix(in srgb, var(--amarelo-fagulha) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--amarelo-fagulha) 45%, transparent)', borderRadius: 9, padding: '8px 10px' }}>
                        ⚠ {faltando.length} campo(s) obrigatório(s) do Cadastro Completo em branco: {faltando.map((c) => c.rotulo.replace(' *', '')).join(', ')}. Você ainda pode gerar, mas recomendamos preencher.
                      </div>
                    )}
                    <div>
                      <span className="brk-campo-label" style={{ display: 'block', marginBottom: 6 }}>Termos do contrato</span>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12.5 }}>
                        <div><b style={{ color: 'var(--texto)' }}>Tipo:</b> <span style={{ color: 'var(--texto-suave)' }}>{TIPO_CONTRATO_ROTULO[contratoForm.tipo] ?? contratoForm.tipo}</span></div>
                        <div><b style={{ color: 'var(--texto)' }}>Duração:</b> <span style={{ color: 'var(--texto-suave)' }}>{contratoForm.duracaoMeses} meses</span></div>
                        <div><b style={{ color: 'var(--texto)' }}>Desconto:</b> <span style={{ color: 'var(--texto-suave)' }}>{contratoForm.descontoPct}%</span></div>
                        <div><b style={{ color: 'var(--texto)' }}>Pagamento:</b> <span style={{ color: 'var(--texto-suave)' }}>{FORMA_PAGAMENTO_ROTULO[contratoForm.formaPagamento] ?? contratoForm.formaPagamento}</span></div>
                        <div><b style={{ color: 'var(--texto)' }}>Dia:</b> <span style={{ color: 'var(--texto-suave)' }}>{contratoForm.diaPagamento || '—'}</span></div>
                        <div><b style={{ color: 'var(--texto)' }}>Assinatura:</b> <span style={{ color: 'var(--texto-suave)' }}>{contratoForm.dataAssinatura ? new Date(contratoForm.dataAssinatura).toLocaleDateString('pt-BR') : '—'}</span></div>
                      </div>
                    </div>
                    <div>
                      <span className="brk-campo-label" style={{ display: 'block', marginBottom: 6 }}>Cadastro Completo (dados do cliente)</span>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                        {CADASTRO_CAMPOS.map((c) => {
                          const bruto = String((cad as Record<string, unknown>)[c.chave] ?? '').trim();
                          const v = c.mascara && bruto ? aplicarMascara(c.mascara, bruto) : bruto;
                          const obrig = c.rotulo.trim().endsWith('*');
                          return (
                            <div key={c.chave} style={{ fontSize: 11.5 }}>
                              <span style={{ color: 'var(--texto-fraco)' }}>{c.rotulo.replace(' *', '')}: </span>
                              <span style={{ color: v ? 'var(--texto-suave)' : (obrig ? 'var(--vermelho)' : 'var(--texto-fraco)') }}>{v || (obrig ? 'faltando' : '—')}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--texto-fraco)' }}>
                      Ao confirmar, o contrato será gerado (.docx) e a cobrança <b style={{ color: 'var(--texto-suave)' }}>{FORMA_PAGAMENTO_ROTULO[contratoForm.formaPagamento] ?? contratoForm.formaPagamento}</b> será enviada pelo Asaas. Depois você poderá enviá-lo para assinatura.
                    </div>
                  </div>
                );
              })()}
              {!previewContrato && (<>
              <div>
                <span className="brk-campo-label" style={{ display: 'block', marginBottom: 6 }}>Tipo de contrato</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {([['COM_MARKETING', 'Planos COM Marketing'], ['SEM_MARKETING', 'Planos SEM Marketing']] as const).map(([val, lab]) => {
                    const sel = contratoForm.tipo === val;
                    return (
                      <button key={val} type="button" onClick={() => setContratoForm((f) => ({ ...f, tipo: val }))}
                        style={{ padding: '10px 12px', borderRadius: 9, cursor: 'pointer', fontSize: 12.5, fontWeight: sel ? 700 : 500,
                          border: `1px solid ${sel ? 'var(--amarelo-fagulha)' : 'var(--borda)'}`, background: sel ? 'color-mix(in srgb, var(--amarelo-fagulha) 14%, transparent)' : 'var(--superficie-2)', color: sel ? 'var(--amarelo-fagulha)' : 'var(--texto-suave)' }}>
                        {lab}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <span className="brk-campo-label" style={{ display: 'block', marginBottom: 6 }}>Duração</span>
                  <select className="brk-input" value={contratoForm.duracaoMeses} onChange={(e) => setContratoForm((f) => ({ ...f, duracaoMeses: Number(e.target.value) }))} style={{ width: '100%' }}>
                    {[3, 6, 12].map((m) => <option key={m} value={m}>{m} meses</option>)}
                  </select>
                </div>
                <div>
                  <span className="brk-campo-label" style={{ display: 'block', marginBottom: 6 }}>Desconto</span>
                  <select className="brk-input" value={contratoForm.descontoPct} onChange={(e) => setContratoForm((f) => ({ ...f, descontoPct: Number(e.target.value) }))} style={{ width: '100%' }}>
                    {[0, 10, 20, 30].map((d) => <option key={d} value={d}>{d}%</option>)}
                  </select>
                </div>
                <div>
                  <span className="brk-campo-label" style={{ display: 'block', marginBottom: 6 }}>Forma de pagamento (Asaas)</span>
                  <select className="brk-input" value={contratoForm.formaPagamento} onChange={(e) => setContratoForm((f) => ({ ...f, formaPagamento: e.target.value as FormaPagamento }))} style={{ width: '100%' }}>
                    {FORMAS_PAGAMENTO.map((fp) => <option key={fp.valor} value={fp.valor}>{fp.rotulo}</option>)}
                  </select>
                </div>
                <div>
                  <span className="brk-campo-label" style={{ display: 'block', marginBottom: 6 }}>Dia de pagamento</span>
                  <input className="brk-input" type="number" min={1} max={31} value={contratoForm.diaPagamento} onChange={(e) => setContratoForm((f) => ({ ...f, diaPagamento: e.target.value }))} style={{ width: '100%' }} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <span className="brk-campo-label" style={{ display: 'block', marginBottom: 6 }}>Data de assinatura</span>
                  <input className="brk-input" type="date" value={contratoForm.dataAssinatura} onChange={(e) => setContratoForm((f) => ({ ...f, dataAssinatura: e.target.value }))} style={{ width: '100%' }} />
                </div>
              </div>
              <div>
                <span className="brk-campo-label" style={{ display: 'block', marginBottom: 6 }}>Entregáveis do contrato — dos planos/produtos selecionados ({'{{'}ENTREGAVEIS{'}}'})</span>
                {entregaveis.length === 0 ? (
                  <div style={{ fontSize: 12.5, color: 'var(--texto-fraco)' }}>Nenhum plano/produto selecionado. Use “+ Produtos” no resumo do negócio.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {entregaveis.map((it, i) => (
                      <div key={i} style={{ background: 'var(--superficie-2)', border: '1px solid var(--borda)', borderRadius: 9, padding: '8px 10px' }}>
                        <div style={{ fontSize: 12.5 }}><b style={{ color: 'var(--texto)' }}>{String.fromCharCode(65 + i)}) {it.nome}</b></div>
                        {it.desc && <div style={{ fontSize: 11.5, color: 'var(--texto-suave)', marginTop: 2 }}>{it.desc}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              </>)}
            </div>
          </Modal>
        );
      })()}

      {/* Nova / Editar Atividade */}
      {ativForm && (
        <Modal titulo={ativForm.id ? 'Editar Atividade' : 'Nova Atividade'} onFechar={() => setAtivForm(null)}
          rodape={
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--texto-suave)', cursor: 'pointer' }}>
                <input type="checkbox" checked={ativForm.feito} onChange={(e) => setAtivForm((f) => (f ? { ...f, feito: e.target.checked } : f))} style={{ width: 16, height: 16, accentColor: 'var(--amarelo-fagulha)', cursor: 'pointer' }} />
                Marcar como feito
              </label>
              <Btn onClick={salvarAtiv} disabled={!ativForm.titulo.trim()} style={{ width: '100%' }}>Salvar Atividade</Btn>
            </div>
          }>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <span className="brk-campo-label" style={{ display: 'block', marginBottom: 6 }}>Tipo</span>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {TIPOS.map((t) => {
                  const sel = ativForm.tipo === t;
                  return (
                    <button key={t} type="button" onClick={() => setAtivForm((f) => (f ? { ...f, tipo: t } : f))}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 11px', borderRadius: 9, cursor: 'pointer', fontSize: 12.5, fontWeight: sel ? 700 : 500,
                        border: `1px solid ${sel ? 'var(--amarelo-fagulha)' : 'var(--borda)'}`, background: sel ? 'color-mix(in srgb, var(--amarelo-fagulha) 14%, transparent)' : 'var(--superficie-2)', color: sel ? 'var(--amarelo-fagulha)' : 'var(--texto-suave)' }}>
                      {TIPO_ICONE[t]} {TIPO_LABEL[t]}
                    </button>
                  );
                })}
              </div>
            </div>
            <Campo rotulo="Título *" value={ativForm.titulo} onChange={(e) => setAtivForm((f) => (f ? { ...f, titulo: e.target.value } : f))} placeholder="Ex.: Ligação" autoFocus />
            <div>
              <span className="brk-campo-label" style={{ display: 'block', marginBottom: 6 }}>Data e horário</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="date" className="brk-input" value={ativForm.data} onChange={(e) => setAtivForm((f) => (f ? { ...f, data: e.target.value } : f))} style={{ flex: 1, minWidth: 0 }} />
                <input type="time" className="brk-input" value={ativForm.horaInicio} onChange={(e) => setAtivForm((f) => (f ? { ...f, horaInicio: e.target.value } : f))} style={{ width: 96, flex: '0 0 auto' }} />
                <span style={{ color: 'var(--texto-fraco)' }}>–</span>
                <input type="time" className="brk-input" value={ativForm.horaFim} onChange={(e) => setAtivForm((f) => (f ? { ...f, horaFim: e.target.value } : f))} style={{ width: 96, flex: '0 0 auto' }} />
              </div>
              <span style={{ display: 'block', marginTop: 6, fontSize: 11.5, color: 'var(--texto-fraco)' }}>Deixe a hora em branco para um lembrete sem horário.</span>
            </div>
            <div>
              <span className="brk-campo-label" style={{ display: 'block', marginBottom: 6 }}>Notas</span>
              <textarea value={ativForm.notas} onChange={(e) => setAtivForm((f) => (f ? { ...f, notas: e.target.value } : f))} placeholder="Observações opcionais..." rows={3}
                className="brk-input" style={{ width: '100%', resize: 'vertical', fontFamily: 'inherit' }} />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

const linkBtn: CSSProperties = { border: 'none', background: 'transparent', color: 'var(--amarelo-fagulha)', fontSize: 12.5, cursor: 'pointer', padding: 0, fontWeight: 600 };
const vincularBtn: CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, width: '100%', padding: '10px 12px', borderRadius: 9, border: '1px solid var(--borda)', background: 'var(--superficie-2)', color: 'var(--texto-suave)', fontSize: 12.5, cursor: 'pointer' };
const acaoContrato: CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '9px 12px', borderRadius: 9, border: '1px solid color-mix(in srgb, var(--amarelo-fagulha) 45%, transparent)', background: 'color-mix(in srgb, var(--amarelo-fagulha) 12%, transparent)', color: 'var(--amarelo-fagulha)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' };
const iconBtn: CSSProperties = { width: 28, height: 28, borderRadius: 7, border: '1px solid var(--borda)', background: 'transparent', color: 'var(--texto-fraco)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const itemVinc: CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 10px', borderRadius: 9, border: '1px solid var(--borda)', background: 'var(--superficie-2)', cursor: 'pointer' };
const avatarVinc: CSSProperties = { width: 28, height: 28, borderRadius: 999, background: 'var(--superficie-4)', color: 'var(--texto-suave)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flex: '0 0 auto' };

function VazioVinc({ texto }: { texto: string }) {
  return <div style={{ fontSize: 12.5, color: 'var(--texto-fraco)', padding: '10px 2px' }}>{texto}</div>;
}

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
