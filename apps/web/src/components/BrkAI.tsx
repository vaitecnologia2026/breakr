import { useState, useRef, useEffect } from 'react';
import { api } from '../lib/api';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Msg {
  id: string;
  role: 'user' | 'assistant';
  conteudo: string;
}

// ─── Sugestões rápidas ────────────────────────────────────────────────────────

const SUGESTOES = [
  'Quantos clientes ativos temos?',
  'Há cobranças vencidas?',
  'Conversas pendentes no atendimento?',
  'Como criar um novo contrato?',
];

// ─── Componente ───────────────────────────────────────────────────────────────

export function BrkAI() {
  const [aberto, setAberto] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [carregando, setCarregando] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll ao receber mensagem
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [msgs, carregando]);

  // Foca o input ao abrir
  useEffect(() => {
    if (aberto) setTimeout(() => inputRef.current?.focus(), 80);
  }, [aberto]);

  async function enviar(texto?: string) {
    const msg = (texto ?? input).trim();
    if (!msg || carregando) return;
    setInput('');

    const msgUser: Msg = { id: `${Date.now()}-u`, role: 'user', conteudo: msg };
    setMsgs((prev) => [...prev, msgUser]);
    setCarregando(true);

    try {
      const historico = msgs.map((m) => ({ role: m.role, conteudo: m.conteudo }));
      const { data } = await api.post<{ resposta: string }>('/config/ia/assistente', {
        mensagem: msg,
        historico,
      });
      setMsgs((prev) => [
        ...prev,
        { id: `${Date.now()}-a`, role: 'assistant', conteudo: data.resposta },
      ]);
    } catch {
      setMsgs((prev) => [
        ...prev,
        {
          id: `${Date.now()}-err`,
          role: 'assistant',
          conteudo: 'Erro ao conectar com a IA. Verifique a configuração do provedor em Configurações.',
        },
      ]);
    } finally {
      setCarregando(false);
    }
  }

  function limpar() { setMsgs([]); }

  return (
    <>
      {/* Painel de chat */}
      {aberto && (
        <div className="brk-ai-panel">
          {/* Header */}
          <div className="brk-ai-header">
            <div className="brk-ai-header-id">
              <span className="brk-ai-header-ico">⚡</span>
              <div>
                <div className="brk-ai-header-nome">BRK IA</div>
                <div className="brk-ai-header-sub">Assistente Operacional</div>
              </div>
            </div>
            <div className="brk-ai-header-acoes">
              {msgs.length > 0 && (
                <button className="brk-ai-btn-icon" onClick={limpar} title="Limpar conversa">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" />
                  </svg>
                </button>
              )}
              <button className="brk-ai-btn-icon" onClick={() => setAberto(false)} title="Fechar">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>

          {/* Mensagens */}
          <div className="brk-ai-msgs" ref={scrollRef}>
            {msgs.length === 0 ? (
              <div className="brk-ai-welcome">
                <div className="brk-ai-welcome-ico">⚡</div>
                <p className="brk-ai-welcome-titulo">Olá! Sou o BRK IA.</p>
                <p className="brk-ai-welcome-sub">Assistente operacional com acesso aos dados em tempo real do sistema. Como posso ajudar?</p>
                <div className="brk-ai-sugestoes">
                  {SUGESTOES.map((s) => (
                    <button key={s} className="brk-ai-sugestao" onClick={() => enviar(s)}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              msgs.map((m) => (
                <div key={m.id} className={`brk-ai-msg ${m.role}`}>
                  {m.role === 'assistant' && (
                    <span className="brk-ai-msg-avatar">⚡</span>
                  )}
                  <div className="brk-ai-msg-bubble">{m.conteudo}</div>
                </div>
              ))
            )}

            {carregando && (
              <div className="brk-ai-msg assistant">
                <span className="brk-ai-msg-avatar">⚡</span>
                <div className="brk-ai-msg-bubble brk-ai-typing">
                  <span /><span /><span />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="brk-ai-input-area">
            <input
              ref={inputRef}
              className="brk-ai-input"
              placeholder="Pergunte algo sobre o sistema…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); } }}
              disabled={carregando}
            />
            <button
              className="brk-ai-send"
              onClick={() => enviar()}
              disabled={!input.trim() || carregando}
              title="Enviar (Enter)"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Botão flutuante */}
      <button
        className={`brk-ai-fab${aberto ? ' open' : ''}`}
        onClick={() => setAberto((v) => !v)}
        title="BRK IA — Assistente Operacional"
        aria-label="Abrir BRK IA"
      >
        {aberto ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
        )}
      </button>
    </>
  );
}
