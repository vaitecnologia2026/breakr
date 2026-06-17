import { useEffect, useRef, useState, useCallback } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';

/**
 * Sininho de notificações do Breakr OS.
 *  - Contador de não-lidas (GET /notificacoes/nao-lidas).
 *  - Dropdown com a lista (GET /notificacoes) e ações de marcar como lida
 *    (PATCH /notificacoes/:id/lida) ou todas (PATCH /notificacoes/lidas).
 *  - Realtime: conecta no namespace `${VITE_API_URL}/notificacoes`, emite
 *    'identificar' com o usuarioId e ouve 'nova-notificacao' para inserir
 *    a notificação no topo, incrementar o contador e disparar um toast.
 */

type TipoNotificacao = 'INFO' | 'SUCESSO' | 'ALERTA' | 'ERRO' | string;

interface Notificacao {
  id: string;
  titulo: string;
  mensagem: string;
  tipo: TipoNotificacao;
  link: string | null;
  lida: boolean;
  criadoEm: string;
}

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

// Acento por tipo de notificação (barra lateral + ponto).
function corTipo(tipo: TipoNotificacao): string {
  switch (tipo) {
    case 'SUCESSO':
      return '#2ecc71';
    case 'ALERTA':
      return '#ff9406';
    case 'ERRO':
      return '#94122c';
    default:
      return '#ca3f17';
  }
}

export function NotificationBell() {
  const { usuario } = useAuth();
  const [aberto, setAberto] = useState(false);
  const [naoLidas, setNaoLidas] = useState(0);
  const [itens, setItens] = useState<Notificacao[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [toast, setToast] = useState<Notificacao | null>(null);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Contador de não-lidas (carrega ao montar) ---
  const carregarContador = useCallback(async () => {
    try {
      const { data } = await api.get<{ total: number }>('/notificacoes/nao-lidas');
      setNaoLidas(data.total ?? 0);
    } catch {
      /* silencioso: o sininho não deve quebrar o header */
    }
  }, []);

  useEffect(() => {
    carregarContador();
  }, [carregarContador]);

  // --- Lista completa (carrega ao abrir o dropdown) ---
  const carregarLista = useCallback(async () => {
    setCarregando(true);
    try {
      const { data } = await api.get<Notificacao[]>('/notificacoes');
      setItens(data);
    } catch {
      setItens([]);
    } finally {
      setCarregando(false);
    }
  }, []);

  function alternar() {
    const proximo = !aberto;
    setAberto(proximo);
    if (proximo) carregarLista();
  }

  // --- Realtime via socket.io ---
  useEffect(() => {
    if (!usuario?.id) return;

    const socket: Socket = io(`${API_URL}/notificacoes`, {
      transports: ['websocket'],
      withCredentials: true,
    });

    socket.on('connect', () => {
      socket.emit('identificar', usuario.id);
    });

    socket.on('nova-notificacao', (nova: Notificacao) => {
      setItens((prev) =>
        prev.some((n) => n.id === nova.id) ? prev : [nova, ...prev],
      );
      if (!nova.lida) setNaoLidas((n) => n + 1);
      dispararToast(nova);
    });

    return () => {
      socket.off('nova-notificacao');
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario?.id]);

  function dispararToast(n: Notificacao) {
    setToast(n);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 5000);
  }

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );

  // --- Fechar ao clicar fora / Esc ---
  useEffect(() => {
    if (!aberto) return;
    function onClickFora(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setAberto(false);
      }
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setAberto(false);
    }
    document.addEventListener('mousedown', onClickFora);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onClickFora);
      document.removeEventListener('keydown', onEsc);
    };
  }, [aberto]);

  // --- Ações ---
  async function marcarUma(id: string) {
    const alvo = itens.find((n) => n.id === id);
    setItens((prev) => prev.map((n) => (n.id === id ? { ...n, lida: true } : n)));
    if (alvo && !alvo.lida) setNaoLidas((n) => Math.max(0, n - 1));
    try {
      await api.patch(`/notificacoes/${id}/lida`);
    } catch {
      // Falhou: desfaz o estado otimista recarregando lista e contador.
      carregarLista();
      carregarContador();
    }
  }

  async function marcarTodas() {
    if (naoLidas === 0) return;
    setItens((prev) => prev.map((n) => ({ ...n, lida: true })));
    setNaoLidas(0);
    try {
      await api.patch('/notificacoes/lidas');
    } catch {
      // Falhou: desfaz o estado otimista recarregando lista e contador.
      carregarLista();
      carregarContador();
    }
  }

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={alternar}
        aria-label={`Notificações${naoLidas ? ` (${naoLidas} não lidas)` : ''}`}
        aria-expanded={aberto}
        style={{
          position: 'relative',
          width: 38,
          height: 38,
          display: 'grid',
          placeItems: 'center',
          borderRadius: 10,
          border: '1px solid var(--borda-forte)',
          background: aberto ? 'var(--superficie-3)' : 'transparent',
          color: 'var(--texto-suave)',
          transition: 'border-color 0.15s ease, background 0.15s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--laranja-brasa)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--borda-forte)';
        }}
      >
        <IconeSino />
        {naoLidas > 0 && (
          <span
            aria-hidden="true"
            className="brk-gradient-bg"
            style={{
              position: 'absolute',
              top: -5,
              right: -5,
              minWidth: 18,
              height: 18,
              padding: '0 5px',
              borderRadius: 999,
              display: 'grid',
              placeItems: 'center',
              fontSize: 10.5,
              fontWeight: 800,
              color: '#fff',
              border: '2px solid var(--preto-fumaca)',
            }}
          >
            {naoLidas > 99 ? '99+' : naoLidas}
          </span>
        )}
      </button>

      {aberto && (
        <Dropdown
          itens={itens}
          carregando={carregando}
          naoLidas={naoLidas}
          onMarcarUma={marcarUma}
          onMarcarTodas={marcarTodas}
        />
      )}

      {toast && <Toast notificacao={toast} onFechar={() => setToast(null)} />}
    </div>
  );
}

