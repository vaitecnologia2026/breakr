import { useEffect, useMemo, useRef, useState } from 'react';
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

// Persona = avatar do público-alvo (inspirado no eKyte). Módulo de Marketing,
// aditivo e isolado — não altera nenhuma tela/estrutura existente.
interface Persona {
  id: string;
  nome: string;
  clienteId?: string | null;
  genero?: string | null;
  idade?: string | null;
  relacionamento?: string | null;
  classeSocial?: string | null;
  localizacao?: string | null;
  formacao?: string | null;
  ocupacao?: string | null;
  decisaoCompra?: string | null;
  comentarios?: string | null;
  ativo: boolean;
  criadoEm?: string;
}

const GENEROS = ['Feminino', 'Masculino', 'Todos'];
const CLASSES = ['A', 'B', 'C', 'D', 'E', 'Todas'];

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

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontSize: 11.5, padding: '2px 8px', borderRadius: 999, background: 'var(--superficie-2)', border: '1px solid var(--borda)', color: 'var(--texto-fraco)' }}>
      {children}
    </span>
  );
}

function CardPersona({
  item, podeAdmin, aoEditar, aoRemover,
}: { item: Persona; podeAdmin: boolean; aoEditar: (p: Persona) => void; aoRemover: (id: string) => void }) {
  const chips = [
    item.genero, item.idade, item.classeSocial ? `Classe ${item.classeSocial}` : null, item.localizacao, item.ocupacao,
  ].filter(Boolean) as string[];

  return (
    <div style={{ background: 'var(--superficie)', border: '1px solid var(--borda)', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 10, opacity: item.ativo ? 1 : 0.6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: 999, background: 'var(--acento-fraco, var(--superficie-2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 600, color: 'var(--acento, var(--texto))' }}>
            {item.nome.trim().charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 14.5, fontWeight: 600 }}>{item.nome}</div>
            {!item.ativo && <span style={{ fontSize: 11, color: 'var(--texto-fraco)' }}>Inativa</span>}
          </div>
        </div>
        {podeAdmin && (
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="brk-comunicado-btn-icon" title="Editar" onClick={() => aoEditar(item)}><IcoEditar /></button>
            <button className="brk-comunicado-btn-icon danger" title="Excluir" onClick={() => aoRemover(item.id)}><IcoLixo /></button>
          </div>
        )}
      </div>
      {chips.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {chips.map((c, i) => <Chip key={i}>{c}</Chip>)}
        </div>
      )}
      {item.decisaoCompra && (
        <p style={{ fontSize: 12.5, color: 'var(--texto-fraco)', margin: 0, lineHeight: 1.5 }}>
          <b style={{ color: 'var(--texto)' }}>Decisão de compra:</b> {item.decisaoCompra}
        </p>
      )}
    </div>
  );
}

type Aba = 'demografia' | 'comportamento';

