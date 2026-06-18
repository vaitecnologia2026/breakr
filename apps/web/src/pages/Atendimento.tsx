/**
 * Atendimento (M22) — Inbox WhatsApp.
 * Layout: Painel de lista (esquerda) + Painel de chat (direita).
 * Estilo VAI CRM: avatares com iniciais, tabs Ativos/Pendentes/Grupos, SLA timer.
 */
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import { api } from '../lib/api';

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Status = 'PENDENTE' | 'ATENDENDO' | 'RESOLVIDO';
type TabInbox = 'ATIVOS' | 'PENDENTES' | 'GRUPOS';

interface TemplateGrupo {
  id: string;
  categoria: string;
  emoji: string;
  titulo: string;
  modelo: string;
}

// ─── Modelos de mensagem em grupo ─────────────────────────────────────────────

const TEMPLATES_GRUPO: TemplateGrupo[] = [
  {
    id: 'boas-vindas',
    categoria: 'Início',
    emoji: '👋',
    titulo: 'Boas-vindas ao grupo',
    modelo: `Olá, equipe! 👋\n\nSejam bem-vindos ao grupo de acompanhamento do projeto *[Nome do Cliente]*.\n\nAqui compartilharemos atualizações, aprovações e resultados do nosso trabalho juntos.\n\nQualquer dúvida, pode chamar. Vamos nessa! 🚀`,
  },
  {
    id: 'relatorio-semanal',
    categoria: 'Relatório',
    emoji: '📊',
    titulo: 'Relatório semanal',
    modelo: `📊 *RELATÓRIO SEMANAL — Semana [X]*\n\nOlá! Segue o resumo de desempenho:\n\n✅ Alcance orgânico: [X]\n✅ Engajamento: [X]%\n✅ Novos seguidores: +[X]\n✅ Leads gerados: [X]\n\n📈 Destaque: [descrever]\n⚠️ Ponto de atenção: [descrever]\n\nQualquer dúvida, estamos à disposição!`,
  },
  {
    id: 'aprovacao-conteudo',
    categoria: 'Conteúdo',
    emoji: '✅',
    titulo: 'Aprovação de conteúdo',
    modelo: `Olá! Temos novos conteúdos prontos para aprovação. 📲\n\n📱 Posts: [X]\n🎬 Reels: [X]\n📖 Stories: [X]\n\n⏰ Prazo de aprovação: [data]\n\nOs conteúdos estão disponíveis no portal. Qualquer ajuste, é só sinalizar! 💬`,
  },
  {
    id: 'lembrete-reuniao',
    categoria: 'Reunião',
    emoji: '📅',
    titulo: 'Lembrete de reunião',
    modelo: `⏰ *LEMBRETE DE REUNIÃO*\n\nOlá! Nossa reunião de alinhamento está chegando:\n\n📅 Data: [dia/mês]\n🕐 Horário: [hora]\n📍 Link: [link ou endereço]\n📋 Pauta: [tópicos principais]\n\nAté lá! 👋`,
  },
  {
    id: 'resultados-mes',
    categoria: 'Relatório',
    emoji: '🎯',
    titulo: 'Resultados do mês',
    modelo: `🎯 *RESULTADOS DO MÊS — [Mês/Ano]*\n\nSegue o fechamento mensal:\n\n📈 Crescimento: +[X]%\n👥 Total de seguidores: [X]\n🔥 Post destaque: [X] visualizações\n💰 Leads gerados: [X]\n💵 ROI estimado: [X]%\n\nÓtimo mês! Continue assim. 🚀`,
  },
  {
    id: 'analise-trafego',
    categoria: 'Tráfego',
    emoji: '🚀',
    titulo: 'Análise de tráfego pago',
    modelo: `🚀 *TRÁFEGO PAGO — [Período]*\n\n💰 Investimento: R$[X]\n👁 Impressões: [X]\n🖱 Cliques: [X]\n🎯 CTR: [X]%\n💡 CPL: R$[X]\n📋 Leads gerados: [X]\n\nCampanhas ativas:\n• [Nome] — [status]\n\nQualquer ajuste nas campanhas, é só avisar!`,
  },
  {
    id: 'update-onboarding',
    categoria: 'Onboarding',
    emoji: '📋',
    titulo: 'Atualização de onboarding',
    modelo: `📋 *ATUALIZAÇÃO DE ONBOARDING*\n\nOlá! Segue o status do onboarding:\n\n✅ Concluído:\n• [etapa 1]\n• [etapa 2]\n\n🔄 Em andamento:\n• [etapa 3]\n\n⏳ Próximos passos:\n• [etapa 4]\n\nSeguimos avançando! 💪`,
  },
  {
    id: 'feedback-incentivo',
    categoria: 'Feedback',
    emoji: '⭐',
    titulo: 'Mensagem de incentivo',
    modelo: `Olá, equipe! 🌟\n\nQueria registrar o quanto estamos satisfeitos com o trabalho de vocês.\n\nOs resultados estão chegando e a qualidade está ótima.\n\nMuito obrigado pela dedicação! Continuem assim. 🙌`,
  },
  {
    id: 'novo-produto',
    categoria: 'Vendas',
    emoji: '💰',
    titulo: 'Lançamento / novo serviço',
    modelo: `Atenção, equipe! 🎉\n\nEstamos lançando um novo serviço/produto:\n\n🏷 Nome: [produto/serviço]\n💵 Valor: R$[X]\n📆 Data de lançamento: [data]\n🎯 Público-alvo: [descrição]\n\nPrecisamos de energia total para divulgar isso! Qualquer dúvida, estamos aqui. 🔥`,
  },
  {
    id: 'urgente',
    categoria: 'Urgente',
    emoji: '⚡',
    titulo: 'Comunicado urgente',
    modelo: `⚡ *COMUNICADO URGENTE*\n\nOlá a todos!\n\nPrecisamos de atenção imediata sobre:\n\n📌 [Descrever o assunto urgente]\n\n✅ Ação necessária: [o que precisa ser feito]\n⏰ Prazo: [hora/data]\n\nPor favor, confirmar o recebimento desta mensagem. Obrigado!`,
  },
];