/* ---------------------------- Dropdown ---------------------------- */

function Dropdown({
  itens,
  carregando,
  naoLidas,
  onMarcarUma,
  onMarcarTodas,
}: {
  itens: Notificacao[];
  carregando: boolean;
  naoLidas: number;
  onMarcarUma: (id: string) => void;
  onMarcarTodas: () => void;
}) {
  return (
    <div
      role="menu"
      style={{
        position: 'absolute',
        top: 'calc(100% + 10px)',
        right: 0,
        width: 'min(380px, calc(100vw - 32px))',
        maxHeight: 460,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--superficie)',
        border: '1px solid var(--borda-forte)',
        borderRadius: 14,
        boxShadow: 'var(--sombra-card)',
        zIndex: 30,
        overflow: 'hidden',
        animation: 'brk-drop 0.16s ease',
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          padding: '14px 16px',
          borderBottom: '1px solid var(--borda)',
          background: 'var(--superficie-2)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 700 }}>Notificações</span>
          {naoLidas > 0 && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--amarelo-fagulha)',
                background: 'rgba(255, 148, 6, 0.14)',
                borderRadius: 999,
                padding: '1px 8px',
              }}
            >
              {naoLidas} nova{naoLidas === 1 ? '' : 's'}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onMarcarTodas}
          disabled={naoLidas === 0}
          style={{
            border: 'none',
            background: 'transparent',
            color: naoLidas === 0 ? 'var(--texto-fraco)' : 'var(--texto-suave)',
            fontSize: 12.5,
            fontWeight: 600,
            cursor: naoLidas === 0 ? 'default' : 'pointer',
            padding: 0,
          }}
        >
          Marcar todas
        </button>
      </header>

      <div style={{ overflowY: 'auto', flex: 1 }}>
        {carregando ? (
          <EstadoMini texto="Carregando…" />
        ) : itens.length === 0 ? (
          <EstadoMini texto="Você está em dia. Nenhuma notificação." />
        ) : (
          <ul>
            {itens.map((n) => (
              <ItemNotificacao key={n.id} n={n} onMarcar={onMarcarUma} />
            ))}
          </ul>
        )}
      </div>

      <style>{`@keyframes brk-drop { from { opacity: 0; transform: translateY(-6px) } to { opacity: 1; transform: translateY(0) } }`}</style>
    </div>
  );
}

