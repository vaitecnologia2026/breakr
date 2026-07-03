import { useEffect, useRef, useState, useCallback } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { EstadoCarregando } from '../components/primitivos';
import { comDemo } from '../lib/demo';

interface Canal { id: string; nome: string; descricao?: string | null }
interface Mensagem {
  id: string;
  conteudo: string;
  criadoEm: string;
  autor?: { id: string; nome: string } | null;
}

// Mensagens diretas 1:1 (DM) — B7.
interface Contato { id: string; nome: string; cargo: string; fotoUrl: string | null }
interface ConversaDm {
  parceiro: { id: string; nome: string; fotoUrl: string | null };
  ultima: string;
  ultimaEm: string;
  naoLidas: number;
}
interface MensagemDm {
  id: string;
  texto: string;
  criadoEm: string;
  deId: string;
  paraId: string;
  de?: { id: string; nome: string } | null;
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

// Agrupamento por data das mensagens diretas (DM) — B7.
function agruparPorDataDm(msgs: MensagemDm[]) {
  const grupos: { data: string; msgs: MensagemDm[] }[] = [];
  msgs.forEach((m) => {
    const data = formatarData(m.criadoEm);
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.data === data) ultimo.msgs.push(m);
    else grupos.push({ data, msgs: [m] });
  });
  return grupos;
}

const MOCK_CONTATOS: Contato[] = [
  { id: 'u4', nome: 'Marina Alves', cargo: 'CS', fotoUrl: null },
  { id: 'u6', nome: 'Leticia Dias', cargo: 'DESIGNER', fotoUrl: null },
  { id: 'u7', nome: 'Pedro Rocha', cargo: 'GESTOR_TRAFEGO', fotoUrl: null },
];
const MOCK_DM: MensagemDm[] = [
  { id: 'dm1', texto: 'Oi! Consegue revisar a arte do Brasa hoje?', criadoEm: '2026-06-17T09:00:00Z', deId: 'u4', paraId: 'me', de: { id: 'u4', nome: 'Marina Alves' } },
  { id: 'dm2', texto: 'Consigo sim, me manda o link.', criadoEm: '2026-06-17T09:05:00Z', deId: 'me', paraId: 'u4', de: { id: 'me', nome: 'Você' } },
];

const MOCK_CANAIS: Canal[] = [
  { id: 'ch1', nome: 'geral', descricao: 'Canal geral do time Breakr' },
  { id: 'ch2', nome: 'conteudo', descricao: 'Discussoes sobre conteudo e aprovacoes' },
  { id: 'ch3', nome: 'trafego', descricao: 'Campanhas e metricas de trafego pago' },
  { id: 'ch4', nome: 'comercial', descricao: 'Pipeline e leads do comercial' },
  { id: 'ch5', nome: 'cs-suporte', descricao: 'Atendimento ao cliente e suporte interno' },
];
const MOCK_MENSAGENS: Mensagem[] = [
  { id: 'msg1', conteudo: 'Bom dia time! Daily em 10 minutos.', criadoEm: '2026-06-17T08:50:00Z', autor: { id: 'u1', nome: 'Admin' } },
  { id: 'msg2', conteudo: 'Boa! Ja estou no meet.', criadoEm: '2026-06-17T08:52:00Z', autor: { id: 'u4', nome: 'Marina Alves' } },
  { id: 'msg3', conteudo: 'Lembrete: 4 pecas aguardando aprovacao do cliente Brasa Burger. Alguem ja fez followup?', criadoEm: '2026-06-17T10:15:00Z', autor: { id: 'u4', nome: 'Marina Alves' } },
  { id: 'msg4', conteudo: 'Ja mandei mensagem agora cedo, cliente disse que ve hoje a tarde.', criadoEm: '2026-06-17T10:18:00Z', autor: { id: 'u6', nome: 'Leticia Dias' } },
  { id: 'msg5', conteudo: 'Campanha de Rikai Sushi bateu 200 conversoes essa semana. ROAS de 4.2x, tudo certo!', criadoEm: '2026-06-17T11:30:00Z', autor: { id: 'u7', nome: 'Pedro Rocha' } },
  { id: 'msg6', conteudo: 'Otimo resultado! Vou atualizar o cliente la no portal.', criadoEm: '2026-06-17T11:35:00Z', autor: { id: 'u4', nome: 'Marina Alves' } },
];

