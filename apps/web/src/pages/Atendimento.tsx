/**
 * Atendimento (M22) — Inbox WhatsApp.
 * Layout: Kanban 3 colunas (PENDENTE | ATENDENDO | RESOLVIDO).
 * Clicando em um card abre painel de chat lateral.
 * Polling a cada 5 s para novas mensagens.
 */
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import { api } from '../lib/api';

// ─── Tipos ───────────────────────────────────────────────────────────────────

type Status = 'PENDENTE' | 'ATENDENDO' | 'RESOLVIDO';

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

// ─── Utilitários ─────────────────────────────────────────────────────────────

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

function formatarHora(isoStr: string): string {
  return new Date(isoStr).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
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
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Carrega inbox
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

  // Carrega detalhe de uma conversa (mensagens)
  async function carregarDetalhe(id: string) {
    setCarregandoDetalhe(true);
    try {
      const res = await api.get<ConversaDetalhe>(`/atendimento/${id}`);
      setDetalhe(res.data);
    } catch {
      /* silencia */
    } finally {
      setCarregandoDetalhe(false);
    }
  }

  useEffect(() => {
    carregarInbox();
    pollingRef.current = setInterval(carregarInbox, 5000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  // Reload detalhe quando inbox atualiza e há conversa selecionada
  useEffect(() => {
    if (selecionada) carregarDetalhe(selecionada);
  }, [inbox]);

  // Scroll para última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [detalhe?.mensagens]);

  function abrirConversa(id: string) {
    setSelecionada(id);
    carregarDetalhe(id);
  }

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
      carregarDetalhe(selecionada);
      carregarInbox();
    } finally {
      setEnviando(false);
    }
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
    } finally {
      setCriando(false);
    }
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
    } finally {
      setSalvandoConfig(false);
    }
  }

  // Conversa selecionada no detalhe ou na lista
  const conversaAtiva = detalhe ?? (
    [...inbox.pendente, ...inbox.atendendo, ...inbox.resolvido].find((c) => c.id === selecionada) ?? null
  );

  if (carregando) return <EstadoCarregando />;
  if (erro) return <EstadoErro mensagem={erro} onRetry={carregarInbox} />;

  return (
    <div style={{ display: 'flex', height: '100%', flexDirection: 'column', gap: 0 }}>
      {/* Header da página */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 0 20px 0',
          flexShrink: 0,
        }}
      >
        <div>
          <h1
            style={{ fontSize: 22, fontWeight: 800, margin: 0, color: 'var(--texto)' }}
          >
            Atendimento
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--texto-suave)' }}>
            Inbox WhatsApp · {inbox.pendente.length} pendente
            {inbox.pendente.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <BotaoSecundario onClick={abrirModalConfig}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            WhatsApp
          </BotaoSecundario>
          <BotaoPrimario onClick={abrirModalNova}>+ Nova conversa</BotaoPrimario>
        </div>
      </div>

      {/* Corpo: Kanban + painel de chat */}
      <div style={{ display: 'flex', flex: 1, gap: 16, overflow: 'hidden', minHeight: 0 }}>
        {/* Kanban */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: selecionada ? '1fr' : 'repeat(3, 1fr)',
            gap: 16,
            flex: selecionada ? '0 0 380px' : 1,
            overflow: 'hidden',
            transition: 'flex 0.2s ease',
          }}
        >
          {!selecionada ? (
            <>
              <Coluna
                titulo="Pendente"
                cor="#e2a944"
                conversas={inbox.pendente}
                selecionada={selecionada}
                onSelecionar={abrirConversa}
              />
              <Coluna
                titulo="Atendendo"
                cor="#4a9edd"
                conversas={inbox.atendendo}
                selecionada={selecionada}
                onSelecionar={abrirConversa}
              />
              <Coluna
                titulo="Resolvido"
                cor="#5cb85c"
                conversas={inbox.resolvido}
                selecionada={selecionada}
                onSelecionar={abrirConversa}
              />
            </>
          ) : (
            // Quando painel está aberto: lista única com todas as conversas + filtro visual
            <ColunaCompacta
              inbox={inbox}
              selecionada={selecionada}
              onSelecionar={abrirConversa}
              onFechar={() => setSelecionada(null)}
            />
          )}
        </div>

        {/* Painel de chat */}
        {selecionada && conversaAtiva && (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              background: 'var(--superficie)',
              border: '1px solid var(--borda)',
              borderRadius: 14,
              overflow: 'hidden',
              minWidth: 0,
            }}
          >
            {/* Header do chat */}
            <div
              style={{
                padding: '14px 18px',
                borderBottom: '1px solid var(--borda)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: 'var(--preto-fumaca)',
                    border: '1px solid var(--borda)',
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: 16,
                    fontWeight: 700,
                    color: 'var(--laranja-fagulha)',
                  }}
                >
                  {(conversaAtiva.cliente?.nomeFantasia ?? conversaAtiva.waTelefone ?? '?').charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--texto)' }}>
                    {conversaAtiva.cliente?.nomeFantasia ?? 'Número avulso'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--texto-fraco)' }}>
                    {conversaAtiva.waTelefone ?? 'sem número'} ·{' '}
                    <BadgeStatus status={conversaAtiva.status} />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                {conversaAtiva.status === 'PENDENTE' && (
                  <BotaoPrimario onClick={aceitar}>Aceitar</BotaoPrimario>
                )}
                {conversaAtiva.status === 'ATENDENDO' && (
                  <BotaoSecundario onClick={resolver} estilo="verde">
                    Resolver
                  </BotaoSecundario>
                )}
                {conversaAtiva.status === 'RESOLVIDO' && (
                  <BotaoSecundario onClick={reabrir}>Reabrir</BotaoSecundario>
                )}
                <button
                  onClick={() => setSelecionada(null)}
                  style={{
                    background: 'none',
                    border: '1px solid var(--borda)',
                    borderRadius: 8,
                    padding: '6px 10px',
                    color: 'var(--texto-suave)',
                    cursor: 'pointer',
                    fontSize: 12,
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Mensagens */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '16px 18px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              {carregandoDetalhe ? (
                <div style={{ color: 'var(--texto-fraco)', fontSize: 13, textAlign: 'center', marginTop: 40 }}>
                  Carregando mensagens…
                </div>
              ) : detalhe?.mensagens.length === 0 ? (
                <div style={{ color: 'var(--texto-fraco)', fontSize: 13, textAlign: 'center', marginTop: 40 }}>
                  Nenhuma mensagem ainda.
                </div>
              ) : (
                detalhe?.mensagens.map((msg) => (
                  <BubbleMensagem key={msg.id} mensagem={msg} />
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Compositor */}
            <form
              onSubmit={enviarMensagem}
              style={{
                padding: '12px 14px',
                borderTop: '1px solid var(--borda)',
                display: 'flex',
                gap: 8,
                flexShrink: 0,
              }}
            >
              <input
                type="text"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder={
                  conversaAtiva.status === 'RESOLVIDO'
                    ? 'Conversa resolvida. Reabra para responder.'
                    : 'Digite uma mensagem…'
                }
                disabled={conversaAtiva.status === 'RESOLVIDO' || enviando}
                style={{
                  flex: 1,
                  background: 'var(--preto-fumaca)',
                  border: '1px solid var(--borda-forte)',
                  borderRadius: 10,
                  padding: '10px 14px',
                  color: 'var(--texto)',
                  fontSize: 14,
                  outline: 'none',
                  opacity: conversaAtiva.status === 'RESOLVIDO' ? 0.5 : 1,
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--amarelo-fagulha)';
                  e.currentTarget.style.boxShadow = '0 0 0 2px var(--foco)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--borda-forte)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
              <button
                type="submit"
                disabled={!texto.trim() || enviando || conversaAtiva.status === 'RESOLVIDO'}
                className="brk-gradient-bg"
                style={{
                  border: 'none',
                  borderRadius: 10,
                  padding: '10px 18px',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: 'pointer',
                  opacity: (!texto.trim() || enviando || conversaAtiva.status === 'RESOLVIDO') ? 0.5 : 1,
                }}
              >
                {enviando ? '…' : 'Enviar'}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Modal nova conversa */}
      {modalNova && (
        <Overlay onClose={() => setModalNova(false)}>
          <form
            onSubmit={criarConversa}
            style={{
              background: 'var(--superficie)',
              border: '1px solid var(--borda)',
              borderRadius: 16,
              padding: 28,
              width: 420,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: 'var(--texto)' }}>
              Nova conversa
            </h2>

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

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
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
          <form
            onSubmit={salvarConfig}
            style={{
              background: 'var(--superficie)',
              border: '1px solid var(--borda)',
              borderRadius: 16,
              padding: 28,
              width: 460,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: 'var(--texto)' }}>
                Configuração WhatsApp
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--texto-suave)' }}>
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
                style={{ width: 16, height: 16, accentColor: 'var(--laranja-fagulha)' }}
              />
              <span style={{ fontSize: 13, color: 'var(--texto-suave)', fontWeight: 600 }}>
                Canal ativo (envia mensagens pela Meta API)
              </span>
            </label>

            <div
              style={{
                background: 'rgba(255,200,0,0.06)',
                border: '1px solid rgba(255,200,0,0.2)',
                borderRadius: 8,
                padding: '10px 14px',
                fontSize: 12,
                color: 'var(--texto-suave)',
              }}
            >
              URL do webhook a registrar na Meta:
              <br />
              <code style={{ color: 'var(--amarelo-fagulha)', wordBreak: 'break-all' }}>
                {window.location.origin.replace('breakr.vai-sistema.com', 'breakr-api.up.railway.app')}/atendimento/webhooks/meta
              </code>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
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

// ─── Coluna Kanban ───────────────────────────────────────────────────────────

function Coluna({
  titulo,
  cor,
  conversas,
  selecionada,
  onSelecionar,
}: {
  titulo: string;
  cor: string;
  conversas: Conversa[];
  selecionada: string | null;
  onSelecionar: (id: string) => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--superficie)',
        border: '1px solid var(--borda)',
        borderRadius: 14,
        overflow: 'hidden',
      }}
    >
      {/* Header da coluna */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--borda)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: cor,
            flexShrink: 0,
          }}
        />
        <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--texto)' }}>{titulo}</span>
        <span
          style={{
            marginLeft: 'auto',
            background: 'var(--preto-fumaca)',
            border: '1px solid var(--borda)',
            borderRadius: 99,
            padding: '1px 8px',
            fontSize: 11,
            color: 'var(--texto-suave)',
            fontWeight: 700,
          }}
        >
          {conversas.length}
        </span>
      </div>

      {/* Cards */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {conversas.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              color: 'var(--texto-fraco)',
              fontSize: 12,
              padding: '32px 12px',
            }}
          >
            Nenhuma conversa
          </div>
        ) : (
          conversas.map((c) => (
            <CardConversa
              key={c.id}
              conversa={c}
              ativa={selecionada === c.id}
              onClick={() => onSelecionar(c.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

// Coluna compacta (lista única) quando painel está aberto
function ColunaCompacta({
  inbox,
  selecionada,
  onSelecionar,
  onFechar,
}: {
  inbox: InboxData;
  selecionada: string | null;
  onSelecionar: (id: string) => void;
  onFechar: () => void;
}) {
  const [filtro, setFiltro] = useState<Status | 'TODAS'>('TODAS');
  const todas = [...inbox.pendente, ...inbox.atendendo, ...inbox.resolvido];
  const filtradas = filtro === 'TODAS' ? todas : todas.filter((c) => c.status === filtro);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--superficie)',
        border: '1px solid var(--borda)',
        borderRadius: 14,
        overflow: 'hidden',
        height: '100%',
      }}
    >
      <div
        style={{
          padding: '10px 12px',
          borderBottom: '1px solid var(--borda)',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--texto)' }}>Conversas</span>
          <button
            onClick={onFechar}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--texto-fraco)',
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            ✕
          </button>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {(['TODAS', 'PENDENTE', 'ATENDENDO', 'RESOLVIDO'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFiltro(s)}
              style={{
                flex: 1,
                background: filtro === s ? 'var(--laranja-fagulha)' : 'var(--preto-fumaca)',
                border: '1px solid var(--borda)',
                borderRadius: 6,
                padding: '4px 0',
                color: filtro === s ? '#fff' : 'var(--texto-suave)',
                fontSize: 10,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {s === 'TODAS' ? 'Todas' : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {filtradas.map((c) => (
          <CardConversa
            key={c.id}
            conversa={c}
            ativa={selecionada === c.id}
            onClick={() => onSelecionar(c.id)}
            compacto
          />
        ))}
      </div>
    </div>
  );
}

// ─── Card de conversa ────────────────────────────────────────────────────────

function CardConversa({
  conversa,
  ativa,
  onClick,
  compacto = false,
}: {
  conversa: Conversa;
  ativa: boolean;
  onClick: () => void;
  compacto?: boolean;
}) {
  const ultimaMsg = conversa.mensagens[0];

  return (
    <button
      onClick={onClick}
      style={{
        background: ativa ? 'rgba(202,63,23,0.12)' : 'var(--preto-fumaca)',
        border: `1px solid ${ativa ? 'var(--laranja-fagulha)' : 'var(--borda)'}`,
        borderRadius: 10,
        padding: compacto ? '10px 12px' : '12px 14px',
        textAlign: 'left',
        cursor: 'pointer',
        width: '100%',
        transition: 'background 0.15s, border-color 0.15s',
      }}
      onMouseEnter={(e) => {
        if (!ativa) e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
      }}
      onMouseLeave={(e) => {
        if (!ativa) e.currentTarget.style.background = 'var(--preto-fumaca)';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <span
          style={{
            fontSize: compacto ? 13 : 14,
            fontWeight: 700,
            color: 'var(--texto)',
            lineHeight: 1.3,
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {conversa.cliente?.nomeFantasia ?? conversa.waTelefone ?? 'Número avulso'}
        </span>
        <span style={{ fontSize: 11, color: 'var(--texto-fraco)', flexShrink: 0 }}>
          {tempoRelativo(conversa.ultimaMsgEm ?? conversa.criadoEm)}
        </span>
      </div>

      {conversa.waTelefone && !conversa.cliente && (
        <div style={{ fontSize: 11, color: 'var(--texto-fraco)', marginTop: 2 }}>
          {conversa.waTelefone}
        </div>
      )}

      {!compacto && (
        <div
          style={{
            fontSize: 12,
            color: 'var(--texto-suave)',
            marginTop: 5,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {ultimaMsg
            ? `${ultimaMsg.autor === 'ATENDENTE' ? 'Você: ' : ''}${ultimaMsg.texto ?? '[mídia]'}`
            : conversa.assunto ?? 'Conversa iniciada'}
        </div>
      )}

      {compacto && (
        <div style={{ marginTop: 4 }}>
          <BadgeStatus status={conversa.status} />
        </div>
      )}
    </button>
  );
}

// ─── Bubble de mensagem ──────────────────────────────────────────────────────

function BubbleMensagem({ mensagem }: { mensagem: Mensagem }) {
  const isOutbound = mensagem.direcao === 'outbound';
  const isSistema = mensagem.autor === 'SISTEMA';

  if (isSistema) {
    return (
      <div style={{ textAlign: 'center' }}>
        <span
          style={{
            display: 'inline-block',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid var(--borda)',
            borderRadius: 99,
            padding: '3px 12px',
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
    <div
      style={{
        display: 'flex',
        justifyContent: isOutbound ? 'flex-end' : 'flex-start',
      }}
    >
      <div
        style={{
          maxWidth: '72%',
          background: isOutbound ? 'var(--laranja-fagulha)' : 'var(--preto-fumaca)',
          border: `1px solid ${isOutbound ? 'transparent' : 'var(--borda)'}`,
          borderRadius: isOutbound ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
          padding: '8px 12px',
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 13.5,
            color: isOutbound ? '#fff' : 'var(--texto)',
            lineHeight: 1.45,
            wordBreak: 'break-word',
          }}
        >
          {mensagem.texto ?? '[mídia não suportada]'}
        </p>
        <p
          style={{
            margin: '4px 0 0',
            fontSize: 10.5,
            color: isOutbound ? 'rgba(255,255,255,0.65)' : 'var(--texto-fraco)',
            textAlign: 'right',
          }}
        >
          {formatarHora(mensagem.criadoEm)}
        </p>
      </div>
    </div>
  );
}

// ─── Badge de status ─────────────────────────────────────────────────────────

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
        border: `1px solid ${cor}33`,
        borderRadius: 99,
        padding: '1px 8px',
        fontSize: 11,
        fontWeight: 700,
        color: cor,
      }}
    >
      {label}
    </span>
  );
}

// ─── Primitivas UI ────────────────────────────────────────────────────────────

const estiloInput: React.CSSProperties = {
  background: 'var(--preto-fumaca)',
  border: '1px solid var(--borda-forte)',
  borderRadius: 10,
  padding: '11px 14px',
  color: 'var(--texto)',
  fontSize: 14,
  width: '100%',
  outline: 'none',
  boxSizing: 'border-box',
};

function CampoForm({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--texto-suave)' }}>{rotulo}</span>
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
        opacity: disabled ? 0.6 : 1,
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
        background: estilo === 'verde' ? 'rgba(92,184,92,0.12)' : 'var(--preto-fumaca)',
        border: `1px solid ${estilo === 'verde' ? '#5cb85c55' : 'var(--borda)'}`,
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

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'grid',
        placeItems: 'center',
        zIndex: 200,
        backdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}

function EstadoCarregando() {
  return (
    <div style={{ display: 'grid', placeItems: 'center', height: 300, color: 'var(--texto-fraco)', fontSize: 14 }}>
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
          background: 'var(--preto-fumaca)',
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