function ItemNotificacao({
  n,
  onMarcar,
}: {
  n: Notificacao;
  onMarcar: (id: string) => void;
}) {
  const acento = corTipo(n.tipo);

  const conteudo = (
    <>
      <span
        aria-hidden="true"
        style={{
          width: 3,
          alignSelf: 'stretch',
          borderRadius: 999,
          flexShrink: 0,
          background: n.lida ? 'transparent' : acento,
        }}
      />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {!n.lida && (
            <span
              aria-hidden="true"
              style={{
                width: 7,
                height: 7,
                borderRadius: 999,
                flexShrink: 0,
                background: acento,
                boxShadow: `0 0 6px ${acento}`,
              }}
            />
          )}
          <span
            style={{
              fontSize: 13.5,
              fontWeight: n.lida ? 500 : 700,
              color: n.lida ? 'var(--texto-suave)' : 'var(--cinza-vapor)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {n.titulo}
          </span>
        </div>
        <p
          style={{
            fontSize: 12.5,
            color: 'var(--texto-fraco)',
            marginTop: 2,
            lineHeight: 1.45,
          }}
        >
          {n.mensagem}
        </p>
        <span style={{ fontSize: 11, color: 'var(--texto-fraco)' }}>
          {tempoRelativo(n.criadoEm)}
        </span>
      </div>
    </>
  );

  return (
    <li style={{ borderTop: '1px solid var(--borda)' }}>
      <div
        className="brk-row"
        style={{
          display: 'flex',
          gap: 10,
          padding: '12px 16px',
          background: n.lida ? 'transparent' : 'rgba(202, 63, 23, 0.05)',
        }}
      >
        {n.link ? (
          <a
            href={n.link}
            onClick={() => onMarcar(n.id)}
            style={{ display: 'flex', gap: 10, flex: 1, minWidth: 0 }}
          >
            {conteudo}
          </a>
        ) : (
          <div style={{ display: 'flex', gap: 10, flex: 1, minWidth: 0 }}>{conteudo}</div>
        )}

        {!n.lida && (
          <button
            type="button"
            onClick={() => onMarcar(n.id)}
            title="Marcar como lida"
            aria-label="Marcar como lida"
            style={{
              flexShrink: 0,
              alignSelf: 'flex-start',
              width: 22,
              height: 22,
              display: 'grid',
              placeItems: 'center',
              borderRadius: 6,
              border: '1px solid var(--borda-forte)',
              background: 'transparent',
              color: 'var(--texto-fraco)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--amarelo-fagulha)';
              e.currentTarget.style.borderColor = 'var(--amarelo-fagulha)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--texto-fraco)';
              e.currentTarget.style.borderColor = 'var(--borda-forte)';
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M5 13l4 4L19 7"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
      </div>
    </li>
  );
}

/* ------------------------------ Toast ----------------------------- */

function Toast({
  notificacao,
  onFechar,
}: {
  notificacao: Notificacao;
  onFechar: () => void;
}) {
  const acento = corTipo(notificacao.tipo);
  return (
    <div
      role="status"
      onClick={onFechar}
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 60,
        width: 'min(340px, calc(100vw - 32px))',
        display: 'flex',
        gap: 12,
        padding: '14px 16px',
        background: 'var(--superficie-2)',
        border: '1px solid var(--borda-forte)',
        borderLeft: `3px solid ${acento}`,
        borderRadius: 12,
        boxShadow: 'var(--sombra-card)',
        cursor: 'pointer',
        animation: 'brk-toast-in 0.22s ease',
      }}
    >
      <span style={{ flexShrink: 0, color: acento, marginTop: 1 }}>
        <IconeSino />
      </span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--cinza-vapor)' }}>
          {notificacao.titulo}
        </div>
        <p style={{ fontSize: 12.5, color: 'var(--texto-fraco)', marginTop: 2 }}>
          {notificacao.mensagem}
        </p>
      </div>
      <style>{`@keyframes brk-toast-in { from { opacity: 0; transform: translateY(12px) } to { opacity: 1; transform: translateY(0) } }`}</style>
    </div>
  );
}

/* ---------------------------- Auxiliares -------------------------- */

function EstadoMini({ texto }: { texto: string }) {
  return (
    <div
      style={{
        padding: '36px 20px',
        textAlign: 'center',
        fontSize: 13,
        color: 'var(--texto-fraco)',
      }}
    >
      {texto}
    </div>
  );
}

function IconeSino() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M18 8A6 6 0 1 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13.73 21a2 2 0 0 1-3.46 0"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Tempo relativo simples em pt-BR (agora, min, h, d) com fallback de data. */
function tempoRelativo(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const seg = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seg < 60) return 'agora';
  const min = Math.floor(seg / 60);
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  const dias = Math.floor(h / 24);
  if (dias < 7) return `há ${dias} d`;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}
