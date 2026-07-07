/**
 * Atendimento — aba "VAI CRM" (integração externa).
 *
 * ADITIVO: componente próprio, renderizado pela página Atendimento quando a aba
 * "VAI CRM" está ativa. NÃO altera o inbox local (Meta) nem sua lógica.
 * Consome os endpoints do backend em /atendimento/crm/* (que falam com a API
 * externa https://api.vaicrm.com.br).
 */
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { api } from '../lib/api';

// ─── Tipos (mínimos do que a VAI CRM devolve) ─────────────────────────────────

interface CrmContato {
  name?: string | null;
  phone?: string | null;
  profilePicture?: string | null;
}

interface CrmChat {
  id: string;
  name?: string | null;
  status?: string | null;
  category?: string | null;
  unread?: number | null;
  channel?: string | null;
  lastMessagePreview?: string | null;
  lastMessage?: string | null;
  lastActivityAt?: string | null;
  createdAt?: string | null;
  contact?: CrmContato | null;
}

interface CrmChatsResp {
  data?: CrmChat[];
  total?: number;
}

interface CrmMensagem {
  id: string;
  content?: string | null;
  type?: string | null;
  sender?: string | null;
  isOwn?: boolean | null;
  isNote?: boolean | null;
  timestamp?: string | null;
  createdAt?: string | null;
}

interface CrmMsgsResp {
  data?: CrmMensagem[];
}

interface CrmStatus {
  configurado: boolean;
  metodo: string | null;
  baseUrl: string;
}

type TabCrm = 'ABERTOS' | 'ENCERRADOS';

// ─── Utilitários ──────────────────────────────────────────────────────────────

