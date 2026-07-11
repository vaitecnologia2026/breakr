// Agendamento (menu Comercial) — calendário semanal por colaborador.
// Reproduz o layout do calendário (colaboradores × dias, cards de evento,
// filtros por pessoa, Criar / Hoje / Dia-Semana-Mês) com o design system Breakr.
// Dados persistentes: GET/POST/PUT/DELETE /agendamento + /agendamento/colaboradores.
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '../lib/api';
import { Avatar } from '../components/UserMenu';
import {
  PaginaHeader, Btn, Campo, CampoSelect, Modal, Switch,
  Carregando, Alerta,
} from '../components/ui';

/* ── Tipos ── */
type Vista = 'DIA' | 'SEMANA' | 'MES';
interface Colaborador { id: string; nome: string; cargo: string; fotoUrl: string | null }
interface Evento {
  id: string; titulo: string; inicio: string; fim: string;
  tipo: 'VIDEO' | 'PRESENCIAL' | 'OUTRO'; comCliente: boolean;
  local: string | null; observacao: string | null; cor: string | null;
  responsavel: { id: string; nome: string; cargo: string; fotoUrl: string | null } | null;
  responsavelId?: string;
}

/* ── Ícones (inline, iguais aos do arquivo) ── */
function Ico({ children, size = 16 }: { children: ReactNode; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>{children}</svg>;
}
const IcoPlus = () => <Ico size={18}><path d="M5 12h14" /><path d="M12 5v14" /></Ico>;
const IcoLeft = () => <Ico size={18}><path d="m15 18-6-6 6-6" /></Ico>;
const IcoRight = () => <Ico size={18}><path d="m9 18 6-6-6-6" /></Ico>;
const IcoClock = () => <Ico size={11}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></Ico>;
const IcoUsers = () => <Ico size={12}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></Ico>;
const IcoVideo = () => <Ico size={12}><path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5" /><rect x="2" y="6" width="14" height="12" rx="2" /></Ico>;
const IcoPin = () => <Ico size={12}><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" /><circle cx="12" cy="10" r="3" /></Ico>;
const IcoUserRound = () => <Ico size={12}><path d="M18 20a6 6 0 0 0-12 0" /><circle cx="12" cy="10" r="4" /><circle cx="12" cy="12" r="10" /></Ico>;

/* ── Paleta por colaborador (mesmas cores do arquivo) ── */
const PALETA = ['#64748B', '#10B981', '#84CC16', '#D946EF', '#06B6D4', '#6366F1', '#F97316', '#EF4444', '#3B82F6', '#22C55E', '#EAB308', '#EC4899'];

const DIAS_CURTO = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/* ── Helpers de data ── */
function inicioDoDia(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function inicioDaSemana(d: Date) { const x = inicioDoDia(d); x.setDate(x.getDate() - x.getDay()); return x; }
function addDias(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function mesmaData(a: Date, b: Date) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
function hhmm(iso: string) { return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); }
function paraInputLocal(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function Agendamento() {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [ref, setRef] = useState<Date>(() => inicioDoDia(new Date()));
  const [vista, setVista] = useState<Vista>('SEMANA');
  const [visiveis, setVisiveis] = useState<Set<string>>(new Set());

  const [modalCriar, setModalCriar] = useState(false);
  const [detalhe, setDetalhe] = useState<Evento | null>(null);

  const corPorColaborador = useMemo(() => {
    const m: Record<string, string> = {};
    colaboradores.forEach((c, i) => { m[c.id] = PALETA[i % PALETA.length]; });
    return m;
  }, [colaboradores]);

  // Intervalo carregado conforme a vista.
  const periodo = useMemo(() => {
    if (vista === 'DIA') return { inicio: inicioDoDia(ref), fim: addDias(inicioDoDia(ref), 1) };
    if (vista === 'MES') {
      const primeiro = new Date(ref.getFullYear(), ref.getMonth(), 1);
      const gridInicio = inicioDaSemana(primeiro);
      return { inicio: gridInicio, fim: addDias(gridInicio, 42) };
    }
    const ini = inicioDaSemana(ref);
    return { inicio: ini, fim: addDias(ini, 7) };
  }, [ref, vista]);

  async function carregarColaboradores() {
    try {
      const { data } = await api.get<Colaborador[]>('/agendamento/colaboradores');
      setColaboradores(data);
      setVisiveis(new Set(data.map((c) => c.id)));
    } catch { setColaboradores([]); }
  }

  async function carregarEventos() {
    setCarregando(true); setErro(null);
    try {
      const { data } = await api.get<Evento[]>('/agendamento', {
        params: { inicio: periodo.inicio.toISOString(), fim: periodo.fim.toISOString() },
      });
      setEventos(data);
    } catch { setErro('Não foi possível carregar o agendamento.'); }
    finally { setCarregando(false); }
  }

  useEffect(() => { carregarColaboradores(); }, []);
  useEffect(() => { carregarEventos(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [periodo.inicio.getTime(), periodo.fim.getTime()]);

  const diasSemana = useMemo(() => {
    const base = vista === 'DIA' ? inicioDoDia(ref) : inicioDaSemana(ref);
    const qtd = vista === 'DIA' ? 1 : 7;
    return Array.from({ length: qtd }, (_, i) => addDias(base, i));
  }, [ref, vista]);

  const colaboradoresVisiveis = colaboradores.filter((c) => visiveis.has(c.id));
  const hoje = inicioDoDia(new Date());

  // Larguras por vista. Na Semana as 7 colunas dividem a largura disponivel
  // (piso 0 => encolhem para caber a semana toda, sem scroll horizontal). Na
  // vista Dia mantem colunas largas com scroll quando necessario.
  const larguraColab = vista === 'DIA' ? 220 : 168;
  const minCelDia = vista === 'DIA' ? 260 : 0;
  const larguraGrade = vista === 'DIA' ? 420 : larguraColab;

  function eventosDe(colId: string, dia: Date) {
    return eventos
      .filter((e) => (e.responsavel?.id ?? e.responsavelId) === colId && mesmaData(new Date(e.inicio), dia))
      .sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime());
  }

  function navegar(delta: number) {
    if (vista === 'DIA') setRef((d) => addDias(d, delta));
    else if (vista === 'MES') setRef((d) => new Date(d.getFullYear(), d.getMonth() + delta, 1));
    else setRef((d) => addDias(d, delta * 7));
  }

  function toggleVisivel(id: string) {
    setVisiveis((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }
  const todosVisiveis = colaboradores.length > 0 && visiveis.size === colaboradores.length;
  function alternarTodos() { setVisiveis(todosVisiveis ? new Set() : new Set(colaboradores.map((c) => c.id))); }

  const rotuloPeriodo = useMemo(() => {
    if (vista === 'MES') return `${MESES[ref.getMonth()]} ${ref.getFullYear()}`;
    if (vista === 'DIA') return `${ref.getDate()} ${MESES[ref.getMonth()]}, ${ref.getFullYear()}`;
    const ini = inicioDaSemana(ref); const fim = addDias(ini, 6);
    return `${ini.getDate()} ${MESES[ini.getMonth()]} - ${fim.getDate()} ${MESES[fim.getMonth()]}, ${fim.getFullYear()}`;
  }, [ref, vista]);

  const [novo, setNovo] = useState<{ titulo: string; responsavelId: string; inicio: string; fim: string; tipo: string; comCliente: boolean; local: string; observacao: string }>(
    { titulo: '', responsavelId: '', inicio: '', fim: '', tipo: 'VIDEO', comCliente: false, local: '', observacao: '' },
  );
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState<string | null>(null);

  function abrirCriar(colId?: string, dia?: Date) {
    const base = dia ? new Date(dia) : new Date();
    if (!dia) base.setMinutes(0, 0, 0);
    else base.setHours(9, 0, 0, 0);
    const fim = new Date(base); fim.setHours(base.getHours() + 1);
    setErroForm(null);
    setNovo({
      titulo: '', responsavelId: colId ?? colaboradores[0]?.id ?? '',
      inicio: paraInputLocal(base), fim: paraInputLocal(fim),
      tipo: 'VIDEO', comCliente: false, local: '', observacao: '',
    });
    setModalCriar(true);
  }

  async function salvarNovo() {
    setErroForm(null);
    if (!novo.titulo.trim() || !novo.responsavelId || !novo.inicio || !novo.fim) {
      setErroForm('Preencha título, colaborador, início e fim.'); return;
    }
    if (new Date(novo.fim) <= new Date(novo.inicio)) { setErroForm('O fim deve ser após o início.'); return; }
    setSalvando(true);
    try {
      await api.post('/agendamento', {
        titulo: novo.titulo.trim(),
        responsavelId: novo.responsavelId,
        inicio: new Date(novo.inicio).toISOString(),
        fim: new Date(novo.fim).toISOString(),
        tipo: novo.tipo,
        comCliente: novo.comCliente,
        ...(novo.local.trim() && { local: novo.local.trim() }),
        ...(novo.observacao.trim() && { observacao: novo.observacao.trim() }),
      });
      setModalCriar(false);
      await carregarEventos();
    } catch (e: any) { setErroForm(e?.response?.data?.message ?? 'Erro ao salvar.'); }
    finally { setSalvando(false); }
  }

  async function excluir(id: string) {
    if (!window.confirm('Excluir este agendamento?')) return;
    try { await api.delete(`/agendamento/${id}`); setDetalhe(null); await carregarEventos(); }
    catch { /* mantém */ }
  }

  if (carregando && eventos.length === 0 && colaboradores.length === 0) return <Carregando />;

  return (
    <>
      <PaginaHeader
        titulo="Agendamento"
        subtitulo="Calendário da equipe — reuniões, alinhamentos e compromissos por colaborador."
        acoes={<Btn onClick={() => abrirCriar()}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><IcoPlus /> Criar</span></Btn>}
      />

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Btn variante="secondary" tamanho="sm" onClick={() => setRef(inicioDoDia(new Date()))}>Hoje</Btn>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button type="button" onClick={() => navegar(-1)} title="Anterior" style={navBtn}><IcoLeft /></button>
            <button type="button" onClick={() => navegar(1)} title="Próximo" style={navBtn}><IcoRight /></button>
          </div>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--texto)', minWidth: 180 }}>{rotuloPeriodo}</span>
        </div>
        <div style={{ display: 'flex', background: 'var(--superficie-2)', borderRadius: 10, padding: 3, border: '1px solid var(--borda)' }}>
          {(['DIA', 'SEMANA', 'MES'] as Vista[]).map((v) => (
            <button key={v} type="button" onClick={() => setVista(v)}
              style={{
                padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                background: vista === v ? 'var(--superficie)' : 'transparent',
                color: vista === v ? 'var(--amarelo-fagulha)' : 'var(--texto-fraco)',
                boxShadow: vista === v ? '0 1px 2px rgba(0,0,0,0.15)' : 'none',
              }}>
              {v === 'DIA' ? 'Dia' : v === 'SEMANA' ? 'Semana' : 'Mês'}
            </button>
          ))}
        </div>
      </div>

      {erro && <Alerta tipo="erro">{erro}</Alerta>}

      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        {/* Painel de agendas (filtros por colaborador) */}
        <aside style={{ width: 210, flex: '0 0 auto', background: 'var(--superficie)', border: '1px solid var(--borda)', borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 11.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--texto-fraco)' }}>Agendas</span>
            <button type="button" onClick={alternarTodos} style={{ background: 'none', border: 'none', color: 'var(--texto-fraco)', cursor: 'pointer', fontSize: 11 }}>
              {todosVisiveis ? 'Ocultar todos' : 'Mostrar todos'}
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 460, overflowY: 'auto' }} className="brk-kanban-scroll">
            {colaboradores.map((c) => {
              const cor = corPorColaborador[c.id];
              const on = visiveis.has(c.id);
              return (
                <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 6px', borderRadius: 8, cursor: 'pointer' }}>
                  <input type="checkbox" checked={on} onChange={() => toggleVisivel(c.id)} style={{ accentColor: cor, width: 14, height: 14 }} />
                  <span style={{ width: 9, height: 9, borderRadius: 999, background: cor, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: 'var(--texto-suave)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nome}</span>
                </label>
              );
            })}
            {colaboradores.length === 0 && <span style={{ fontSize: 12.5, color: 'var(--texto-fraco)' }}>Nenhum colaborador.</span>}
          </div>
        </aside>

        {/* Calendário */}
        <div style={{ flex: 1, minWidth: 0, background: 'var(--superficie)', border: '1px solid var(--borda)', borderRadius: 12, overflow: 'hidden' }}>
          {vista === 'MES' ? (
            <VistaMes dias={Array.from({ length: 42 }, (_, i) => addDias(inicioDaSemana(new Date(ref.getFullYear(), ref.getMonth(), 1)), i))}
              mesAtual={ref.getMonth()} hoje={hoje} eventos={eventos} visiveis={visiveis}
              cores={corPorColaborador} onDia={(d) => { setRef(inicioDoDia(d)); setVista('DIA'); }} onEvento={setDetalhe} />
          ) : (
            <div style={{ overflowX: 'auto' }} className="brk-kanban-scroll">
              <div style={{ minWidth: larguraGrade }}>
                {/* Cabeçalho de dias */}
                <div style={{ display: 'flex', borderBottom: '1px solid var(--borda)', position: 'sticky', top: 0, background: 'var(--superficie-2)', zIndex: 3 }}>
                  <div style={{ ...colColab, width: larguraColab, minWidth: larguraColab, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--texto-fraco)', display: 'flex', alignItems: 'center' }}>Colaboradores</div>
                  <div style={{ flex: 1, display: 'flex', minWidth: 0 }}>
                    {diasSemana.map((d, i) => {
                      const eHoje = mesmaData(d, hoje);
                      return (
                        <div key={i} style={{ flex: 1, minWidth: minCelDia, textAlign: 'center', padding: '8px 4px', borderRight: '1px solid var(--borda)', background: eHoje ? 'color-mix(in srgb, var(--amarelo-fagulha) 8%, transparent)' : 'transparent' }}>
                          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: eHoje ? 'var(--amarelo-fagulha)' : 'var(--texto-fraco)' }}>{DIAS_CURTO[d.getDay()]}</div>
                          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: 999, marginTop: 2, fontSize: 13, fontWeight: 700, background: eHoje ? 'var(--amarelo-fagulha)' : 'transparent', color: eHoje ? '#1a1200' : 'var(--texto)' }}>{d.getDate()}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Linhas por colaborador */}
                {colaboradoresVisiveis.length === 0 ? (
                  <div style={{ padding: 28, textAlign: 'center', color: 'var(--texto-fraco)', fontSize: 13 }}>Nenhum colaborador selecionado.</div>
                ) : colaboradoresVisiveis.map((c) => {
                  const cor = corPorColaborador[c.id];
                  return (
                    <div key={c.id} style={{ display: 'flex', borderBottom: '1px solid var(--borda)' }}>
                      <div style={{ ...colColab, width: larguraColab, minWidth: larguraColab, display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px' }}>
                        <div style={{ position: 'relative', flexShrink: 0 }}>
                          <Avatar nome={c.nome} userId={c.id} size={34} />
                          <span style={{ position: 'absolute', bottom: -2, right: -2, width: 11, height: 11, borderRadius: 999, background: cor, border: '2px solid var(--superficie)' }} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--texto)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nome}</div>
                          <span style={{ fontSize: 10.5, color: 'var(--texto-fraco)', background: 'var(--superficie-3)', padding: '1px 7px', borderRadius: 999, display: 'inline-block', marginTop: 3 }}>{c.cargo}</span>
                        </div>
                      </div>
                      <div style={{ flex: 1, display: 'flex', minWidth: 0 }}>
                        {diasSemana.map((d, i) => {
                          const eHoje = mesmaData(d, hoje);
                          const doDia = eventosDe(c.id, d);
                          return (
                            <div key={i} onClick={() => abrirCriar(c.id, d)} title="Clique para criar"
                              style={{ flex: 1, minWidth: minCelDia, minHeight: 92, padding: 6, borderRight: '1px solid var(--borda)', background: eHoje ? 'color-mix(in srgb, var(--amarelo-fagulha) 5%, transparent)' : 'transparent', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 5 }}>
                              {doDia.map((ev) => (
                                <CardEvento key={ev.id} ev={ev} cor={ev.cor || cor} onClick={(e) => { e.stopPropagation(); setDetalhe(ev); }} />
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal criar */}
      {modalCriar && (
        <Modal titulo="Novo agendamento" onFechar={() => setModalCriar(false)}
          rodape={<><Btn variante="secondary" onClick={() => setModalCriar(false)}>Cancelar</Btn><Btn onClick={salvarNovo} disabled={salvando}>{salvando ? 'Salvando…' : 'Criar'}</Btn></>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {erroForm && <Alerta tipo="erro">{erroForm}</Alerta>}
            <Campo rotulo="Título" placeholder="Ex.: Reunião com cliente" value={novo.titulo} onChange={(e) => setNovo((n) => ({ ...n, titulo: e.target.value }))} />
            <CampoSelect rotulo="Colaborador" value={novo.responsavelId} onChange={(e) => setNovo((n) => ({ ...n, responsavelId: e.target.value }))}>
              <option value="">Selecione…</option>
              {colaboradores.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </CampoSelect>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Campo rotulo="Início" type="datetime-local" value={novo.inicio} onChange={(e) => setNovo((n) => ({ ...n, inicio: e.target.value }))} />
              <Campo rotulo="Fim" type="datetime-local" value={novo.fim} onChange={(e) => setNovo((n) => ({ ...n, fim: e.target.value }))} />
            </div>
            <CampoSelect rotulo="Tipo" value={novo.tipo} onChange={(e) => setNovo((n) => ({ ...n, tipo: e.target.value }))}>
              <option value="VIDEO">Vídeo (online)</option>
              <option value="PRESENCIAL">Presencial</option>
              <option value="OUTRO">Outro</option>
            </CampoSelect>
            <Switch ativo={novo.comCliente} aoAlternar={(v) => setNovo((n) => ({ ...n, comCliente: v }))} rotulo="Reunião com cliente" />
            <Campo rotulo="Local (opcional)" placeholder="Sala, endereço ou link" value={novo.local} onChange={(e) => setNovo((n) => ({ ...n, local: e.target.value }))} />
            <div className="brk-campo">
              <label className="brk-campo-label">Observação (opcional)</label>
              <textarea className="brk-input" rows={2} value={novo.observacao} onChange={(e) => setNovo((n) => ({ ...n, observacao: e.target.value }))} style={{ resize: 'vertical' }} />
            </div>
          </div>
        </Modal>
      )}

      {/* Modal detalhe */}
      {detalhe && (
        <Modal titulo={detalhe.titulo} onFechar={() => setDetalhe(null)}
          rodape={<><Btn variante="secondary" onClick={() => setDetalhe(null)}>Fechar</Btn><Btn variante="danger" onClick={() => excluir(detalhe.id)}>Excluir</Btn></>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13.5, color: 'var(--texto-suave)' }}>
            <div><b style={{ color: 'var(--texto)' }}>Colaborador:</b> {detalhe.responsavel?.nome ?? '—'}</div>
            <div><b style={{ color: 'var(--texto)' }}>Quando:</b> {new Date(detalhe.inicio).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })} · {hhmm(detalhe.inicio)} – {hhmm(detalhe.fim)}</div>
            <div><b style={{ color: 'var(--texto)' }}>Tipo:</b> {detalhe.tipo === 'VIDEO' ? 'Vídeo (online)' : detalhe.tipo === 'PRESENCIAL' ? 'Presencial' : 'Outro'}{detalhe.comCliente ? ' · Com cliente' : ''}</div>
            {detalhe.local && <div><b style={{ color: 'var(--texto)' }}>Local:</b> {detalhe.local}</div>}
            {detalhe.observacao && <div><b style={{ color: 'var(--texto)' }}>Observação:</b> {detalhe.observacao}</div>}
          </div>
        </Modal>
      )}
    </>
  );
}

/* ── Card de evento (mesma estrutura do arquivo) ── */
function CardEvento({ ev, cor, onClick }: { ev: Evento; cor: string; onClick: (e: React.MouseEvent) => void }) {
  return (
    <div onClick={onClick} title={ev.titulo}
      style={{ position: 'relative', overflow: 'hidden', background: 'var(--superficie-2)', border: '1px solid var(--borda)', borderLeft: `4px solid ${cor}`, borderRadius: 8, padding: '6px 8px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 3, minHeight: 40 }}>
      <div style={{ position: 'absolute', inset: 0, background: cor, opacity: 0.08, pointerEvents: 'none' }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 4, position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, overflow: 'hidden' }}>
          {ev.comCliente && <span style={{ color: '#F97316', display: 'flex', flexShrink: 0 }}><IcoUserRound /></span>}
          <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--texto)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.titulo}</span>
        </div>
        <div style={{ display: 'flex', gap: 3, flexShrink: 0, color: 'var(--texto-fraco)' }}>
          <IcoUsers />
          <span style={{ color: cor, display: 'flex' }}>{ev.tipo === 'PRESENCIAL' ? <IcoPin /> : ev.tipo === 'VIDEO' ? <IcoVideo /> : null}</span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9.5, color: 'var(--texto-fraco)', fontWeight: 600, position: 'relative', zIndex: 1 }}>
        <IcoClock /><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{hhmm(ev.inicio)} - {hhmm(ev.fim)}</span>
      </div>
    </div>
  );
}

/* ── Vista mensal (grade de dias) ── */
function VistaMes({ dias, mesAtual, hoje, eventos, visiveis, cores, onDia, onEvento }: {
  dias: Date[]; mesAtual: number; hoje: Date; eventos: Evento[]; visiveis: Set<string>;
  cores: Record<string, string>; onDia: (d: Date) => void; onEvento: (e: Evento) => void;
}) {
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--borda)', background: 'var(--superficie-2)' }}>
        {['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'].map((d) => (
          <div key={d} style={{ textAlign: 'center', padding: '8px 4px', fontSize: 10.5, fontWeight: 800, color: 'var(--texto-fraco)', letterSpacing: '0.04em' }}>{d}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {dias.map((d, i) => {
          const foraDoMes = d.getMonth() !== mesAtual;
          const eHoje = mesmaData(d, hoje);
          const doDia = eventos
            .filter((e) => visiveis.has(e.responsavel?.id ?? e.responsavelId ?? '') && mesmaData(new Date(e.inicio), d))
            .sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime());
          return (
            <div key={i} onClick={() => onDia(d)}
              style={{ minHeight: 96, borderRight: '1px solid var(--borda)', borderBottom: '1px solid var(--borda)', padding: 5, cursor: 'pointer', background: eHoje ? 'color-mix(in srgb, var(--amarelo-fagulha) 6%, transparent)' : foraDoMes ? 'var(--superficie-2)' : 'transparent', opacity: foraDoMes ? 0.5 : 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: eHoje ? 'var(--amarelo-fagulha)' : 'var(--texto)', alignSelf: 'flex-start' }}>{d.getDate()}</div>
              {doDia.slice(0, 3).map((ev) => {
                const cor = ev.cor || cores[ev.responsavel?.id ?? ev.responsavelId ?? ''] || 'var(--borda-forte)';
                return (
                  <div key={ev.id} onClick={(e) => { e.stopPropagation(); onEvento(ev); }} title={ev.titulo}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, borderLeft: `3px solid ${cor}`, background: 'var(--superficie-2)', borderRadius: 4, padding: '2px 5px', overflow: 'hidden' }}>
                    <span style={{ color: 'var(--texto-fraco)', flexShrink: 0 }}>{hhmm(ev.inicio)}</span>
                    <span style={{ color: 'var(--texto)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.titulo}</span>
                  </div>
                );
              })}
              {doDia.length > 3 && <span style={{ fontSize: 9.5, color: 'var(--texto-fraco)' }}>+{doDia.length - 3} mais</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const colColab: React.CSSProperties = { width: 220, minWidth: 220, flex: '0 0 auto', borderRight: '1px solid var(--borda)', background: 'var(--superficie)', position: 'sticky', left: 0, zIndex: 2 };
const navBtn: React.CSSProperties = { width: 32, height: 32, borderRadius: 8, border: '1px solid var(--borda)', background: 'var(--superficie-2)', color: 'var(--texto)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' };
