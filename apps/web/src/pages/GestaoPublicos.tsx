// Gestão de Públicos (Marketing › Tráfego Pago).
// Duas seções, ambas aditivas e independentes:
//  1) "Públicos planejados" — entidade própria (CRUD em /publicos), vinculável a
//     uma Persona, com tipo de segmentação, prioridade e tamanho (inspirado no eKyte).
//  2) "Importados do Meta Ads" — leitura das custom audiences via /trafego/meta/publicos
//     (read-only; degrada com elegância se o Meta não estiver configurado) — MANTIDA.
import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { PaginaHeader, Btn, Carregando, Alerta } from '../components/ui';
import { comDemo, mockSeDemo } from '../lib/demo';

// ─── Seção 1: Públicos planejados (própria) ──────────────────────────────────
type TipoSeg = 'REMARKETING' | 'SEGUIDORES' | 'SEGMENTADO' | 'NAO_SEGMENTADO' | 'LISTA_EMAIL';
type Prioridade = 'MUITO_ALTA' | 'ALTA' | 'NORMAL' | 'BAIXA';

interface PublicoOwn {
  id: string;
  nome: string;
  personaId?: string | null;
  tamanho?: number | null;
  tipoSegmentacao?: TipoSeg | null;
  prioridade: Prioridade;
  idMeta?: string | null;
  importadoMeta: boolean;
  ativo: boolean;
}
interface PersonaLite { id: string; nome: string }

const TIPO_ROTULO: Record<TipoSeg, string> = {
  REMARKETING: 'Remarketing',
  SEGUIDORES: 'Seguidores',
  SEGMENTADO: 'Segmentado',
  NAO_SEGMENTADO: 'Não segmentado',
  LISTA_EMAIL: 'Lista de e-mail',
};
const PRIORIDADE_ROTULO: Record<Prioridade, string> = {
  MUITO_ALTA: 'Muito alta',
  ALTA: 'Alta',
  NORMAL: 'Normal',
  BAIXA: 'Baixa',
};
const PRIORIDADE_COR: Record<Prioridade, string> = {
  MUITO_ALTA: '#e2738a',
  ALTA: '#e0a458',
  NORMAL: 'var(--texto-fraco)',
  BAIXA: 'var(--texto-fraco)',
};

// ─── Seção 2: Meta (mantida) ─────────────────────────────────────────────────
interface MetaResp<T> {
  ok: boolean;
  dados?: T;
  erro?: string;
}
interface PublicoMeta {
  id?: string;
  name?: string;
  subtype?: string;
  approximate_count?: number;
  description?: string;
  operation_status?: { code?: number; description?: string };
}

function ModalPublico({
  original, personas, aoFechar, aoSalvar,
}: { original: PublicoOwn | null; personas: PersonaLite[]; aoFechar: () => void; aoSalvar: (p: PublicoOwn) => void }) {
  const [nome, setNome] = useState(original?.nome ?? '');
  const [personaId, setPersonaId] = useState(original?.personaId ?? '');
  const [tamanho, setTamanho] = useState(original?.tamanho != null ? String(original.tamanho) : '');
  const [tipoSegmentacao, setTipoSegmentacao] = useState<string>(original?.tipoSegmentacao ?? '');
  const [prioridade, setPrioridade] = useState<Prioridade>(original?.prioridade ?? 'NORMAL');
  const [ativo, setAtivo] = useState(original?.ativo ?? true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);
  const valido = nome.trim().length >= 2;

  async function salvar() {
    if (!valido || salvando) return;
    setSalvando(true); setErro(null);
    const tamanhoNum = tamanho.trim() ? Number(tamanho.replace(/\D/g, '')) : undefined;
    const payload = {
      nome: nome.trim(),
      personaId: personaId || undefined,
      tamanho: Number.isFinite(tamanhoNum) ? tamanhoNum : undefined,
      tipoSegmentacao: (tipoSegmentacao || undefined) as TipoSeg | undefined,
      prioridade,
      ativo,
    };
    try {
      const { data } = original
        ? await api.patch<PublicoOwn>(`/publicos/${original.id}`, payload)
        : await api.post<PublicoOwn>('/publicos', payload);
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
          <h2 className="brk-modal-titulo">{original ? 'Editar público' : 'Novo público'}</h2>
          <button className="brk-modal-fechar" onClick={aoFechar}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="brk-modal-body">
          <div className="brk-campo">
            <label className="brk-campo-label">Nome *</label>
            <input ref={inputRef} className="brk-input" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Remarketing 30 dias" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="brk-campo">
              <label className="brk-campo-label">Persona</label>
              <select className="brk-input" value={personaId} onChange={(e) => setPersonaId(e.target.value)}>
                <option value="">— nenhuma —</option>
                {personas.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </div>
            <div className="brk-campo">
              <label className="brk-campo-label">Tamanho (pessoas)</label>
              <input className="brk-input" value={tamanho} onChange={(e) => setTamanho(e.target.value)} placeholder="Ex.: 15000" inputMode="numeric" />
            </div>
            <div className="brk-campo">
              <label className="brk-campo-label">Tipo de segmentação</label>
              <select className="brk-input" value={tipoSegmentacao} onChange={(e) => setTipoSegmentacao(e.target.value)}>
                <option value="">—</option>
                {(Object.keys(TIPO_ROTULO) as TipoSeg[]).map((t) => <option key={t} value={t}>{TIPO_ROTULO[t]}</option>)}
              </select>
            </div>
            <div className="brk-campo">
              <label className="brk-campo-label">Prioridade</label>
              <select className="brk-input" value={prioridade} onChange={(e) => setPrioridade(e.target.value as Prioridade)}>
                {(Object.keys(PRIORIDADE_ROTULO) as Prioridade[]).map((p) => <option key={p} value={p}>{PRIORIDADE_ROTULO[p]}</option>)}
              </select>
            </div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginTop: 4 }}>
            <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
            <span>Público ativo</span>
          </label>
          {erro && <p style={{ fontSize: 12.5, color: '#e2738a', marginTop: 8 }}>{erro}</p>}
        </div>
        <div className="brk-modal-footer">
          <Btn variante="secondary" onClick={aoFechar} disabled={salvando}>Cancelar</Btn>
          <Btn variante="primary" onClick={salvar} disabled={!valido || salvando}>
            {salvando ? 'Salvando…' : original ? 'Salvar' : 'Criar'}
          </Btn>
        </div>
      </div>
    </div>
  );
}