function ModalPersona({
  original, aoFechar, aoSalvar,
}: { original: Persona | null; aoFechar: () => void; aoSalvar: (p: Persona) => void }) {
  const [aba, setAba] = useState<Aba>('demografia');
  const [nome, setNome] = useState(original?.nome ?? '');
  const [genero, setGenero] = useState(original?.genero ?? '');
  const [idade, setIdade] = useState(original?.idade ?? '');
  const [relacionamento, setRelacionamento] = useState(original?.relacionamento ?? '');
  const [classeSocial, setClasseSocial] = useState(original?.classeSocial ?? '');
  const [localizacao, setLocalizacao] = useState(original?.localizacao ?? '');
  const [formacao, setFormacao] = useState(original?.formacao ?? '');
  const [ocupacao, setOcupacao] = useState(original?.ocupacao ?? '');
  const [decisaoCompra, setDecisaoCompra] = useState(original?.decisaoCompra ?? '');
  const [comentarios, setComentarios] = useState(original?.comentarios ?? '');
  const [ativo, setAtivo] = useState(original?.ativo ?? true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const valido = nome.trim().length >= 2;

  async function salvar() {
    if (!valido || salvando) return;
    setSalvando(true); setErro(null);
    const payload = {
      nome: nome.trim(),
      genero: genero || undefined,
      idade: idade || undefined,
      relacionamento: relacionamento || undefined,
      classeSocial: classeSocial || undefined,
      localizacao: localizacao || undefined,
      formacao: formacao || undefined,
      ocupacao: ocupacao || undefined,
      decisaoCompra: decisaoCompra || undefined,
      comentarios: comentarios || undefined,
      ativo,
    };
    try {
      const { data } = original
        ? await api.patch<Persona>(`/personas/${original.id}`, payload)
        : await api.post<Persona>('/personas', payload);
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
          <h2 className="brk-modal-titulo">{original ? 'Editar persona' : 'Nova persona'}</h2>
          <button className="brk-modal-fechar" onClick={aoFechar}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="brk-modal-body">
          <div className="brk-campo">
            <label className="brk-campo-label">Nome *</label>
            <input ref={inputRef} className="brk-input" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Ana, a empreendedora" />
          </div>

          <div style={{ display: 'flex', gap: 8, margin: '4px 0 12px', borderBottom: '1px solid var(--borda)' }}>
            {(['demografia', 'comportamento'] as Aba[]).map((a) => (
              <button key={a} onClick={() => setAba(a)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px 4px', fontSize: 13, fontWeight: aba === a ? 600 : 400, color: aba === a ? 'var(--texto)' : 'var(--texto-fraco)', borderBottom: aba === a ? '2px solid var(--acento, var(--texto))' : '2px solid transparent' }}>
                {a === 'demografia' ? 'Demografia' : 'Comportamento'}
              </button>
            ))}
          </div>

          {aba === 'demografia' ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="brk-campo">
                <label className="brk-campo-label">Gênero</label>
                <select className="brk-input" value={genero} onChange={(e) => setGenero(e.target.value)}>
                  <option value="">—</option>
                  {GENEROS.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div className="brk-campo">
                <label className="brk-campo-label">Idade</label>
                <input className="brk-input" value={idade} onChange={(e) => setIdade(e.target.value)} placeholder="Ex.: 25-34" />
              </div>
              <div className="brk-campo">
                <label className="brk-campo-label">Relacionamento</label>
                <input className="brk-input" value={relacionamento} onChange={(e) => setRelacionamento(e.target.value)} placeholder="Ex.: Casada" />
              </div>
              <div className="brk-campo">
                <label className="brk-campo-label">Classe social</label>
                <select className="brk-input" value={classeSocial} onChange={(e) => setClasseSocial(e.target.value)}>
                  <option value="">—</option>
                  {CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="brk-campo">
                <label className="brk-campo-label">Localização</label>
                <input className="brk-input" value={localizacao} onChange={(e) => setLocalizacao(e.target.value)} placeholder="Ex.: São Paulo, SP" />
              </div>
              <div className="brk-campo">
                <label className="brk-campo-label">Formação</label>
                <input className="brk-input" value={formacao} onChange={(e) => setFormacao(e.target.value)} placeholder="Ex.: Ensino superior" />
              </div>
              <div className="brk-campo" style={{ gridColumn: '1 / -1' }}>
                <label className="brk-campo-label">Ocupação</label>
                <input className="brk-input" value={ocupacao} onChange={(e) => setOcupacao(e.target.value)} placeholder="Ex.: Empreendedora / autônoma" />
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="brk-campo">
                <label className="brk-campo-label">Decisão de compra</label>
                <textarea className="brk-input" style={{ minHeight: 80, resize: 'vertical' }} value={decisaoCompra} onChange={(e) => setDecisaoCompra(e.target.value)} placeholder="O que leva essa persona a comprar? Gatilhos, objeções, canais…" />
              </div>
              <div className="brk-campo">
                <label className="brk-campo-label">Comentários adicionais</label>
                <textarea className="brk-input" style={{ minHeight: 80, resize: 'vertical' }} value={comentarios} onChange={(e) => setComentarios(e.target.value)} placeholder="Observações livres sobre a persona…" />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
                <span>Persona ativa</span>
              </label>
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

const MOCK_PERSONAS: Persona[] = [
  { id: 'per1', nome: 'Ana, a empreendedora', genero: 'Feminino', idade: '30-40', classeSocial: 'B', localizacao: 'São Paulo, SP', ocupacao: 'Dona de e-commerce', relacionamento: 'Casada', formacao: 'Ensino superior', decisaoCompra: 'Busca ROI rápido e prova social; decide sozinha, mas pesquisa muito antes.', comentarios: 'Ativa no Instagram e em grupos de WhatsApp de negócios.', ativo: true, criadoEm: '2026-07-01T09:00:00Z' },
  { id: 'per2', nome: 'Carlos, o gestor', genero: 'Masculino', idade: '35-45', classeSocial: 'A', localizacao: 'Curitiba, PR', ocupacao: 'Diretor de marketing', relacionamento: 'Casado', formacao: 'Pós-graduação', decisaoCompra: 'Precisa de aprovação do board; valoriza cases e dados.', comentarios: 'Consome conteúdo no LinkedIn.', ativo: true, criadoEm: '2026-07-02T10:00:00Z' },
  { id: 'per3', nome: 'Júlia, a iniciante', genero: 'Feminino', idade: '18-24', classeSocial: 'C', localizacao: 'Recife, PE', ocupacao: 'Freelancer', relacionamento: 'Solteira', formacao: 'Cursando superior', decisaoCompra: 'Sensível a preço; busca ofertas e parcelamento.', comentarios: 'Muito ativa no TikTok.', ativo: false, criadoEm: '2026-07-03T11:00:00Z' },
];

export function Personas() {
  const { usuario } = useAuth();
  const podeAdmin = usuario?.cargo === 'SUPERADMIN' || usuario?.cargo === 'ADMIN' || usuario?.cargo === 'CS' || usuario?.cargo === 'ESTRATEGISTA';

  const [lista, setLista] = useState<Persona[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);
  const [busca, setBusca] = useState('');
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState<Persona | null>(null);

  async function carregar() {
    setCarregando(true); setErro(false);
    try {
      const { data } = await api.get<Persona[]>('/personas');
      setLista(comDemo(data, MOCK_PERSONAS));
    } catch { setLista(mockSeDemo(MOCK_PERSONAS)); setErro(false); }
    finally { setCarregando(false); }
  }

  useEffect(() => { carregar(); }, []);

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return lista;
    return lista.filter((p) =>
      [p.nome, p.ocupacao, p.localizacao, p.genero].filter(Boolean).some((c) => (c as string).toLowerCase().includes(q)),
    );
  }, [lista, busca]);

  function aoSalvar(p: Persona) {
    setLista((prev) => {
      const existe = prev.some((x) => x.id === p.id);
      return existe ? prev.map((x) => (x.id === p.id ? p : x)) : [p, ...prev];
    });
  }

  function abrirNova() { setEditando(null); setModal(true); }
  function abrirEdicao(p: Persona) { setEditando(p); setModal(true); }

  async function aoRemover(id: string) {
    const alvo = lista.find((p) => p.id === id);
    if (!confirm(`Excluir a persona "${alvo?.nome ?? ''}"?`)) return;
    try {
      await api.delete(`/personas/${id}`);
      setLista((prev) => prev.filter((p) => p.id !== id));
    } catch { alert('Não foi possível excluir a persona.'); }
  }

  return (
    <PaginaShell
      titulo="Personas"
      subtitulo="Avatares do público-alvo para orientar copy, conteúdo e mídia"
      acao={podeAdmin ? <BotaoPrimario onClick={abrirNova}>+ Nova persona</BotaoPrimario> : undefined}
    >
      {carregando ? (
        <EstadoCarregando />
      ) : erro ? (
        <EstadoErro mensagem="Não foi possível carregar as personas." onTentar={carregar} />
      ) : lista.length === 0 ? (
        <PainelVazio
          titulo="Nenhuma persona ainda"
          descricao={podeAdmin ? 'Crie a primeira persona para segmentar seus públicos.' : 'Ainda não há personas cadastradas.'}
        />
      ) : (
        <>
          <input
            className="brk-input"
            style={{ maxWidth: 320 }}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, ocupação, cidade…"
          />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {filtradas.map((p) => (
              <CardPersona key={p.id} item={p} podeAdmin={podeAdmin} aoEditar={abrirEdicao} aoRemover={aoRemover} />
            ))}
          </div>
        </>
      )}

      {modal && <ModalPersona original={editando} aoFechar={() => setModal(false)} aoSalvar={aoSalvar} />}
    </PaginaShell>
  );
}