function tempoRelativo(iso?: string | null): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function formatarHora(iso?: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
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

function nomeChat(c: CrmChat): string {
  return c.name || c.contact?.name || c.contact?.phone || 'Contato';
}

function preview(c: CrmChat): string {
  const p = c.lastMessagePreview || c.lastMessage || '';
  return p ? p.replace(/\n/g, ' ').slice(0, 80) : 'Conversa';
}

function statusAberto(c: CrmChat): boolean {
  const s = (c.status || '').toLowerCase();
  return s !== 'closed' && s !== 'resolved';
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function AtendimentoVaiCrm({ onVoltar }: { onVoltar: () => void }) {
  const [status, setStatus] = useState<CrmStatus | null>(null);
  const [carregandoStatus, setCarregandoStatus] = useState(true);
  const [chats, setChats] = useState<CrmChat[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [tab, setTab] = useState<TabCrm>('ABERTOS');
  const [busca, setBusca] = useState('');
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [mensagens, setMensagens] = useState<CrmMensagem[]>([]);
  const [carregandoMsgs, setCarregandoMsgs] = useState(false);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [acaoErro, setAcaoErro] = useState<string | null>(null);

  const fimRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Status da integração (uma vez).
  useEffect(() => {
    api
      .get<CrmStatus>('/atendimento/crm/status')
      .then(({ data }) => setStatus(data))
      .catch(() => setStatus({ configurado: false, metodo: null, baseUrl: '' }))
      .finally(() => setCarregandoStatus(false));
  }, []);

  async function carregarChats() {
    try {
      const res = await api.get<CrmChatsResp>('/atendimento/crm/chats', {
        params: { limit: 50 },
      });
      setChats(res.data?.data ?? []);
      setErro(null);
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setErro(msg ?? 'Falha ao carregar conversas do VAI CRM.');
    } finally {
      setCarregando(false);
    }
  }

  // Polling da lista quando configurado.
  useEffect(() => {
    if (carregandoStatus) return;
    if (!status?.configurado) {
      setCarregando(false);
      return;
    }
    carregarChats();
    pollRef.current = setInterval(carregarChats, 6000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carregandoStatus, status?.configurado]);

  // Mensagens do chat selecionado (com polling).
  useEffect(() => {
    if (!selecionado) {
      setMensagens([]);
      return;
    }
    const id = selecionado;
    let ativo = true;
    async function carregar(comLoading: boolean) {
      if (comLoading) setCarregandoMsgs(true);
      try {
        const res = await api.get<CrmMsgsResp>(`/atendimento/crm/chats/${id}/messages`, {
          params: { limit: 100 },
        });
        if (ativo) setMensagens(res.data?.data ?? []);
      } catch {
        /* silencia — mantém o que já tinha */
      } finally {
        if (ativo && comLoading) setCarregandoMsgs(false);
      }
    }
    carregar(true);
    const t = setInterval(() => carregar(false), 6000);
    return () => {
      ativo = false;
      clearInterval(t);
    };
  }, [selecionado]);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens]);

  const chatSel = chats.find((c) => c.id === selecionado) ?? null;

  // Ordena mais antigas → mais novas para exibir na thread.
  const msgsOrdenadas = [...mensagens].sort((a, b) => {
    const ta = new Date(a.timestamp || a.createdAt || 0).getTime();
    const tb = new Date(b.timestamp || b.createdAt || 0).getTime();
    return ta - tb;
  });

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!selecionado || !texto.trim() || enviando) return;
    setEnviando(true);
    setAcaoErro(null);
    try {
      await api.post(`/atendimento/crm/chats/${selecionado}/messages`, { content: texto.trim() });
      setTexto('');
      const res = await api.get<CrmMsgsResp>(`/atendimento/crm/chats/${selecionado}/messages`, {
        params: { limit: 100 },
      });
      setMensagens(res.data?.data ?? []);
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setAcaoErro(msg ?? 'Não foi possível enviar a mensagem.');
    } finally {
      setEnviando(false);
    }
  }

  async function acao(caminho: string) {
    if (!selecionado) return;
    setAcaoErro(null);
    try {
      await api.post(`/atendimento/crm/chats/${selecionado}/${caminho}`);
      carregarChats();
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setAcaoErro(msg ?? 'Não foi possível concluir a ação.');
    }
  }

  const chatsTab = chats.filter((c) => (tab === 'ABERTOS' ? statusAberto(c) : !statusAberto(c)));
  const chatsFiltrados = busca.trim()
    ? chatsTab.filter((c) => {
        const q = busca.toLowerCase();
        return nomeChat(c).toLowerCase().includes(q) || (c.contact?.phone ?? '').includes(q);
      })
    : chatsTab;

  return (
    <div style={{ display: 'flex', margin: '-28px -32px', height: 'calc(100vh - 56px)', overflow: 'hidden' }}>
      {/* ── Painel esquerdo: lista ─────────────────────────────────────────── */}
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
        <div style={{ padding: '10px 12px 8px', borderBottom: '1px solid var(--borda)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'var(--texto)' }}>
                Atendimento · VAI CRM
              </h2>
              <p style={{ margin: '1px 0 0', fontSize: 10, color: 'var(--texto-fraco)' }}>
                Conversas sincronizadas do VAI CRM
              </p>
            </div>
            <button
              onClick={onVoltar}
              style={{
                background: 'var(--superficie-2)',
                border: '1px solid var(--borda)',
                borderRadius: 8,
                padding: '6px 10px',
                color: 'var(--texto-suave)',
                fontWeight: 700,
                fontSize: 11,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
              title="Voltar ao inbox"
            >
              ← Inbox
            </button>
          </div>

          {/* Busca */}
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
              padding: '6px 10px',
              color: 'var(--texto)',
              fontSize: 12,
              outline: 'none',
              boxSizing: 'border-box',
              marginBottom: 6,
            }}
          />

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4 }}>
            {([
              { key: 'ABERTOS' as TabCrm, label: 'Em atendimento' },
              { key: 'ENCERRADOS' as TabCrm, label: 'Encerrados' },
            ]).map((t) => {
              const ativa = tab === t.key;
              const count = chats.filter((c) => (t.key === 'ABERTOS' ? statusAberto(c) : !statusAberto(c))).length;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  style={{
                    flex: 1,
                    background: ativa ? 'rgba(255,255,255,0.14)' : 'transparent',
                    border: ativa ? '1px solid rgba(255,255,255,0.35)' : '1px solid var(--borda)',
                    borderRadius: 8,
                    padding: '5px 4px',
                    cursor: 'pointer',
                    color: ativa ? 'var(--laranja-brasa)' : 'var(--texto-suave)',
                    fontSize: 11,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 5,
                  }}
                >
                  {t.label}
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
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Lista */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
          {carregandoStatus || carregando ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--texto-fraco)', fontSize: 13 }}>
              Carregando…
            </div>
          ) : !status?.configurado ? (
            <PainelNaoConfigurado />
          ) : erro ? (
            <div style={{ textAlign: 'center', padding: '30px 20px', color: '#e07a5f', fontSize: 12.5 }}>
              {erro}
              <div style={{ marginTop: 10 }}>
                <button
                  onClick={() => {
                    setCarregando(true);
                    carregarChats();
                  }}
                  style={{
                    background: 'var(--superficie-2)',
                    border: '1px solid var(--borda)',
                    borderRadius: 8,
                    padding: '6px 12px',
                    color: 'var(--texto-suave)',
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  Tentar de novo
                </button>
              </div>
            </div>
          ) : chatsFiltrados.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--texto-fraco)', fontSize: 13 }}>
              {busca ? 'Nenhuma conversa encontrada.' : 'Nenhuma conversa aqui.'}
            </div>
          ) : (
            chatsFiltrados.map((c) => (
              <ItemChat key={c.id} chat={c} ativa={selecionado === c.id} onClick={() => setSelecionado(c.id)} />
            ))
          )}
        </div>
      </div>

      {/* ── Painel direito: chat ───────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {!chatSel ? (
          <EstadoVazio />
        ) : (
          <PainelChatCrm
            chat={chatSel}
            mensagens={msgsOrdenadas}
            carregando={carregandoMsgs}
            texto={texto}
            setTexto={setTexto}
            enviando={enviando}
            onEnviar={enviar}
            onIniciar={() => acao('start-service')}
            onEncerrar={() => acao('close')}
            onReabrir={() => acao('reopen')}
            acaoErro={acaoErro}
            fimRef={fimRef}
          />
        )}
      </div>
    </div>
  );
}

// ─── Item de chat ─────────────────────────────────────────────────────────────

function ItemChat({ chat: c, ativa, onClick }: { chat: CrmChat; ativa: boolean; onClick: () => void }) {
  const nome = nomeChat(c);
  const cor = corAvatar(nome);
  const ini = iniciais(nome);
  const unread = c.unread ?? 0;

  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        background: ativa ? 'rgba(255,255,255,0.1)' : 'transparent',
        border: 'none',
        borderLeft: `3px solid ${ativa ? 'var(--laranja-brasa)' : 'transparent'}`,
        padding: '8px 12px',
        textAlign: 'left',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
      }}
      onMouseEnter={(e) => { if (!ativa) e.currentTarget.style.background = 'var(--superficie-3)'; }}
      onMouseLeave={(e) => { if (!ativa) e.currentTarget.style.background = 'transparent'; }}
    >
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
          flexShrink: 0,
        }}
      >
        {ini}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
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
          <span style={{ fontSize: 10, color: 'var(--texto-fraco)', flexShrink: 0 }}>
            {tempoRelativo(c.lastActivityAt ?? c.createdAt)}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
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
            {preview(c)}
          </span>
          {unread > 0 && (
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
              {unread}
            </span>
          )}
        </div>
        {c.contact?.phone && (
          <div style={{ fontSize: 10, color: 'var(--texto-fraco)', marginTop: 2 }}>{c.contact.phone}</div>
        )}
      </div>
    </button>
  );
}

// ─── Painel de chat ───────────────────────────────────────────────────────────

function PainelChatCrm({
  chat,
  mensagens,
  carregando,
  texto,
  setTexto,
  enviando,
  onEnviar,
  onIniciar,
  onEncerrar,
  onReabrir,
  acaoErro,
  fimRef,
}: {
  chat: CrmChat;
  mensagens: CrmMensagem[];
  carregando: boolean;
  texto: string;
  setTexto: (v: string) => void;
  enviando: boolean;
  onEnviar: (e: FormEvent) => void;
  onIniciar: () => void;
  onEncerrar: () => void;
  onReabrir: () => void;
  acaoErro: string | null;
  fimRef: React.RefObject<HTMLDivElement>;
}) {
  const nome = nomeChat(chat);
  const cor = corAvatar(nome);
  const ini = iniciais(nome);
  const aberto = statusAberto(chat);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg)', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
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
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--texto)' }}>{nome}</div>
            <div style={{ fontSize: 11, color: 'var(--texto-fraco)' }}>
              {chat.contact?.phone ?? 'sem número'} · {aberto ? 'Aberto' : 'Encerrado'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {aberto ? (
            <>
              <BotaoSec onClick={onIniciar}>Iniciar</BotaoSec>
              <BotaoSec onClick={onEncerrar} verde>
                Encerrar
              </BotaoSec>
            </>
          ) : (
            <BotaoSec onClick={onReabrir}>Reabrir</BotaoSec>
          )}
        </div>
      </div>

      {acaoErro && (
        <div style={{ padding: '8px 20px', background: 'rgba(224,122,95,0.1)', color: '#e07a5f', fontSize: 12 }}>
          {acaoErro}
        </div>
      )}

      {/* Mensagens */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 6, background: 'var(--bg)' }}>
        {carregando ? (
          <div style={{ textAlign: 'center', color: 'var(--texto-fraco)', fontSize: 13, marginTop: 60 }}>
            Carregando mensagens…
          </div>
        ) : mensagens.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--texto-fraco)', fontSize: 13, marginTop: 60 }}>
            Nenhuma mensagem ainda.
          </div>
        ) : (
          mensagens.map((m) => <Bubble key={m.id} msg={m} />)
        )}
        <div ref={fimRef} />
      </div>

      {/* Compositor */}
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
          placeholder="Digite uma mensagem…"
          disabled={enviando}
          style={{
            flex: 1,
            background: 'var(--superficie-2)',
            border: '1px solid var(--borda)',
            borderRadius: 10,
            padding: '10px 14px',
            color: 'var(--texto)',
            fontSize: 14,
            outline: 'none',
          }}
        />
        <button
          type="submit"
          disabled={!texto.trim() || enviando}
          className="brk-gradient-bg"
          style={{
            border: 'none',
            borderRadius: 10,
            padding: '10px 20px',
            color: '#fff',
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer',
            opacity: !texto.trim() || enviando ? 0.45 : 1,
            whiteSpace: 'nowrap',
          }}
        >
          {enviando ? '…' : 'Enviar'}
        </button>
      </form>
    </div>
  );
}