export function Chat() {
  useAuth();
  const [modo, setModo] = useState<'canais' | 'diretas'>('canais');
  const [contatoAtivo, setContatoAtivo] = useState<Contato | null>(null);
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
      const canais = comDemo(data, MOCK_CANAIS);
      setCanais(canais);
      if (canais.length) setCanalAtivo(canais[0]);
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
      if (!data?.length && !inicial) return;
      const msgs = comDemo(data, inicial ? MOCK_MENSAGENS : []);
      if (!msgs.length) return;
      setMensagens((prev) => {
        if (inicial) return msgs;
        const novos = msgs.filter((m) => !prev.some((p) => p.id === m.id));
        return novos.length ? [...prev, ...novos] : prev;
      });
      ultimoTsRef.current = msgs[msgs.length - 1].criadoEm;
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
        <div className="brk-chat-canais-header" style={{ display: 'flex', gap: 6 }}>
          <button
            type="button"
            onClick={() => setModo('canais')}
            style={{ flex: 1, fontSize: 12.5, fontWeight: 700, padding: '6px 8px', borderRadius: 8, border: '1px solid var(--borda)', cursor: 'pointer', background: modo === 'canais' ? 'var(--superficie-3)' : 'transparent', color: modo === 'canais' ? 'var(--cinza-vapor)' : 'var(--texto-fraco)' }}
          >
            Canais
          </button>
          <button
            type="button"
            onClick={() => setModo('diretas')}
            style={{ flex: 1, fontSize: 12.5, fontWeight: 700, padding: '6px 8px', borderRadius: 8, border: '1px solid var(--borda)', cursor: 'pointer', background: modo === 'diretas' ? 'var(--superficie-3)' : 'transparent', color: modo === 'diretas' ? 'var(--cinza-vapor)' : 'var(--texto-fraco)' }}
          >
            Diretas
          </button>
        </div>
        {modo === 'diretas' ? (
          <ListaContatos contatoAtivo={contatoAtivo} aoSelecionar={setContatoAtivo} />
        ) : carregandoCanais ? (
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
        {modo === 'diretas' ? (
          <PainelDireta contato={contatoAtivo} />
        ) : !canalAtivo ? (
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

// Lista de colegas para conversa direta (com badge de não lidas) — B7.
function ListaContatos({
  contatoAtivo,
  aoSelecionar,
}: {
  contatoAtivo: Contato | null;
  aoSelecionar: (c: Contato) => void;
}) {
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [conversas, setConversas] = useState<ConversaDm[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<Contato[]>('/chat/dm/contatos').then(({ data }) => data).catch(() => [] as Contato[]),
      api.get<ConversaDm[]>('/chat/dm/conversas').then(({ data }) => data).catch(() => [] as ConversaDm[]),
    ]).then(([cts, cvs]) => {
      setContatos(comDemo(cts, MOCK_CONTATOS));
      setConversas(cvs ?? []);
    }).finally(() => setCarregando(false));
  }, []);

  if (carregando) return <div style={{ padding: 16 }}><EstadoCarregando /></div>;

  const naoLidasPorId = new Map(conversas.map((c) => [c.parceiro.id, c.naoLidas]));
  const ordemConversa = new Map(conversas.map((c, i) => [c.parceiro.id, i]));
  const ordenados = [...contatos].sort((a, b) => {
    const ia = ordemConversa.has(a.id) ? (ordemConversa.get(a.id) as number) : Infinity;
    const ib = ordemConversa.has(b.id) ? (ordemConversa.get(b.id) as number) : Infinity;
    if (ia !== ib) return ia - ib;
    return a.nome.localeCompare(b.nome);
  });

  if (ordenados.length === 0) {
    return <div style={{ padding: 16, fontSize: 13, color: 'var(--texto-fraco)' }}>Nenhum colega disponível.</div>;
  }

  return (
    <>
      {ordenados.map((c) => {
        const naoLidas = naoLidasPorId.get(c.id) ?? 0;
        return (
          <button
            key={c.id}
            className={`brk-chat-canal-item${contatoAtivo?.id === c.id ? ' ativo' : ''}`}
            onClick={() => aoSelecionar(c)}
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <span className="brk-chat-msg-avatar" style={{ width: 22, height: 22, fontSize: 11, flexShrink: 0 }}>
              {c.nome.charAt(0).toUpperCase()}
            </span>
            <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nome}</span>
            {naoLidas > 0 && (
              <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: 'var(--vermelho, #ef4444)', borderRadius: 999, padding: '1px 7px', flexShrink: 0 }}>{naoLidas}</span>
            )}
          </button>
        );
      })}
    </>
  );
}