interface ClienteMin {
  id: string;
  nomeFantasia: string;
  tag: string | null;
}

interface AtendenteMin {
  id: string;
  nome: string;
}

interface UltimaMensagem {
  texto: string | null;
  autor: string;
  criadoEm: string;
}

interface Conversa {
  id: string;
  status: Status;
  waTelefone: string | null;
  assunto: string | null;
  ultimaMsgEm: string | null;
  criadoEm: string;
  cliente: ClienteMin | null;
  atendente: AtendenteMin | null;
  mensagens: UltimaMensagem[];
}

interface Mensagem {
  id: string;
  autor: string;
  direcao: string;
  tipo: string;
  texto: string | null;
  waMsgId: string | null;
  criadoEm: string;
}

interface ConversaDetalhe extends Omit<Conversa, 'mensagens'> {
  mensagens: Mensagem[];
}

interface InboxData {
  pendente: Conversa[];
  atendendo: Conversa[];
  resolvido: Conversa[];
}

// ─── Utilitários ──────────────────────────────────────────────────────────────

function tempoRelativo(isoStr: string | null): string {
  if (!isoStr) return '';
  const diff = Date.now() - new Date(isoStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function slaTimer(isoStr: string): string {
  const diff = Date.now() - new Date(isoStr).getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return '< 1m';
}

function formatarHora(isoStr: string): string {
  return new Date(isoStr).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

const CORES_AVATAR = ['#d05028', '#2a72d5', '#27a567', '#c4880e', '#8e44c4', '#d4466b', '#0891b2'];

function corAvatar(nome: string): string {
  let h = 0;
  for (let i = 0; i < nome.length; i++) h = (h * 31 + nome.charCodeAt(i)) % CORES_AVATAR.length;
  return CORES_AVATAR[h];
}

function iniciais(nome: string): string {
  const parts = nome.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function nomeContato(c: Conversa): string {
  return c.cliente?.nomeFantasia ?? c.waTelefone ?? 'Número avulso';
}

function ultimaMsgPreview(c: Conversa): string {
  const m = c.mensagens[0];
  if (!m) return c.assunto ?? 'Conversa iniciada';
  if (!m.texto) return '🎵 Áudio';
  return m.texto;
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function Atendimento() {
  const [inbox, setInbox] = useState<InboxData>({ pendente: [], atendendo: [], resolvido: [] });
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [selecionada, setSelecionada] = useState<string | null>(null);
  const [detalhe, setDetalhe] = useState<ConversaDetalhe | null>(null);
  const [carregandoDetalhe, setCarregandoDetalhe] = useState(false);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [tabAtiva, setTabAtiva] = useState<TabInbox>('ATIVOS');
  const [busca, setBusca] = useState('');
  const [templateSelecionado, setTemplateSelecionado] = useState<TemplateGrupo | null>(null);
  const [modeloEditado, setModeloEditado] = useState('');
  const [copiado, setCopiado] = useState(false);

  const [modalNova, setModalNova] = useState(false);
  const [clientes, setClientes] = useState<ClienteMin[]>([]);
  const [novaConversa, setNovaConversa] = useState({ clienteId: '', waTelefone: '', assunto: '' });
  const [criando, setCriando] = useState(false);
  const [modalConfig, setModalConfig] = useState(false);
  const [waConfig, setWaConfig] = useState({
    phoneNumberId: '',
    accessToken: '',
    webhookVerifyToken: '',
    waBaId: '',
    ativo: false,
  });
  const [salvandoConfig, setSalvandoConfig] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const ultimaContagemRef = useRef(0);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function carregarInbox() {
    try {
      const res = await api.get<InboxData>('/atendimento');
      setInbox(res.data);
      setErro(null);
    } catch {
      setErro('Falha ao carregar conversas.');
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarInbox();
    pollingRef.current = setInterval(carregarInbox, 5000);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, []);

  useEffect(() => {
    if (!selecionada) { setDetalhe(null); return; }
    const id = selecionada;
    let ativo = true;
    async function carregar(comLoading: boolean) {
      if (comLoading) setCarregandoDetalhe(true);
      try {
        const res = await api.get<ConversaDetalhe>(`/atendimento/${id}`);
        if (ativo) setDetalhe(res.data);
      } catch { /* silencia */ }
      finally { if (ativo && comLoading) setCarregandoDetalhe(false); }
    }
    carregar(true);
    const t = setInterval(() => carregar(false), 5000);
    return () => { ativo = false; clearInterval(t); };
  }, [selecionada]);

  useEffect(() => {
    const total = detalhe?.mensagens?.length ?? 0;
    if (total > ultimaContagemRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    ultimaContagemRef.current = total;
  }, [detalhe?.mensagens]);

  async function aceitar() {
    if (!selecionada) return;
    await api.post(`/atendimento/${selecionada}/aceitar`);
    carregarInbox();
  }

  async function resolver() {
    if (!selecionada) return;
    await api.post(`/atendimento/${selecionada}/resolver`);
    carregarInbox();
  }

  async function reabrir() {
    if (!selecionada) return;
    await api.post(`/atendimento/${selecionada}/reabrir`);
    carregarInbox();
  }

  async function enviarMensagem(e: FormEvent) {
    e.preventDefault();
    if (!selecionada || !texto.trim() || enviando) return;
    setEnviando(true);
    try {
      await api.post(`/atendimento/${selecionada}/mensagens`, { texto: texto.trim() });
      setTexto('');
      const res = await api.get<ConversaDetalhe>(`/atendimento/${selecionada}`);
      setDetalhe(res.data);
      carregarInbox();
    } finally { setEnviando(false); }
  }

  async function criarConversa(e: FormEvent) {
    e.preventDefault();
    if (criando) return;
    setCriando(true);
    try {
      await api.post('/atendimento', {
        clienteId: novaConversa.clienteId || undefined,
        waTelefone: novaConversa.waTelefone || undefined,
        assunto: novaConversa.assunto || undefined,
      });
      setModalNova(false);
      setNovaConversa({ clienteId: '', waTelefone: '', assunto: '' });
      carregarInbox();
    } finally { setCriando(false); }
  }

  async function abrirModalNova() {
    setModalNova(true);
    try {
      const res = await api.get<ClienteMin[]>('/clientes');
      setClientes(res.data);
    } catch { /* silencia */ }
  }

  async function abrirModalConfig() {
    setModalConfig(true);
    try {
      const res = await api.get<typeof waConfig>('/atendimento/config');
      setWaConfig({
        phoneNumberId: res.data.phoneNumberId ?? '',
        accessToken: res.data.accessToken ?? '',
        webhookVerifyToken: res.data.webhookVerifyToken ?? '',
        waBaId: res.data.waBaId ?? '',
        ativo: res.data.ativo,
      });
    } catch { /* silencia */ }
  }

  async function salvarConfig(e: FormEvent) {
    e.preventDefault();
    setSalvandoConfig(true);
    try {
      await api.put('/atendimento/config', {
        phoneNumberId: waConfig.phoneNumberId || undefined,
        accessToken: waConfig.accessToken.startsWith('***') ? undefined : waConfig.accessToken || undefined,
        webhookVerifyToken: waConfig.webhookVerifyToken || undefined,
        waBaId: waConfig.waBaId || undefined,
        ativo: waConfig.ativo,
      });
      setModalConfig(false);
    } finally { setSalvandoConfig(false); }
  }

  // Filtra conversas por tab e busca
  const todasConversas = [...inbox.atendendo, ...inbox.pendente, ...inbox.resolvido];

  const conversasPorTab: Conversa[] = (() => {
    if (tabAtiva === 'ATIVOS') return inbox.atendendo;
    if (tabAtiva === 'PENDENTES') return inbox.pendente;
    return [];
  })();

  const conversasFiltradas = busca.trim()
    ? conversasPorTab.filter((c) => {
        const q = busca.toLowerCase();
        return (
          nomeContato(c).toLowerCase().includes(q) ||
          (c.waTelefone ?? '').includes(q)
        );
      })
    : conversasPorTab;

  const conversaAtiva = detalhe ?? (
    todasConversas.find((c) => c.id === selecionada) ?? null
  );

  if (carregando) return <EstadoCarregando />;
  if (erro) return <EstadoErro mensagem={erro} onRetry={carregarInbox} />;

  return (
    <div style={{ display: 'flex', margin: '-28px -32px', height: 'calc(100vh - 56px)', overflow: 'hidden' }}>

      {/* ── Painel esquerdo: lista de conversas ─────────────────────────────── */}
      <div
        style={{
          width: 360,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--superficie)',
          borderRight: '1px solid var(--borda)',
          height: '100%',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '10px 12px 8px',
            borderBottom: '1px solid var(--borda)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'var(--texto)' }}>
                Atendimento
              </h2>
              <p style={{ margin: '1px 0 0', fontSize: 10, color: 'var(--texto-fraco)' }}>
                {inbox.pendente.length} pendente{inbox.pendente.length !== 1 ? 's' : ''} · {inbox.atendendo.length} ativo{inbox.atendendo.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <BotaoIcone onClick={abrirModalConfig} title="Configurar WhatsApp">
                <IcoConfig />
              </BotaoIcone>
              <button
                onClick={abrirModalNova}
                className="brk-gradient-bg"
                style={{
                  border: 'none',
                  borderRadius: 8,
                  padding: '6px 12px',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 12,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  whiteSpace: 'nowrap',
                }}
              >
                <span style={{ fontSize: 14, lineHeight: 1 }}>+</span> Nova
              </button>
            </div>
          </div>

          {/* Barra de busca */}
          <div style={{ position: 'relative', marginBottom: 6 }}>
            <span
              style={{
                position: 'absolute',
                left: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--texto-fraco)',
                display: 'flex',
                alignItems: 'center',
                pointerEvents: 'none',
              }}
            >
              <IcoBusca />
            </span>
            <input
              type="text"
              placeholder="Buscar por nome, número..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              style={{
                width: '100%',
                background: 'var(--superficie-2)',
                border: '1px solid var(--borda)',
                borderRadius: 9,
                padding: '6px 36px 6px 34px',
                color: 'var(--texto)',
                fontSize: 12,
                outline: 'none',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--laranja-brasa)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--borda)'; }}
            />
            <button
              style={{
                position: 'absolute',
                right: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--texto-fraco)',
                display: 'flex',
                alignItems: 'center',
                padding: 2,
              }}
              title="Filtros"
            >
              <IcoFiltro />
            </button>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4 }}>
            {([
              { key: 'ATIVOS' as TabInbox, label: 'Ativos', count: inbox.atendendo.length, icon: '🎧' },
              { key: 'PENDENTES' as TabInbox, label: 'Pendentes', count: inbox.pendente.length, icon: '⏱' },
              { key: 'GRUPOS' as TabInbox, label: 'Grupos', count: TEMPLATES_GRUPO.length, icon: '💬' },
            ]).map((tab) => {
              const ativa = tabAtiva === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => {
                    setTabAtiva(tab.key);
                    if (tab.key === 'GRUPOS') setSelecionada(null);
                    else { setTemplateSelecionado(null); setModeloEditado(''); }
                  }}
                  style={{
                    flex: 1,
                    background: ativa ? 'rgba(255,255,255,0.14)' : 'transparent',
                    border: ativa ? '1px solid rgba(255,255,255,0.35)' : '1px solid var(--borda)',
                    borderRadius: 8,
                    padding: '4px 4px',
                    cursor: 'pointer',
                    color: ativa ? 'var(--laranja-brasa)' : 'var(--texto-suave)',
                    fontSize: 10.5,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    transition: 'all 0.15s',
                  }}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                  <span
                    style={{
                      background: ativa ? 'var(--laranja-brasa)' : 'var(--superficie-3)',
                      color: ativa ? '#fff' : 'var(--texto-fraco)',
                      borderRadius: 99,
                      padding: '1px 5px',
                      fontSize: 10,
                      fontWeight: 800,
                    }}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Lista de conversas / modelos de grupo */}
        {tabAtiva === 'GRUPOS' ? (
          <PainelTemplatesLista
            selecionado={templateSelecionado}
            onSelecionar={(t) => {
              setTemplateSelecionado(t);
              setModeloEditado(t.modelo);
            }}
          />
        ) : (
          <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
            {conversasFiltradas.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--texto-fraco)', fontSize: 13 }}>
                {busca ? 'Nenhuma conversa encontrada.' : 'Nenhuma conversa aqui.'}
              </div>
            ) : (
              conversasFiltradas.map((c) => (
                <ItemConversa
                  key={c.id}
                  conversa={c}
                  ativa={selecionada === c.id}
                  onClick={() => setSelecionada(c.id)}
                  onAceitar={c.status === 'PENDENTE' ? async () => {
                    setSelecionada(c.id);
                    await api.post(`/atendimento/${c.id}/aceitar`);
                    carregarInbox();
                  } : undefined}
                />
              ))
            )}
          </div>
        )}
      </div>

      {/* ── Painel direito: chat / modelos ──────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {tabAtiva === 'GRUPOS' ? (
          templateSelecionado ? (
            <PainelComporTemplate
              template={templateSelecionado}
              modelo={modeloEditado}
              setModelo={setModeloEditado}
              copiado={copiado}
              onCopiar={() => {
                navigator.clipboard.writeText(modeloEditado);
                setCopiado(true);
                setTimeout(() => setCopiado(false), 2000);
              }}
              onFechar={() => { setTemplateSelecionado(null); setModeloEditado(''); }}
            />
          ) : (
            <EstadoVazioGrupos />
          )
        ) : !selecionada || !conversaAtiva ? (
          <EstadoVazio onNova={abrirModalNova} />
        ) : (
          <PainelChat
            conversa={conversaAtiva}
            detalhe={detalhe}
            carregandoDetalhe={carregandoDetalhe}
            texto={texto}
            setTexto={setTexto}
            enviando={enviando}
            onEnviar={enviarMensagem}
            onAceitar={aceitar}
            onResolver={resolver}
            onReabrir={reabrir}
            onFechar={() => setSelecionada(null)}
            messagesEndRef={messagesEndRef}
          />
        )}
      </div>

      {/* Modal nova conversa */}
      {modalNova && (
        <Overlay onClose={() => setModalNova(false)}>
          <form onSubmit={criarConversa} style={estiloModal}>
            <div style={{ marginBottom: 4 }}>
              <h2 style={estiloTituloModal}>Nova conversa</h2>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--texto-fraco)' }}>
                Inicia um atendimento via WhatsApp.
              </p>
            </div>

            <CampoForm rotulo="Cliente (opcional)">
              <select
                value={novaConversa.clienteId}
                onChange={(e) => setNovaConversa((v) => ({ ...v, clienteId: e.target.value }))}
                style={estiloInput}
              >
                <option value="">— Selecionar cliente —</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>{c.nomeFantasia}</option>
                ))}
              </select>
            </CampoForm>

            <CampoForm rotulo="WhatsApp do cliente">
              <input
                type="tel"
                placeholder="5511999888777"
                value={novaConversa.waTelefone}
                onChange={(e) => setNovaConversa((v) => ({ ...v, waTelefone: e.target.value }))}
                style={estiloInput}
              />
            </CampoForm>

            <CampoForm rotulo="Assunto (opcional)">
              <input
                type="text"
                placeholder="Ex: Dúvida sobre relatório"
                value={novaConversa.assunto}
                onChange={(e) => setNovaConversa((v) => ({ ...v, assunto: e.target.value }))}
                style={estiloInput}
              />
            </CampoForm>

            <div style={estiloRodapeModal}>
              <BotaoSecundario onClick={() => setModalNova(false)}>Cancelar</BotaoSecundario>
              <BotaoPrimario type="submit" disabled={criando}>
                {criando ? 'Criando…' : 'Criar conversa'}
              </BotaoPrimario>
            </div>
          </form>
        </Overlay>
      )}

      {/* Modal configurações WhatsApp */}
      {modalConfig && (
        <Overlay onClose={() => setModalConfig(false)}>
          <form onSubmit={salvarConfig} style={{ ...estiloModal, width: 480 }}>
            <div style={{ marginBottom: 4 }}>
              <h2 style={estiloTituloModal}>Configuração WhatsApp</h2>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--texto-fraco)' }}>
                Meta Cloud API — Phone Number ID + token permanente.
              </p>
            </div>

            <CampoForm rotulo="Phone Number ID">
              <input
                type="text"
                placeholder="123456789012345"
                value={waConfig.phoneNumberId}
                onChange={(e) => setWaConfig((v) => ({ ...v, phoneNumberId: e.target.value }))}
                style={estiloInput}
              />
            </CampoForm>

            <CampoForm rotulo="Access Token (deixe em branco para não alterar)">
              <input
                type="password"
                placeholder="EAAxxxxxxxx…"
                value={waConfig.accessToken}
                onChange={(e) => setWaConfig((v) => ({ ...v, accessToken: e.target.value }))}
                style={estiloInput}
              />
            </CampoForm>

            <CampoForm rotulo="Webhook Verify Token">
              <input
                type="text"
                placeholder="breakr-webhook"
                value={waConfig.webhookVerifyToken}
                onChange={(e) => setWaConfig((v) => ({ ...v, webhookVerifyToken: e.target.value }))}
                style={estiloInput}
              />
            </CampoForm>

            <CampoForm rotulo="WABA ID (opcional)">
              <input
                type="text"
                placeholder="WhatsApp Business Account ID"
                value={waConfig.waBaId}
                onChange={(e) => setWaConfig((v) => ({ ...v, waBaId: e.target.value }))}
                style={estiloInput}
              />
            </CampoForm>

            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={waConfig.ativo}
                onChange={(e) => setWaConfig((v) => ({ ...v, ativo: e.target.checked }))}
                style={{ width: 16, height: 16, accentColor: 'var(--laranja-brasa)' }}
              />
              <span style={{ fontSize: 13, color: 'var(--texto-suave)', fontWeight: 600 }}>
                Canal ativo (envia mensagens pela Meta API)
              </span>
            </label>

            <div
              style={{
                background: 'rgba(255,200,0,0.05)',
                border: '1px solid rgba(255,200,0,0.18)',
                borderRadius: 8,
                padding: '10px 14px',
                fontSize: 11,
                color: 'var(--texto-suave)',
              }}
            >
              URL do webhook a registrar na Meta:
              <br />
              <code style={{ color: 'var(--amarelo-fagulha)', wordBreak: 'break-all', fontSize: 10.5 }}>
                {window.location.origin.replace('breakr.vai-sistema.com', 'breakr-api.up.railway.app')}/atendimento/webhooks/meta
              </code>
            </div>

            <div style={estiloRodapeModal}>
              <BotaoSecundario onClick={() => setModalConfig(false)}>Cancelar</BotaoSecundario>
              <BotaoPrimario type="submit" disabled={salvandoConfig}>
                {salvandoConfig ? 'Salvando…' : 'Salvar configuração'}
              </BotaoPrimario>
            </div>
          </form>
        </Overlay>
      )}
    </div>
  );
}