function Bubble({ msg }: { msg: CrmMensagem }) {
  const isOwn = msg.isOwn ?? msg.sender === 'agent';
  if (msg.isNote) {
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
          {msg.content}
        </span>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', justifyContent: isOwn ? 'flex-end' : 'flex-start' }}>
      <div
        style={{
          maxWidth: '72%',
          background: isOwn ? 'linear-gradient(135deg, var(--laranja-brasa), var(--vermelho-fogo))' : 'var(--superficie-2)',
          color: isOwn ? '#fff' : 'var(--texto)',
          border: isOwn ? 'none' : '1px solid var(--borda)',
          borderRadius: 12,
          padding: '8px 12px',
          fontSize: 13.5,
          lineHeight: 1.5,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {msg.content || `[${msg.type ?? 'mídia'}]`}
        <div style={{ fontSize: 10, opacity: 0.7, marginTop: 3, textAlign: 'right' }}>
          {formatarHora(msg.timestamp ?? msg.createdAt)}
        </div>
      </div>
    </div>
  );
}

// ─── Auxiliares de UI ─────────────────────────────────────────────────────────

function BotaoSec({ children, onClick, verde }: { children: React.ReactNode; onClick: () => void; verde?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: verde ? 'rgba(39,165,103,0.14)' : 'var(--superficie-2)',
        border: `1px solid ${verde ? 'rgba(39,165,103,0.4)' : 'var(--borda)'}`,
        borderRadius: 8,
        padding: '7px 14px',
        color: verde ? '#27a567' : 'var(--texto-suave)',
        fontWeight: 700,
        fontSize: 12.5,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  );
}

function EstadoVazio() {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg)',
        gap: 14,
        padding: 40,
      }}
    >
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.07)',
          border: '1px solid rgba(255,255,255,0.14)',
          display: 'grid',
          placeItems: 'center',
          fontSize: 30,
        }}
      >
        💬
      </div>
      <div style={{ textAlign: 'center' }}>
        <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--texto)' }}>
          Selecione uma conversa
        </p>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--texto-fraco)' }}>
          Escolha uma conversa do VAI CRM na lista ao lado.
        </p>
      </div>
    </div>
  );
}

function PainelNaoConfigurado() {
  return (
    <div style={{ padding: '24px 18px', color: 'var(--texto-suave)' }}>
      <div
        style={{
          background: 'rgba(255,200,0,0.05)',
          border: '1px solid rgba(255,200,0,0.2)',
          borderRadius: 10,
          padding: '14px 16px',
          fontSize: 12.5,
          lineHeight: 1.6,
        }}
      >
        <p style={{ margin: '0 0 8px', fontWeight: 800, color: 'var(--texto)' }}>Integração VAI CRM não configurada</p>
        Defina no servidor (variáveis de ambiente da API) uma das opções:
        <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
          <li><code>VAICRM_API_TOKEN</code> (API Token permanente), <b>ou</b></li>
          <li><code>VAICRM_EMAIL</code> + <code>VAICRM_PASSWORD</code> (login).</li>
        </ul>
        <p style={{ margin: '8px 0 0' }}>
          Opcional: <code>VAICRM_API_URL</code> (padrão <code>https://api.vaicrm.com.br</code>).
        </p>
      </div>
    </div>
  );
}
