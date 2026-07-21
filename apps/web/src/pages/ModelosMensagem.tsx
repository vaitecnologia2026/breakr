import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import {
  PaginaShell,
  BotaoPrimario,
  BotaoSecundario,
  EstadoCarregando,
  EstadoErro,
  PainelVazio,
} from '../components/primitivos';
import { comDemo, mockSeDemo } from '../lib/demo';

// Modelo de Mensagem = template de texto reutilizável (título + tipo + corpo),
// inspirado no eKyte (#/template-answers). Aditivo e isolado. NÃO se confunde com
// Templates & lote (TemplatesCampanha), que gera tarefas/materiais em lote.
interface ModeloMensagem {
  id: string;
  titulo: string;
  tipo?: string | null;
  corpo: string;
  criadoPorNome?: string | null;
  criadoEm?: string;
}

function IcoLixo() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
    </svg>
  );
}
function IcoEditar() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}
function IcoCopiar() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

type Aba = 'geral' | 'mensagem';

function ModalModelo({
  original, aoFechar, aoSalvar,
}: { original: ModeloMensagem | null; aoFechar: () => void; aoSalvar: (m: ModeloMensagem) => void }) {
  const [aba, setAba] = useState<Aba>('geral');
  const [titulo, setTitulo] = useState(original?.titulo ?? '');
  const [tipo, setTipo] = useState(original?.tipo ?? '');
  const [corpo, setCorpo] = useState(original?.corpo ?? '');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);
  const valido = titulo.trim().length >= 2 && corpo.trim().length >= 2;

  async function salvar() {
    if (!valido || salvando) return;
    setSalvando(true); setErro(null);
    const payload = { titulo: titulo.trim(), tipo: tipo.trim() || undefined, corpo: corpo.trim() };
    try {
      const { data } = original
        ? await api.patch<ModeloMensagem>(`/modelos-mensagem/${original.id}`, payload)
        : await api.post<ModeloMensagem>('/modelos-mensagem', payload);
      aoSalvar(data);
      aoFechar();
    } catch {
      setErro('Não foi possível salvar. Tente novamente.');
    } finally { setSalvando(false); }
  }

  return (
    <div className="brk-overlay" onClick={(e) => { if (e.target === e.currentTarget) aoFechar(); }}>
      <div className="brk-modal" style={{ maxWidth: 560 }}>
        <div className="brk-modal-header">
          <h2 className="brk-modal-titulo">{original ? 'Editar modelo' : 'Novo modelo de mensagem'}</h2>
          <button className="brk-modal-fechar" onClick={aoFechar}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="brk-modal-body">
          <div style={{ display: 'flex', gap: 8, margin: '0 0 12px', borderBottom: '1px solid var(--borda)' }}>
            {(['geral', 'mensagem'] as Aba[]).map((a) => (
              <button key={a} onClick={() => setAba(a)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px 4px', fontSize: 13, fontWeight: aba === a ? 600 : 400, color: aba === a ? 'var(--texto)' : 'var(--texto-fraco)', borderBottom: aba === a ? '2px solid var(--acento, var(--texto))' : '2px solid transparent' }}>
                {a === 'geral' ? 'Geral' : 'Mensagem'}
              </button>
            ))}
          </div>

          {aba === 'geral' ? (
            <>
              <div className="brk-campo">
                <label className="brk-campo-label">Título *</label>
                <input ref={inputRef} className="brk-input" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Boas-vindas ao cliente" />
              </div>
              <div className="brk-campo">
                <label className="brk-campo-label">Tipo de mensagem</label>
                <input className="brk-input" value={tipo} onChange={(e) => setTipo(e.target.value)} placeholder="Ex.: Onboarding, Cobrança, Follow-up…" />
              </div>
            </>
          ) : (
            <div className="brk-campo">
              <label className="brk-campo-label">Mensagem *</label>
              <textarea className="brk-input" style={{ minHeight: 160, resize: 'vertical' }} value={corpo} onChange={(e) => setCorpo(e.target.value)} placeholder="Texto do modelo. Você pode usar marcadores como {{nome}} para preencher depois." />
            </div>
          )}
          {erro && <p style={{ fontSize: 12.5, color: '#e2738a', marginTop: 8 }}>{erro}</p>}
        </div>
        <div className="brk-modal-footer">
          <BotaoSecundario onClick={aoFechar} disabled={salvando}>Cancelar</BotaoSecundario>
          <BotaoPrimario onClick={salvar} disabled={!valido || salvando}>
            {salvando ? 'Salvando…' : original ? 'Salvar' : 'Criar'}
          </BotaoPrimario>
        </div>
      </div>
    </div>
  );
}