// ─── Item de conversa (lista) ─────────────────────────────────────────────────

function ItemConversa({
  conversa: c,
  ativa,
  onClick,
  onAceitar,
}: {
  conversa: Conversa;
  ativa: boolean;
  onClick: () => void;
  onAceitar?: () => void;
}) {
  const nome = nomeContato(c);
  const cor = corAvatar(nome);
  const ini = iniciais(nome);
  const ultimaMsg = ultimaMsgPreview(c);
  const hora = tempoRelativo(c.ultimaMsgEm ?? c.criadoEm);
  const isPendente = c.status === 'PENDENTE';
  const sla = slaTimer(c.criadoEm);

  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        background: ativa ? 'rgba(255,255,255,0.1)' : 'transparent',
        border: 'none',
        borderLeft: `3px solid ${ativa ? 'var(--laranja-brasa)' : 'transparent'}`,
        padding: '7px 12px 7px 11px',
        textAlign: 'left',
        cursor: 'pointer',
        transition: 'background 0.12s',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
      }}
      onMouseEnter={(e) => { if (!ativa) e.currentTarget.style.background = 'var(--superficie-3)'; }}
      onMouseLeave={(e) => { if (!ativa) e.currentTarget.style.background = 'transparent'; }}
    >
      {/* Avatar */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: '50%',
            background: cor,
            display: 'grid',
            placeItems: 'center',
            fontSize: ini.length > 2 ? 9 : 12,
            fontWeight: 800,
            color: '#fff',
            letterSpacing: '-0.5px',
          }}
        >
          {ini}
        </div>
        {/* Badge WA */}
        <div
          style={{
            position: 'absolute',
            bottom: -1,
            right: -1,
            width: 13,
            height: 13,
            borderRadius: '50%',
            background: '#25d366',
            border: '2px solid var(--superficie)',
            display: 'grid',
            placeItems: 'center',
          }}
        >
          <IcoWA size={8} />
        </div>
      </div>

      {/* Conteúdo */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Linha 1: nome + hora + dot */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 1 }}>
          <span
            style={{
              flex: 1,
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--texto)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {nome}
          </span>
          {isPendente && (
            <span style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: '#e53e3e',
              flexShrink: 0,
            }} />
          )}
          <span style={{ fontSize: 10, color: 'var(--texto-fraco)', flexShrink: 0 }}>
            {hora}
          </span>
        </div>

        {/* Linha 2: última mensagem + badge de não lidas */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <span
            style={{
              flex: 1,
              fontSize: 11,
              color: 'var(--texto-suave)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {ultimaMsg}
          </span>
          {isPendente && (
            <span
              style={{
                background: 'var(--laranja-brasa)',
                color: '#fff',
                borderRadius: 99,
                padding: '1px 6px',
                fontSize: 10,
                fontWeight: 800,
                flexShrink: 0,
              }}
            >
              1
            </span>
          )}
        </div>

        {/* Linha 3: agente + SLA + canal */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'nowrap', overflow: 'hidden' }}>
          {c.atendente ? (
            <>
              <IcoAgente size={11} color="var(--texto-fraco)" />
              <span style={{ fontSize: 10.5, color: 'var(--texto-fraco)', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {c.atendente.nome}
              </span>
            </>
          ) : (
            <span style={{ fontSize: 10.5, color: 'var(--texto-fraco)' }}>Sem atendente</span>
          )}
          <span style={{ color: 'var(--borda-forte)', fontSize: 10, flexShrink: 0 }}>·</span>
          <IcoClock size={10} color="var(--amarelo-fagulha)" />
          <span style={{ fontSize: 10.5, color: 'var(--amarelo-fagulha)', fontWeight: 600, flexShrink: 0 }}>
            {sla}
          </span>
          {c.waTelefone && (
            <>
              <span style={{ color: 'var(--borda-forte)', fontSize: 10, flexShrink: 0 }}>·</span>
              <span style={{ fontSize: 10, color: 'var(--texto-fraco)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {c.waTelefone}
              </span>
            </>
          )}
        </div>

        {/* Botão Aceitar (só para PENDENTE) */}
        {isPendente && onAceitar && (
          <div
            style={{ marginTop: 8 }}
            onClick={(e) => { e.stopPropagation(); onAceitar(); }}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                background: 'linear-gradient(135deg, var(--laranja-brasa), var(--vermelho-fogo))',
                color: '#fff',
                borderRadius: 7,
                padding: '4px 10px',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
                letterSpacing: '0.2px',
              }}
            >
              ✓ Aceitar
            </span>
          </div>
        )}
      </div>
    </button>
  );
}

// ─── Painel de chat ───────────────────────────────────────────────────────────

function PainelChat({
  conversa,
  detalhe,
  carregandoDetalhe,
  texto,
  setTexto,
  enviando,
  onEnviar,
  onAceitar,
  onResolver,
  onReabrir,
  onFechar,
  messagesEndRef,
}: {
  conversa: Conversa | ConversaDetalhe;
  detalhe: ConversaDetalhe | null;
  carregandoDetalhe: boolean;
  texto: string;
  setTexto: (v: string) => void;
  enviando: boolean;
  onEnviar: (e: FormEvent) => void;
  onAceitar: () => void;
  onResolver: () => void;
  onReabrir: () => void;
  onFechar: () => void;
  messagesEndRef: React.RefObject<HTMLDivElement>;
}) {
  const nome = nomeContato(conversa);
  const cor = corAvatar(nome);
  const ini = iniciais(nome);

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg)',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Header do chat */}
      <div
        style={{
          padding: '12px 20px',
          borderBottom: '1px solid var(--borda)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          background: 'var(--superficie)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ position: 'relative' }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: cor,
                display: 'grid',
                placeItems: 'center',
                fontSize: 14,
                fontWeight: 800,
                color: '#fff',
              }}
            >
              {ini}
            </div>
            <div
              style={{
                position: 'absolute',
                bottom: -1,
                right: -1,
                width: 14,
                height: 14,
                borderRadius: '50%',
                background: '#25d366',
                border: '2px solid var(--superficie)',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <IcoWA size={7} />
            </div>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--texto)' }}>{nome}</div>
            <div style={{ fontSize: 11, color: 'var(--texto-fraco)', display: 'flex', alignItems: 'center', gap: 6 }}>
              {conversa.waTelefone ?? 'sem número'}
              <span style={{ color: 'var(--borda-forte)' }}>·</span>
              <BadgeStatus status={conversa.status} />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {conversa.status === 'PENDENTE' && (
            <BotaoPrimario onClick={onAceitar}>Aceitar</BotaoPrimario>
          )}
          {conversa.status === 'ATENDENDO' && (
            <BotaoSecundario onClick={onResolver} estilo="verde">
              Resolver
            </BotaoSecundario>
          )}
          {conversa.status === 'RESOLVIDO' && (
            <BotaoSecundario onClick={onReabrir}>Reabrir</BotaoSecundario>
          )}
          <BotaoIcone onClick={onFechar} title="Fechar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </BotaoIcone>
        </div>
      </div>

      {/* Área de mensagens */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          background: 'var(--bg)',
        }}
      >
        {carregandoDetalhe ? (
          <div style={{ textAlign: 'center', color: 'var(--texto-fraco)', fontSize: 13, marginTop: 60 }}>
            Carregando mensagens…
          </div>
        ) : (detalhe?.mensagens.length === 0) ? (
          <div style={{ textAlign: 'center', color: 'var(--texto-fraco)', fontSize: 13, marginTop: 60 }}>
            Nenhuma mensagem ainda.
          </div>
        ) : (
          detalhe?.mensagens.map((msg) => (
            <BubbleMensagem key={msg.id} mensagem={msg} />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Compositor / bloqueio por status */}
      {conversa.status === 'PENDENTE' ? (
        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid var(--borda)',
            background: 'var(--superficie)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
            gap: 12,
          }}
        >
          <p style={{ margin: 0, fontSize: 13, color: 'var(--texto-suave)' }}>
            Aceite esta conversa para enviar mensagens.
          </p>
          <button
            onClick={onAceitar}
            className="brk-gradient-bg"
            style={{
              border: 'none',
              borderRadius: 9,
              padding: '9px 20px',
              color: '#fff',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            ✓ Aceitar conversa
          </button>
        </div>
      ) : (
        <form
          onSubmit={onEnviar}
          style={{
            padding: '12px 16px',
            borderTop: '1px solid var(--borda)',
            display: 'flex',
            gap: 8,
            flexShrink: 0,
            background: 'var(--superficie)',
            alignItems: 'center',
          }}
        >
          <input
            type="text"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={
              conversa.status === 'RESOLVIDO'
                ? 'Conversa resolvida. Reabra para responder.'
                : 'Digite uma mensagem…'
            }
            disabled={conversa.status === 'RESOLVIDO' || enviando}
            style={{
              flex: 1,
              background: 'var(--superficie-2)',
              border: '1px solid var(--borda)',
              borderRadius: 10,
              padding: '10px 14px',
              color: 'var(--texto)',
              fontSize: 14,
              outline: 'none',
              opacity: conversa.status === 'RESOLVIDO' ? 0.5 : 1,
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--laranja-brasa)'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--borda)'; }}
          />
          <button
            type="submit"
            disabled={!texto.trim() || enviando || conversa.status === 'RESOLVIDO'}
            className="brk-gradient-bg"
            style={{
              border: 'none',
              borderRadius: 10,
              padding: '10px 20px',
              color: '#fff',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              opacity: (!texto.trim() || enviando || conversa.status === 'RESOLVIDO') ? 0.45 : 1,
              whiteSpace: 'nowrap',
            }}
          >
            {enviando ? '…' : 'Enviar'}
          </button>
        </form>
      )}
    </div>
  );
}

// ─── Templates de grupo ───────────────────────────────────────────────────────

function PainelTemplatesLista({
  selecionado,
  onSelecionar,
}: {
  selecionado: TemplateGrupo | null;
  onSelecionar: (t: TemplateGrupo) => void;
}) {
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
      <p style={{
        padding: '8px 16px 6px',
        fontSize: 10.5,
        fontWeight: 700,
        color: 'var(--texto-fraco)',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        margin: 0,
      }}>
        Modelos de mensagem
      </p>
      {TEMPLATES_GRUPO.map((t) => {
        const ativo = selecionado?.id === t.id;
        const preview = t.modelo.replace(/\*/g, '').replace(/\n/g, ' ').slice(0, 68) + '…';
        return (
          <button
            key={t.id}
            onClick={() => onSelecionar(t)}
            style={{
              width: '100%',
              background: ativo ? 'rgba(255,255,255,0.10)' : 'transparent',
              border: 'none',
              borderLeft: `3px solid ${ativo ? 'var(--laranja-brasa)' : 'transparent'}`,
              padding: '10px 14px 10px 13px',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'background 0.12s',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
            onMouseEnter={(e) => { if (!ativo) e.currentTarget.style.background = 'var(--superficie-3)'; }}
            onMouseLeave={(e) => { if (!ativo) e.currentTarget.style.background = 'transparent'; }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ fontSize: 15, flexShrink: 0, lineHeight: 1 }}>{t.emoji}</span>
              <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: 'var(--texto)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {t.titulo}
              </span>
              <span style={{
                fontSize: 9.5,
                fontWeight: 700,
                padding: '1px 6px',
                borderRadius: 99,
                background: ativo ? 'rgba(255,255,255,0.15)' : 'var(--superficie-3)',
                color: ativo ? 'var(--laranja-brasa)' : 'var(--texto-fraco)',
                flexShrink: 0,
                letterSpacing: '0.04em',
                border: `1px solid ${ativo ? 'rgba(255,255,255,0.25)' : 'var(--borda)'}`,
              }}>
                {t.categoria}
              </span>
            </div>
            <p style={{
              margin: 0,
              fontSize: 11.5,
              color: 'var(--texto-fraco)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              paddingLeft: 22,
            }}>
              {preview}
            </p>
          </button>
        );
      })}
    </div>
  );
}

function PainelComporTemplate({
  template,
  modelo,
  setModelo,
  copiado,
  onCopiar,
  onFechar,
}: {
  template: TemplateGrupo;
  modelo: string;
  setModelo: (v: string) => void;
  copiado: boolean;
  onCopiar: () => void;
  onFechar: () => void;
}) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg)', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        padding: '12px 20px',
        borderBottom: '1px solid var(--borda)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        background: 'var(--superficie)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22, lineHeight: 1 }}>{template.emoji}</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--texto)' }}>{template.titulo}</div>
            <div style={{ fontSize: 11, color: 'var(--texto-fraco)', marginTop: 1 }}>
              Edite o modelo e copie para enviar no WhatsApp
            </div>
          </div>
        </div>
        <BotaoIcone onClick={onFechar} title="Fechar">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </BotaoIcone>
      </div>

      {/* Área de edição */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Instrução */}
        <div style={{
          background: 'rgba(245,154,0,0.06)',
          border: '1px solid rgba(245,154,0,0.2)',
          borderRadius: 9,
          padding: '10px 14px',
          fontSize: 12,
          color: 'var(--texto-suave)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <span style={{ fontSize: 14 }}>✏️</span>
          Substitua os campos entre <strong>[colchetes]</strong> pelas informações do cliente antes de enviar.
        </div>

        {/* Textarea */}
        <div style={{
          background: 'var(--superficie)',
          border: '1px solid var(--borda)',
          borderRadius: 12,
          overflow: 'hidden',
        }}>
          <textarea
            value={modelo}
            onChange={(e) => setModelo(e.target.value)}
            onFocus={(e) => { e.currentTarget.parentElement!.style.borderColor = 'var(--laranja-brasa)'; }}
            onBlur={(e) => { e.currentTarget.parentElement!.style.borderColor = 'var(--borda)'; }}
            style={{
              width: '100%',
              minHeight: 260,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              resize: 'none',
              color: 'var(--texto)',
              fontSize: 13.5,
              lineHeight: 1.7,
              padding: '16px 18px',
              fontFamily: 'inherit',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Ações */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={onCopiar}
            className="brk-gradient-bg"
            style={{
              border: 'none',
              borderRadius: 9,
              padding: '10px 22px',
              color: '#fff',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              flexShrink: 0,
              transition: 'opacity 0.15s',
            }}
          >
            {copiado
              ? <><span>✓</span> Copiado!</>
              : <><span style={{ fontSize: 15 }}>⎘</span> Copiar mensagem</>
            }
          </button>
          <button
            onClick={() => setModelo(template.modelo)}
            style={{
              background: 'var(--superficie-2)',
              border: '1px solid var(--borda)',
              borderRadius: 9,
              padding: '10px 16px',
              color: 'var(--texto-suave)',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Restaurar original
          </button>
          <p style={{ margin: 0, fontSize: 11.5, color: 'var(--texto-fraco)', lineHeight: 1.4 }}>
            Cole no WhatsApp Web ou no app para enviar ao grupo.
          </p>
        </div>
      </div>
    </div>
  );
}

function EstadoVazioGrupos() {
  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
      gap: 14,
      padding: 40,
    }}>
      <div style={{
        width: 68,
        height: 68,
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.07)',
        border: '1px solid rgba(255,255,255,0.14)',
        display: 'grid',
        placeItems: 'center',
        fontSize: 28,
      }}>
        💬
      </div>
      <div style={{ textAlign: 'center' }}>
        <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--texto)' }}>
          Modelos de mensagem
        </p>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--texto-fraco)', lineHeight: 1.5, maxWidth: 280 }}>
          Selecione um modelo na lista ao lado para editar e copiar para o WhatsApp.
        </p>
      </div>
    </div>
  );
}