// Thread de conversa direta 1:1 (mesma estética dos canais, com polling) — B7.
function PainelDireta({ contato }: { contato: Contato | null }) {
  const [mensagens, setMensagens] = useState<MensagemDm[]>([]);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const ultimoTsRef = useRef<string | null>(null);
  const contatoIdRef = useRef<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const carregar = useCallback(async (c: Contato, inicial = false) => {
    if (inicial) setCarregando(true);
    try {
      const params = !inicial && ultimoTsRef.current
        ? `?depois=${encodeURIComponent(ultimoTsRef.current)}`
        : '';
      const { data } = await api.get<MensagemDm[]>(`/chat/dm/${c.id}/mensagens${params}`);
      if (contatoIdRef.current !== c.id) return;
      const msgs = comDemo(data, inicial ? MOCK_DM : []);
      if (!msgs.length) return;
      setMensagens((prev) => {
        if (inicial) return msgs;
        const novos = msgs.filter((m) => !prev.some((p) => p.id === m.id));
        return novos.length ? [...prev, ...novos] : prev;
      });
      ultimoTsRef.current = msgs[msgs.length - 1].criadoEm;
    } finally {
      if (inicial) setCarregando(false);
    }
  }, []);

  useEffect(() => {
    if (!contato) return;
    contatoIdRef.current = contato.id;
    ultimoTsRef.current = null;
    setMensagens([]);
    carregar(contato, true);
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(() => carregar(contato), 3000);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [contato, carregar]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens]);

  async function enviar() {
    if (!texto.trim() || !contato || enviando) return;
    setEnviando(true);
    const t = texto.trim();
    setTexto('');
    try {
      const { data } = await api.post<MensagemDm>(`/chat/dm/${contato.id}/mensagens`, { texto: t });
      setMensagens((prev) => [...prev, data]);
      ultimoTsRef.current = data.criadoEm;
    } finally {
      setEnviando(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); }
  }

  if (!contato) {
    return (
      <div className="brk-chat-sem-canal">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--texto-fraco)' }}>
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        <p className="brk-chat-sem-canal-titulo">Selecione um colega</p>
        <p className="brk-chat-sem-canal-sub">Escolha alguém à esquerda para conversar em privado</p>
      </div>
    );
  }

  const grupos = agruparPorDataDm(mensagens);

  return (
    <>
      <div className="brk-chat-area-header">
        <span className="brk-chat-area-nome">{contato.nome}</span>
        <span className="brk-chat-area-desc">— conversa direta</span>
      </div>

      <div className="brk-chat-msgs">
        {carregando ? (
          <EstadoCarregando />
        ) : mensagens.length === 0 ? (
          <div className="brk-chat-vazio">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span>Nenhuma mensagem ainda. Diga olá!</span>
          </div>
        ) : (
          grupos.map((g) => (
            <div key={g.data}>
              <div className="brk-chat-group-date">{g.data}</div>
              {g.msgs.map((m) => {
                const ehMinha = m.deId !== contato.id;
                return (
                  <div key={m.id} className="brk-chat-msg">
                    <div className="brk-chat-msg-avatar">
                      {ehMinha ? 'V' : contato.nome.charAt(0).toUpperCase()}
                    </div>
                    <div className="brk-chat-msg-corpo">
                      <div className="brk-chat-msg-meta">
                        <span className="brk-chat-msg-autor">{ehMinha ? 'Você' : (m.de?.nome ?? contato.nome)}</span>
                        <span className="brk-chat-msg-hora">{formatarHora(m.criadoEm)}</span>
                      </div>
                      <div className="brk-chat-msg-texto">{m.texto}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>

      <div className="brk-chat-input-bar">
        <textarea
          className="brk-chat-input"
          placeholder={`Mensagem para ${contato.nome}`}
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
  );
}