const MOCK_MODELOS: ModeloMensagem[] = [
  { id: 'mm1', titulo: 'Boas-vindas ao cliente', tipo: 'Onboarding', corpo: 'Olá {{nome}}, seja bem-vindo(a) à Breakr! A partir de agora seu projeto está com a nossa equipe. Qualquer dúvida, é só chamar por aqui.', criadoPorNome: 'Admin', criadoEm: '2026-07-05T09:00:00Z' },
  { id: 'mm2', titulo: 'Cobrança amigável', tipo: 'Financeiro', corpo: 'Oi {{nome}}, tudo bem? Passando para lembrar que a fatura de {{mes}} vence em {{data}}. Se já pagou, desconsidere. Abraço!', criadoPorNome: 'Admin', criadoEm: '2026-07-06T10:00:00Z' },
  { id: 'mm3', titulo: 'Follow-up de aprovação', tipo: 'Follow-up', corpo: 'Olá {{nome}}, os criativos da campanha estão aguardando sua aprovação no portal. Consegue dar uma olhada até {{data}}?', criadoPorNome: 'Admin', criadoEm: '2026-07-07T11:00:00Z' },
];

export function ModelosMensagem() {
  const { usuario } = useAuth();
  const podeAdmin = usuario?.cargo === 'SUPERADMIN' || usuario?.cargo === 'ADMIN' || usuario?.cargo === 'CS' || usuario?.cargo === 'ESTRATEGISTA';

  const [lista, setLista] = useState<ModeloMensagem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState<ModeloMensagem | null>(null);
  const [copiado, setCopiado] = useState<string | null>(null);

  async function carregar() {
    setCarregando(true); setErro(false);
    try {
      const { data } = await api.get<ModeloMensagem[]>('/modelos-mensagem');
      setLista(comDemo(data, MOCK_MODELOS));
    } catch { setLista(mockSeDemo(MOCK_MODELOS)); setErro(false); }
    finally { setCarregando(false); }
  }

  useEffect(() => { carregar(); }, []);

  function aoSalvar(m: ModeloMensagem) {
    setLista((prev) => {
      const existe = prev.some((x) => x.id === m.id);
      return existe ? prev.map((x) => (x.id === m.id ? { ...x, ...m } : x)) : [m, ...prev];
    });
  }
  function abrirNovo() { setEditando(null); setModal(true); }
  function abrirEdicao(m: ModeloMensagem) { setEditando(m); setModal(true); }
  async function aoRemover(m: ModeloMensagem) {
    if (!confirm(`Excluir o modelo "${m.titulo}"?`)) return;
    try {
      await api.delete(`/modelos-mensagem/${m.id}`);
      setLista((prev) => prev.filter((x) => x.id !== m.id));
    } catch { alert('Não foi possível excluir o modelo.'); }
  }
  async function copiar(m: ModeloMensagem) {
    try {
      await navigator.clipboard.writeText(m.corpo);
      setCopiado(m.id);
      setTimeout(() => setCopiado((c) => (c === m.id ? null : c)), 1500);
    } catch { /* clipboard indisponível — silencioso */ }
  }

  return (
    <PaginaShell
      titulo="Modelos de Mensagem"
      subtitulo="Templates de texto reutilizáveis para acelerar a comunicação"
      acao={podeAdmin ? <BotaoPrimario onClick={abrirNovo}>+ Novo modelo</BotaoPrimario> : undefined}
    >
      {carregando ? (
        <EstadoCarregando />
      ) : erro ? (
        <EstadoErro mensagem="Não foi possível carregar os modelos." onTentar={carregar} />
      ) : lista.length === 0 ? (
        <PainelVazio
          titulo="Nenhum modelo ainda"
          descricao={podeAdmin ? 'Crie o primeiro modelo de mensagem reutilizável.' : 'Ainda não há modelos cadastrados.'}
        />
      ) : (
        <div style={{ overflowX: 'auto', border: '1px solid var(--borda)', borderRadius: 12 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--superficie-2)', textAlign: 'left' }}>
                <th style={{ padding: '10px 12px' }}>Título</th>
                <th style={{ padding: '10px 12px' }}>Tipo</th>
                <th style={{ padding: '10px 12px' }}>Criado por</th>
                <th style={{ padding: '10px 12px' }}>Criado em</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((m) => (
                <tr key={m.id} style={{ borderTop: '1px solid var(--borda)' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 600 }}>{m.titulo}</td>
                  <td style={{ padding: '10px 12px', color: 'var(--texto-fraco)' }}>{m.tipo || '—'}</td>
                  <td style={{ padding: '10px 12px', color: 'var(--texto-fraco)' }}>{m.criadoPorNome || '—'}</td>
                  <td style={{ padding: '10px 12px', color: 'var(--texto-fraco)' }}>
                    {m.criadoEm ? new Date(m.criadoEm).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button className="brk-comunicado-btn-icon" title={copiado === m.id ? 'Copiado!' : 'Copiar mensagem'} onClick={() => copiar(m)}><IcoCopiar /></button>
                    {podeAdmin && (
                      <>
                        <button className="brk-comunicado-btn-icon" title="Editar" onClick={() => abrirEdicao(m)}><IcoEditar /></button>
                        <button className="brk-comunicado-btn-icon danger" title="Excluir" onClick={() => aoRemover(m)}><IcoLixo /></button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && <ModalModelo original={editando} aoFechar={() => setModal(false)} aoSalvar={aoSalvar} />}
    </PaginaShell>
  );
}