const MOCK_PUBLICOS: PublicoOwn[] = [
  { id: 'pub1', nome: 'Remarketing 30 dias', personaId: null, tamanho: 18000, tipoSegmentacao: 'REMARKETING', prioridade: 'MUITO_ALTA', importadoMeta: false, ativo: true },
  { id: 'pub2', nome: 'Seguidores Instagram', personaId: null, tamanho: 42000, tipoSegmentacao: 'SEGUIDORES', prioridade: 'ALTA', importadoMeta: false, ativo: true },
  { id: 'pub3', nome: 'Lista de e-mail (leads)', personaId: null, tamanho: 5300, tipoSegmentacao: 'LISTA_EMAIL', prioridade: 'NORMAL', importadoMeta: false, ativo: true },
];

export function GestaoPublicos() {
  const { usuario } = useAuth();
  const podeAdmin = usuario?.cargo === 'SUPERADMIN' || usuario?.cargo === 'ADMIN' || usuario?.cargo === 'CS' || usuario?.cargo === 'ESTRATEGISTA';

  // Seção 1 — próprios
  const [proprios, setProprios] = useState<PublicoOwn[]>([]);
  const [personas, setPersonas] = useState<PersonaLite[]>([]);
  const [carregandoProprios, setCarregandoProprios] = useState(true);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState<PublicoOwn | null>(null);

  // Seção 2 — Meta (mantida)
  const [publicos, setPublicos] = useState<PublicoMeta[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  async function carregarProprios() {
    setCarregandoProprios(true);
    try {
      const [{ data: pubs }, { data: pers }] = await Promise.all([
        api.get<PublicoOwn[]>('/publicos'),
        api.get<PersonaLite[]>('/personas'),
      ]);
      setProprios(comDemo(pubs, MOCK_PUBLICOS));
      setPersonas(pers ?? []);
    } catch {
      setProprios(mockSeDemo(MOCK_PUBLICOS));
    } finally {
      setCarregandoProprios(false);
    }
  }

  async function carregar() {
    setCarregando(true);
    setErro(null);
    try {
      const { data } = await api.get<MetaResp<{ data?: PublicoMeta[] }>>('/trafego/meta/publicos');
      if (!data.ok) {
        setPublicos([]);
        setErro(data.erro ?? 'Não foi possível listar os públicos do Meta (integração não configurada).');
      } else {
        setPublicos(data.dados?.data ?? []);
        if (!data.dados?.data?.length) setErro('Nenhum público personalizado encontrado na conta Meta.');
      }
    } catch {
      setErro('Não foi possível listar os públicos do Meta.');
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => { carregarProprios(); carregar(); }, []);

  const nomePersona = useMemo(() => {
    const m = new Map(personas.map((p) => [p.id, p.nome]));
    return (id?: string | null) => (id ? m.get(id) ?? '—' : '—');
  }, [personas]);

  function aoSalvar(p: PublicoOwn) {
    setProprios((prev) => {
      const existe = prev.some((x) => x.id === p.id);
      return existe ? prev.map((x) => (x.id === p.id ? p : x)) : [p, ...prev];
    });
  }
  function abrirNovo() { setEditando(null); setModal(true); }
  function abrirEdicao(p: PublicoOwn) { setEditando(p); setModal(true); }
  async function aoRemover(p: PublicoOwn) {
    if (!confirm(`Excluir o público "${p.nome}"?`)) return;
    try {
      await api.delete(`/publicos/${p.id}`);
      setProprios((prev) => prev.filter((x) => x.id !== p.id));
    } catch { alert('Não foi possível excluir o público.'); }
  }

  return (
    <>
      <PaginaHeader
        titulo="Gestão de Públicos"
        subtitulo="Planejamento de audiências próprias e leitura das custom audiences do Meta Ads"
      />

      {/* ── Seção 1: Públicos planejados (próprios) ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '4px 0 12px', gap: 12, flexWrap: 'wrap' }}>
        <h3 style={{ fontSize: 14.5, fontWeight: 700, margin: 0 }}>Públicos planejados</h3>
        {podeAdmin && <Btn variante="primary" onClick={abrirNovo}>+ Novo público</Btn>}
      </div>

      {carregandoProprios ? (
        <Carregando />
      ) : proprios.length === 0 ? (
        <Alerta tipo="info">Nenhum público planejado ainda{podeAdmin ? ' — clique em “Novo público”.' : '.'}</Alerta>
      ) : (
        <div style={{ overflowX: 'auto', border: '1px solid var(--borda)', borderRadius: 12, marginBottom: 26 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--superficie-2)', textAlign: 'left' }}>
                <th style={{ padding: '10px 12px' }}>Público</th>
                <th style={{ padding: '10px 12px' }}>Persona</th>
                <th style={{ padding: '10px 12px' }}>Pessoas</th>
                <th style={{ padding: '10px 12px' }}>Segmentação</th>
                <th style={{ padding: '10px 12px' }}>Prioridade</th>
                <th style={{ padding: '10px 12px' }}>Ativo</th>
                {podeAdmin && <th style={{ padding: '10px 12px', textAlign: 'right' }}>Ações</th>}
              </tr>
            </thead>
            <tbody>
              {proprios.map((p) => (
                <tr key={p.id} style={{ borderTop: '1px solid var(--borda)', opacity: p.ativo ? 1 : 0.55 }}>
                  <td style={{ padding: '10px 12px', fontWeight: 600 }}>{p.nome}</td>
                  <td style={{ padding: '10px 12px', color: 'var(--texto-fraco)' }}>{nomePersona(p.personaId)}</td>
                  <td style={{ padding: '10px 12px' }}>{p.tamanho != null ? p.tamanho.toLocaleString('pt-BR') : '—'}</td>
                  <td style={{ padding: '10px 12px' }}>{p.tipoSegmentacao ? TIPO_ROTULO[p.tipoSegmentacao] : '—'}</td>
                  <td style={{ padding: '10px 12px', color: PRIORIDADE_COR[p.prioridade], fontWeight: 600 }}>{PRIORIDADE_ROTULO[p.prioridade]}</td>
                  <td style={{ padding: '10px 12px' }}>{p.ativo ? 'Sim' : 'Não'}</td>
                  {podeAdmin && (
                    <td style={{ padding: '10px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button className="brk-comunicado-btn-icon" title="Editar" onClick={() => abrirEdicao(p)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                      </button>
                      <button className="brk-comunicado-btn-icon danger" title="Excluir" onClick={() => aoRemover(p)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" /></svg>
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Seção 2: Importados do Meta Ads (mantida) ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '4px 0 12px', gap: 12, flexWrap: 'wrap' }}>
        <h3 style={{ fontSize: 14.5, fontWeight: 700, margin: 0 }}>Importados do Meta Ads</h3>
        <Btn onClick={carregar}>Atualizar</Btn>
      </div>

      {carregando ? (
        <Carregando />
      ) : (
        <>
          {erro && <Alerta tipo="info">{erro}</Alerta>}
          {publicos.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {publicos.map((p) => (
                <div key={p.id} className="brk-card brk-card-p">
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 14.5, fontWeight: 700 }}>{p.name ?? p.id}</div>
                      <div style={{ fontSize: 12.5, color: 'var(--texto-fraco)' }}>
                        {p.subtype ?? '—'}{p.description ? ` · ${p.description}` : ''}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 13.5, fontWeight: 700 }}>
                        {p.approximate_count != null ? p.approximate_count.toLocaleString('pt-BR') : '—'}
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--texto-fraco)' }}>
                        {p.operation_status?.description ?? 'tamanho aprox.'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {modal && <ModalPublico original={editando} personas={personas} aoFechar={() => setModal(false)} aoSalvar={aoSalvar} />}
    </>
  );
}