// ─── Estado vazio (sem conversa selecionada) ──────────────────────────────────

function EstadoVazio({ onNova }: { onNova: () => void }) {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg)',
        gap: 16,
        padding: 40,
      }}
    >
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          background: 'rgba(37,211,102,0.1)',
          border: '1px solid rgba(37,211,102,0.2)',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <IcoWA size={32} color="#25d366" />
      </div>
      <div style={{ textAlign: 'center' }}>
        <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--texto)' }}>
          Selecione uma conversa
        </p>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--texto-fraco)' }}>
          Escolha na lista ao lado ou inicie uma nova conversa.
        </p>
      </div>
      <button
        onClick={onNova}
        className="brk-gradient-bg"
        style={{
          border: 'none',
          borderRadius: 9,
          padding: '9px 20px',
          color: '#fff',
          fontWeight: 700,
          fontSize: 13,
          cursor: 'pointer',
        }}
      >
        + Nova conversa
      </button>
    </div>
  );
}

// ─── Bubble de mensagem ───────────────────────────────────────────────────────

function BubbleMensagem({ mensagem }: { mensagem: Mensagem }) {
  const isOutbound = mensagem.direcao === 'outbound';
  const isSistema = mensagem.autor === 'SISTEMA';

  if (isSistema) {
    return (
      <div style={{ textAlign: 'center', margin: '6px 0' }}>
        <span
          style={{
            display: 'inline-block',
            background: 'var(--superficie-3)',
            border: '1px solid var(--borda)',
            borderRadius: 99,
            padding: '3px 14px',
            fontSize: 11,
            color: 'var(--texto-fraco)',
          }}
        >
          {mensagem.texto}
        </span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', justifyContent: isOutbound ? 'flex-end' : 'flex-start' }}>
      <div
        style={{
          maxWidth: '68%',
          background: isOutbound
            ? 'linear-gradient(135deg, var(--laranja-brasa), var(--vermelho-fogo))'
            : 'var(--superficie)',
          border: isOutbound ? 'none' : '1px solid var(--borda)',
          borderRadius: isOutbound ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
          padding: '9px 13px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 13.5,
            color: isOutbound ? '#fff' : 'var(--texto)',
            lineHeight: 1.5,
            wordBreak: 'break-word',
          }}
        >
          {mensagem.texto ?? '[mídia não suportada]'}
        </p>
        <p
          style={{
            margin: '4px 0 0',
            fontSize: 10.5,
            color: isOutbound ? 'rgba(255,255,255,0.6)' : 'var(--texto-fraco)',
            textAlign: 'right',
          }}
        >
          {formatarHora(mensagem.criadoEm)}
        </p>
      </div>
    </div>
  );
}

// ─── Badge de status ──────────────────────────────────────────────────────────

function BadgeStatus({ status }: { status: Status }) {
  const mapa: Record<Status, { label: string; cor: string; bg: string }> = {
    PENDENTE: { label: 'Pendente', cor: '#e2a944', bg: 'rgba(226,169,68,0.12)' },
    ATENDENDO: { label: 'Atendendo', cor: '#4a9edd', bg: 'rgba(74,158,221,0.12)' },
    RESOLVIDO: { label: 'Resolvido', cor: '#5cb85c', bg: 'rgba(92,184,92,0.12)' },
  };
  const { label, cor, bg } = mapa[status];
  return (
    <span
      style={{
        display: 'inline-block',
        background: bg,
        border: `1px solid ${cor}44`,
        borderRadius: 99,
        padding: '1px 8px',
        fontSize: 10.5,
        fontWeight: 700,
        color: cor,
      }}
    >
      {label}
    </span>
  );
}

// ─── Ícones SVG ───────────────────────────────────────────────────────────────

function IcoWA({ size = 12, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function IcoBusca() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function IcoFiltro() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="8" y1="12" x2="16" y2="12" />
      <line x1="11" y1="18" x2="13" y2="18" />
    </svg>
  );
}

function IcoConfig() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function IcoAgente({ size = 12, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function IcoClock({ size = 12, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

// ─── Primitivas UI ─────────────────────────────────────────────────────────────

const estiloInput: React.CSSProperties = {
  background: 'var(--superficie-2)',
  border: '1px solid var(--borda)',
  borderRadius: 9,
  padding: '10px 14px',
  color: 'var(--texto)',
  fontSize: 13.5,
  width: '100%',
  outline: 'none',
  boxSizing: 'border-box',
};

const estiloModal: React.CSSProperties = {
  background: 'var(--superficie)',
  border: '1px solid var(--borda)',
  borderRadius: 16,
  padding: 28,
  width: 430,
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
  maxHeight: '90vh',
  overflowY: 'auto',
};

const estiloTituloModal: React.CSSProperties = {
  fontSize: 17,
  fontWeight: 800,
  margin: 0,
  color: 'var(--texto)',
};

const estiloRodapeModal: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  justifyContent: 'flex-end',
  marginTop: 4,
};

function CampoForm({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--texto-suave)' }}>{rotulo}</span>
      {children}
    </label>
  );
}

function BotaoPrimario({
  children,
  onClick,
  type = 'button',
  disabled = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="brk-gradient-bg"
      style={{
        border: 'none',
        borderRadius: 9,
        padding: '8px 16px',
        color: '#fff',
        fontWeight: 700,
        fontSize: 13,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.55 : 1,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  );
}

function BotaoSecundario({
  children,
  onClick,
  estilo,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  estilo?: 'verde';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: estilo === 'verde' ? 'rgba(92,184,92,0.1)' : 'var(--superficie-2)',
        border: `1px solid ${estilo === 'verde' ? 'rgba(92,184,92,0.35)' : 'var(--borda)'}`,
        borderRadius: 9,
        padding: '8px 14px',
        color: estilo === 'verde' ? '#5cb85c' : 'var(--texto-suave)',
        fontWeight: 600,
        fontSize: 13,
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  );
}

function BotaoIcone({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={{
        background: 'var(--superficie-2)',
        border: '1px solid var(--borda)',
        borderRadius: 8,
        width: 32,
        height: 32,
        display: 'grid',
        placeItems: 'center',
        cursor: 'pointer',
        color: 'var(--texto-suave)',
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
}

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.65)',
        display: 'grid',
        placeItems: 'center',
        zIndex: 200,
        backdropFilter: 'blur(6px)',
      }}
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}

function EstadoCarregando() {
  return (
    <div style={{ display: 'grid', placeItems: 'center', height: 300, color: 'var(--texto-fraco)', fontSize: 13 }}>
      Carregando atendimento…
    </div>
  );
}

function EstadoErro({ mensagem, onRetry }: { mensagem: string; onRetry: () => void }) {
  return (
    <div style={{ display: 'grid', placeItems: 'center', height: 300, textAlign: 'center', gap: 12 }}>
      <p style={{ color: '#e2738a', fontSize: 14 }}>{mensagem}</p>
      <button
        onClick={onRetry}
        style={{
          background: 'var(--superficie-2)',
          border: '1px solid var(--borda)',
          borderRadius: 8,
          padding: '8px 16px',
          color: 'var(--texto-suave)',
          cursor: 'pointer',
          fontSize: 13,
        }}
      >
        Tentar novamente
      </button>
    </div>
  );
}
