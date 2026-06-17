import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { PaginaShell, BotaoPrimario, BotaoSecundario, EstadoCarregando, EstadoErro, PainelVazio } from '../components/primitivos';

interface Autor { id: string; nome: string }
interface Comunicado {
  id: string;
  titulo: string;
  corpo: string;
  fixado: boolean;
  criadoEm: string;
  autor?: Autor | null;
}

function IcoPin() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/>
    </svg>
  );
}

function IcoLixo() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
    </svg>
  );
}

function CardComunicado({
  item, podeAdmin, aoRemover, aoFixar,
}: { item: Comunicado; podeAdmin: boolean; aoRemover: (id: string) => void; aoFixar: (id: string, fixado: boolean) => void }) {
  const [removendo, setRemovendo] = useState(false);

  async function remover() {
    if (!confirm(`Remover comunicado "${item.titulo}"?`)) return;
    setRemovendo(true);
    aoRemover(item.id);
  }

  return (
    <div className={`brk-comunicado-card${item.fixado ? ' fixado' : ''}`}>
      <div className="brk-comunicado-header">
        <div className="brk-comunicado-meta">
          {item.fixado && (
            <span className="brk-comunicado-pin" title="Fixado"><IcoPin /></span>
          )}
          <span className="brk-comunicado-titulo">{item.titulo}</span>
        </div>
        <div className="brk-comunicado-acoes">
          <span className="brk-comunicado-data">
            {new Date(item.criadoEm).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </span>
          {podeAdmin && (
            <>
              <button
                className="brk-comunicado-btn-icon"
                onClick={() => aoFixar(item.id, !item.fixado)}
                title={item.fixado ? 'Desafixar' : 'Fixar'}
              >
                <IcoPin />
              </button>
              <button
                className="brk-comunicado-btn-icon danger"
                onClick={remover}
                disabled={removendo}
                title="Remover"
              >
                <IcoLixo />
              </button>
            </>
          )}
        </div>
      </div>
      <p className="brk-comunicado-corpo">{item.corpo}</p>
      {item.autor && (
        <span className="brk-comunicado-autor">{item.autor.nome}</span>
      )}
    </div>
  );
}

function ModalNovoComunicado({ aoFechar, aoSalvar }: { aoFechar: () => void; aoSalvar: (c: Comunicado) => void }) {
  const [titulo, setTitulo] = useState('');
  const [corpo, setCorpo] = useState('');
  const [fixado, setFixado] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const valido = titulo.trim().length >= 3 && corpo.trim().length >= 5;

  async function salvar() {
    if (!valido || salvando) return;
    setSalvando(true); setErro(null);
    try {
      const { data } = await api.post<Comunicado>('/comunicados', { titulo: titulo.trim(), corpo: corpo.trim(), fixado });
      aoSalvar(data);
      aoFechar();
    } catch {
      setErro('Não foi possível salvar. Tente novamente.');
    } finally { setSalvando(false); }
  }

  return (
    <div className="brk-overlay" onClick={(e) => { if (e.target === e.currentTarget) aoFechar(); }}>
      <div className="brk-modal" style={{ maxWidth: 520 }}>
        <div className="brk-modal-header">
          <h2 className="brk-modal-titulo">Novo comunicado</h2>
          <button className="brk-modal-fechar" onClick={aoFechar}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div className="brk-modal-body">
          <div className="brk-campo">
            <label className="brk-campo-label">Título *</label>
            <input ref={inputRef} className="brk-input" value={titulo} onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex.: Amanhã é feriado nacional" onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }} />
          </div>
          <div className="brk-campo">
            <label className="brk-campo-label">Mensagem *</label>
            <textarea className="brk-input" style={{ minHeight: 100, resize: 'vertical' }} value={corpo}
              onChange={(e) => setCorpo(e.target.value)} placeholder="Detalhes do comunicado para o time…" />
          </div>
          <label className="brk-comunicado-fixar-label">
            <input type="checkbox" checked={fixado} onChange={(e) => setFixado(e.target.checked)} />
            <span>Fixar no topo do canal</span>
          </label>
          {erro && <p style={{ fontSize: 12.5, color: '#e2738a', marginTop: 8 }}>{erro}</p>}
        </div>
        <div className="brk-modal-footer">
          <BotaoSecundario onClick={aoFechar} disabled={salvando}>Cancelar</BotaoSecundario>
          <BotaoPrimario onClick={salvar} disabled={!valido || salvando}>
            {salvando ? 'Enviando…' : 'Publicar'}
          </BotaoPrimario>
        </div>
      </div>
    </div>
  );
}

export function Comunicados() {
  const { usuario } = useAuth();
  const podeAdmin = usuario?.cargo === 'SUPERADMIN' || usuario?.cargo === 'ADMIN';

  const [lista, setLista] = useState<Comunicado[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);
  const [modal, setModal] = useState(false);

  async function carregar() {
    setCarregando(true); setErro(false);
    try {
      const { data } = await api.get<Comunicado[]>('/comunicados');
      setLista(data);
    } catch { setErro(true); }
    finally { setCarregando(false); }
  }

  useEffect(() => { carregar(); }, []);

  function aoSalvar(novo: Comunicado) {
    setLista((prev) => {
      const atualizado = [novo, ...prev];
      return [...atualizado.filter((c) => c.fixado), ...atualizado.filter((c) => !c.fixado)];
    });
  }

  async function aoRemover(id: string) {
    try {
      await api.delete(`/comunicados/${id}`);
      setLista((prev) => prev.filter((c) => c.id !== id));
    } catch { alert('Não foi possível remover o comunicado.'); }
  }

  async function aoFixar(id: string, fixado: boolean) {
    try {
      await api.patch(`/comunicados/${id}/fixar`, { fixado });
      setLista((prev) => {
        const atualizado = prev.map((c) => c.id === id ? { ...c, fixado } : c);
        return [...atualizado.filter((c) => c.fixado), ...atualizado.filter((c) => !c.fixado)];
      });
    } catch { alert('Não foi possível atualizar o comunicado.'); }
  }

  return (
    <PaginaShell
      titulo="Comunicados"
      subtitulo="Canal oficial de avisos para o time"
      acao={podeAdmin ? <BotaoPrimario onClick={() => setModal(true)}>+ Publicar aviso</BotaoPrimario> : undefined}
    >
      {carregando ? (
        <EstadoCarregando />
      ) : erro ? (
        <EstadoErro mensagem="Não foi possível carregar os comunicados." onTentar={carregar} />
      ) : lista.length === 0 ? (
        <PainelVazio
          titulo="Nenhum comunicado ainda"
          descricao={podeAdmin ? 'Publique o primeiro aviso para o time.' : 'Ainda não há comunicados publicados.'}
        />
      ) : (
        <div className="brk-comunicados-lista">
          {lista.map((c) => (
            <CardComunicado
              key={c.id}
              item={c}
              podeAdmin={podeAdmin}
              aoRemover={aoRemover}
              aoFixar={aoFixar}
            />
          ))}
        </div>
      )}

      {modal && <ModalNovoComunicado aoFechar={() => setModal(false)} aoSalvar={aoSalvar} />}
    </PaginaShell>
  );
}
