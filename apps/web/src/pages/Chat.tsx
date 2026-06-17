import { useEffect, useRef, useState, useCallback } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { EstadoCarregando } from '../components/primitivos';

interface Canal { id: string; nome: string; descricao?: string | null }
interface Mensagem {
  id: string;
  conteudo: string;
  criadoEm: string;
  autor?: { id: string; nome: string } | null;
}

function IcoSend() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}
function IcoHash() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="9" x2="20" y2="9" /><line x1="4" y1="15" x2="20" y2="15" />
      <line x1="10" y1="3" x2="8" y2="21" /><line x1="16" y1="3" x2="14" y2="21" />
    </svg>
  );
}

function formatarHora(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatarData(iso: string) {
  const d = new Date(iso);
  const hoje = new Date();
  const ontem = new Date(hoje); ontem.setDate(ontem.getDate() - 1);
  if (d.toDateString() === hoje.toDateString()) return 'Hoje';
  if (d.toDateString() === ontem.toDateString()) return 'Ontem';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
}

function agruparPorData(msgs: Mensagem[]) {
  const grupos: { data: string; msgs: Mensagem[] }[] = [];
  msgs.forEach((m) => {
    const data = formatarData(m.criadoEm);
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.data === data) ultimo.msgs.push(m);
    else grupos.push({ data, msgs: [m] });
  });
  return grupos;
}

export function Chat() {
  useAuth();
  const [canais, setCanais] = useState<Canal[]>([]);
  const [canalAtivo, setCanalAtivo] = useState<Canal | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [carregandoCanais, setCarregandoCanais] = useState(true);
  const [carregandoMsgs, setCarregandoMsgs] = useState(false);
  const msgsEndRef = useRef<HTMLDivElement>(null);
  // Guarda o `criadoEm` da ultima mensagem recebida (usado como cursor ?depois=).
  const ultimoTsRef = useRef<string | null>(null);
  // Id do canal atualmente ativo — usado para descartar respostas em voo de um
  // canal anterior quando o usuario troca de canal (race).
  const canalIdRef = useRef<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    api.get<Canal[]>('/chat/canais').then(({ data }) => {
      setCanais(data ?? []);
      if (data?.length) setCanalAtivo(data[0]);
    }).finally(() => setCarregandoCanais(false));
  }, []);

  const carregarMensagens = useCallback(async (canal: Canal, inicial = false) => {
    if (inicial) setCarregandoMsgs(true);
    try {
      const params = !inicial && ultimoTsRef.current
        ? `?depois=${encodeURIComponent(ultimoTsRef.current)}`
        : '';
      const { data } = await api.get<Mensagem[]>(`/chat/canais/${canal.id}/mensagens${params}`);
      // Descarta se o usuario ja trocou de canal enquanto esta resposta vinha.
      if (canalIdRef.current !== canal.id) return;
      if (!data?.length) return;
      setMensagens((prev) => {
        if (inicial) return data;
        const novos = data.filter((m) => !prev.some((p) => p.id === m.id));
        return novos.length ? [...prev, ...novos] : prev;
      });
      ultimoTsRef.current = data[data.length - 1].criadoEm;
    } finally {
      if (inicial) setCarregandoMsgs(false);
    }
  }, []);

  useEffect(() => {
    if (!canalAtivo) return;
    canalIdRef.current = canalAtivo.id;
    ultimoTsRef.current = null;
    setMensagens([]);
    carregarMensagens(canalAtivo, true);
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(() => carregarMensagens(canalAtivo), 3000);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [canalAtivo, carregarMensagens]);

  useEffect(() => {
    msgsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens]);

  async function enviar() {
    if (!texto.trim() || !canalAtivo || enviando) return;
    setEnviando(true);
    const conteudo = texto.trim();
    setTexto('');
    try {
      const { data } = await api.post<Mensagem>(`/chat/canais/${canalAtivo.id}/mensagens`, { conteudo });
      setMensagens((prev) => [...prev, data]);
      ultimoTsRef.current = data.criadoEm;
    } finally {
      setEnviando(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); }
  }

  const grupos = agruparPorData(mensagens);

  return (
    <div className="brk-chat-fullbleed">
      {/* Painel de canais */}
      <aside className="brk-chat-canais">
        <div className="brk-chat-canais-header">Canais</div>
        {carregandoCanais ? (
          <div style={{ padding: 16 }}><EstadoCarregando /></div>
        ) : (
          canais.map((c) => (
            <button
              key={c.id}
              className={`brk-chat-canal-item${canalAtivo?.id === c.id ? ' ativo' : ''}`}
              onClick={() => setCanalAtivo(c)}
            >
              <span className="brk-chat-canal-hash"><IcoHash /></span>
              {c.nome}
            </button>
          ))
        )}
      </aside>

      {/* Área de mensagens */}
      <div className="brk-chat-area">
        {!canalAtivo ? (
          <div className="brk-chat-sem-canal">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--texto-fraco)' }}>
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <p className="brk-chat-sem-canal-titulo">Selecione um canal</p>
            <p className="brk-chat-sem-canal-sub">Escolha um canal à esquerda para começar</p>
          </div>
        ) : (
          <>
            <div className="brk-chat-area-header">
              <span className="brk-chat-area-hash">#</span>
              <span className="brk-chat-area-nome">{canalAtivo.nome}</span>
              {canalAtivo.descricao && (
                <span className="brk-chat-area-desc">— {canalAtivo.descricao}</span>
              )}
            </div>

            <div className="brk-chat-msgs">
              {carregandoMsgs ? (
                <EstadoCarregando />
              ) : mensagens.length === 0 ? (
                <div className="brk-chat-vazio">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  <span>Nenhuma mensagem ainda. Seja o primeiro a escrever!</span>
                </div>
              ) : (
                grupos.map((g) => (
                  <div key={g.data}>
                    <div className="brk-chat-group-date">{g.data}</div>
                    {g.msgs.map((m) => (
                      <div key={m.id} className="brk-chat-msg">
                        <div className="brk-chat-msg-avatar">
                          {(m.autor?.nome ?? 'U').charAt(0).toUpperCase()}
                        </div>
                        <div className="brk-chat-msg-corpo">
                          <div className="brk-chat-msg-meta">
                            <span className="brk-chat-msg-autor">{m.autor?.nome ?? 'Usuário'}</span>
                            <span className="brk-chat-msg-hora">{formatarHora(m.criadoEm)}</span>
                          </div>
                          <div className="brk-chat-msg-texto">{m.conteudo}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))
              )}
              <div ref={msgsEndRef} />
            </div>

            <div className="brk-chat-input-bar">
              <textarea
                className="brk-chat-input"
                placeholder={`Mensagem em #${canalAtivo.nome}`}
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                onKeyDown={onKeyDown}
                disabled={enviando}
                rows={1}
              />
              <button className="brk-chat-send" onClick={enviar} disabled={!texto.trim() || enviando}>
                <IcoSend />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
