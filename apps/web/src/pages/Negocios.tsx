// Tela "Negócios" (CRM Comercial) — pipeline em Kanban por etapa, ligado ao
// backend real de Leads (/comercial/leads). Os cards podem ser arrastados entre
// as colunas; ao soltar, o status do lead é persistido via PATCH. Cada card mostra
// responsável, empresa, valor e a próxima ATIVIDADE do negócio (lida do endpoint
// existente /comercial/atividades — sem alterar o backend). Estados de
// carregando/erro/vazio no padrão das demais telas. Em modo demo, usa mock.
//
// COLUNAS PERSONALIZÁVEIS: o usuário pode adicionar, editar (renomear/remapear) e
// excluir colunas. A configuração fica no navegador (localStorage) — NÃO altera o
// backend. Cada coluna é uma VISÃO sobre um status validado do funil; por isso o
// drag-and-drop e o PATCH de status permanecem idênticos. Como há 6 status, há no
// máximo 6 colunas funcionais (cada etapa em uma coluna).
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { api } from '../lib/api';
import { comDemo, mockSeDemo } from '../lib/demo';
import { PaginaShell, EstadoCarregando, EstadoErro, MensagemErro } from '../components/primitivos';
import { Modal, Campo, CampoSelect, Btn } from '../components/ui';

type StatusLead = 'NOVO' | 'CONTATADO' | 'QUALIFICADO' | 'PROPOSTA' | 'GANHO' | 'PERDIDO';

interface Lead {
  id: string;
  nome: string;
  empresa: string | null;
  email: string | null;
  telefone: string | null;
  origem: string | null;
  status: StatusLead;
  valorEstimado: string | null;
  atualizadoEm: string;
  responsavel?: { nome: string } | null;
  cliente?: { nomeFantasia: string } | null;
}

// Atividade vinculada ao negócio (somente leitura, do endpoint já existente).
type StatusAtividade = 'PENDENTE' | 'CONCLUIDA';
interface Atividade {
  id: string;
  titulo: string;
  status: StatusAtividade;
  vencimento: string | null;
  lead?: { id: string } | null;
}

// Todos os status validados do funil (backend). A ordem define o padrão.
const TODOS_STATUS: StatusLead[] = ['NOVO', 'CONTATADO', 'QUALIFICADO', 'PROPOSTA', 'GANHO', 'PERDIDO'];

// Rótulos padrão das etapas conforme o wireframe (RD Station). São apenas o rótulo
// inicial de cada coluna; o valor `status` liga a coluna ao funil do backend.
const STATUS_LABEL_PADRAO: Record<StatusLead, string> = {
  NOVO: 'Entrada de Leads',
  CONTATADO: 'Tentando contato',
  QUALIFICADO: 'Contato realizado',
  PROPOSTA: 'Contato com decisor',
  GANHO: 'Ganho',
  PERDIDO: 'Perdido',
};

// Configuração de uma coluna: um status do funil + um rótulo editável.
interface ColunaCfg {
  status: StatusLead;
  titulo: string;
}

const COLUNAS_PADRAO: ColunaCfg[] = TODOS_STATUS.map((s) => ({ status: s, titulo: STATUS_LABEL_PADRAO[s] }));

// Persistência local da configuração das colunas (por navegador; não toca no backend).
const LS_COLUNAS = 'brk-negocios-colunas';

function carregarColunasSalvas(): ColunaCfg[] {
  try {
    const raw = localStorage.getItem(LS_COLUNAS);
    if (!raw) return COLUNAS_PADRAO;
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return COLUNAS_PADRAO;
    const valido = arr.filter(
      (c): c is ColunaCfg => !!c && typeof (c as ColunaCfg).titulo === 'string' && TODOS_STATUS.includes((c as ColunaCfg).status),
    );
    return valido.length ? valido : COLUNAS_PADRAO;
  } catch {
    return COLUNAS_PADRAO;
  }
}

const MOCK_LEADS: Lead[] = [
  { id: 'm1', nome: 'Guria Doceira', empresa: 'Guria Doceira Ltda', email: null, telefone: null, origem: 'Inbound', status: 'NOVO', valorEstimado: null, atualizadoEm: '2026-07-03T12:00:00Z', responsavel: { nome: 'Gustavo Costa' } },
  { id: 'm2', nome: 'Pizzayou', empresa: 'Pizzayou Ltda', email: null, telefone: null, origem: 'Scraping', status: 'CONTATADO', valorEstimado: null, atualizadoEm: '2026-07-06T12:00:00Z', responsavel: { nome: 'Gustavo Costa' } },
  { id: 'm3', nome: 'Fornalha Pizzaria', empresa: null, email: null, telefone: null, origem: null, status: 'QUALIFICADO', valorEstimado: '4150', atualizadoEm: '2026-07-06T12:00:00Z', responsavel: { nome: 'Gustavo Costa' } },
  { id: 'm4', nome: 'Bolonhê', empresa: 'Bolonhê Lasanhas', email: null, telefone: null, origem: null, status: 'PROPOSTA', valorEstimado: '8000', atualizadoEm: '2026-07-06T12:00:00Z', responsavel: { nome: 'Gustavo Costa' } },
];

const MOCK_ATIVIDADES: Atividade[] = [
  { id: 'a1', titulo: 'Ligação', status: 'PENDENTE', vencimento: new Date(Date.now() - 86400000).toISOString(), lead: { id: 'm2' } },
  { id: 'a2', titulo: 'Reunião', status: 'PENDENTE', vencimento: new Date().toISOString(), lead: { id: 'm3' } },
];

function formatValor(v: string | null): string {
  const n = v ? Number(v) : 0;
  return `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function diasDesde(iso: string): number {
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(ms / 86400000));
}

function mesmaData(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// Iniciais para o avatar do card (responsável ou nome do negócio).
function iniciais(nome?: string | null): string {
  if (!nome) return '—';
  const p = nome.trim().split(/\s+/);
  const s = (p[0]?.[0] ?? '') + (p.length > 1 ? p[p.length - 1][0] : '');
  return s.toUpperCase() || '—';
}

// Escolhe a atividade PENDENTE mais relevante do negócio (a de vencimento mais
// próximo; se nenhuma tiver data, a primeira pendente).
function melhorAtividade(ativs: Atividade[], leadId: string): Atividade | undefined {
  const pend = ativs.filter((a) => a.status === 'PENDENTE' && a.lead?.id === leadId);
  if (pend.length === 0) return undefined;
  const comData = pend.filter((a) => a.vencimento);
  if (comData.length === 0) return pend[0];
  return comData.sort((a, b) => new Date(a.vencimento as string).getTime() - new Date(b.vencimento as string).getTime())[0];
}

type TomAtividade = 'atrasada' | 'hoje' | 'neutro' | 'sem';

function etiquetaAtividade(atv: Atividade | undefined): { texto: string; tom: TomAtividade } {
  if (!atv) return { texto: 'Sem atividade', tom: 'sem' };
  if (!atv.vencimento) return { texto: atv.titulo, tom: 'neutro' };
  const v = new Date(atv.vencimento);
  const hoje = new Date();
  const hm = v.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const dm = v.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  if (mesmaData(v, hoje)) return { texto: `Hoje: ${atv.titulo} ${hm}`, tom: 'hoje' };
  if (v.getTime() < hoje.getTime()) return { texto: `Atrasada: ${atv.titulo}`, tom: 'atrasada' };
  return { texto: `${dm} ${hm}: ${atv.titulo}`, tom: 'neutro' };
}

const TOM_ESTILO: Record<TomAtividade, { bg: string; cor: string; borda: string }> = {
  atrasada: { bg: 'rgba(239,68,68,0.14)', cor: '#f5a3ae', borda: 'var(--vermelho-borda)' },
  hoje: { bg: 'rgba(34,197,94,0.14)', cor: '#86efac', borda: 'var(--verde-borda)' },
  neutro: { bg: 'var(--superficie-4)', cor: 'var(--texto-suave)', borda: 'var(--borda)' },
  sem: { bg: 'transparent', cor: 'var(--texto-fraco)', borda: 'var(--borda)' },
};

// Ícones de linha (padrão SVG monocromático do app).
function Ico({ children }: { children: ReactNode }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>{children}</svg>
  );
}
const IcoPessoa = () => <Ico><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></Ico>;
const IcoEmpresa = () => <Ico><path d="M3 21h18" /><path d="M5 21V7l7-4 7 4v14" /><path d="M9 9h.01M9 12h.01M9 15h.01M15 9h.01M15 12h.01M15 15h.01" /></Ico>;
const IcoAlerta = () => <Ico><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></Ico>;
const IcoEditar = () => <Ico><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></Ico>;
const IcoLixeira = () => <Ico><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></Ico>;

// Estado do editor de coluna (modal de adicionar/editar).
interface EditorColuna {
  modo: 'add' | 'edit';
  status: StatusLead;
  titulo: string;
  alvo?: StatusLead; // status original da coluna sendo editada
}

export function Negocios() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [colunas, setColunas] = useState<ColunaCfg[]>(() => carregarColunasSalvas());
  const [editor, setEditor] = useState<EditorColuna | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [erroAcao, setErroAcao] = useState<string | null>(null);
  const arrastando = useRef<string | null>(null);
  const [alvo, setAlvo] = useState<StatusLead | null>(null);

  // Persiste a configuração das colunas no navegador a cada mudança.
  useEffect(() => {
    try { localStorage.setItem(LS_COLUNAS, JSON.stringify(colunas)); } catch { /* ignora */ }
  }, [colunas]);

  async function carregar() {
    setCarregando(true);
    setErro(null);
    try {
      const { data } = await api.get<Lead[]>('/comercial/leads');
      setLeads(comDemo(data, MOCK_LEADS));
    } catch {
      setLeads(mockSeDemo(MOCK_LEADS));
    } finally {
      setCarregando(false);
    }
    // Atividades para a etiqueta do card — falha aqui NÃO bloqueia o pipeline.
    try {
      const { data } = await api.get<Atividade[]>('/comercial/atividades');
      setAtividades(comDemo(data, MOCK_ATIVIDADES));
    } catch {
      setAtividades(mockSeDemo(MOCK_ATIVIDADES));
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function aoSoltar(destino: StatusLead) {
    const id = arrastando.current;
    arrastando.current = null;
    setAlvo(null);
    if (!id) return;
    const atual = leads.find((l) => l.id === id);
    if (!atual || atual.status === destino) return;
    setErroAcao(null);
    // Atualização otimista; recarrega do servidor (que pode converter em cliente no GANHO).
    setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, status: destino } : l)));
    try {
      await api.patch(`/comercial/leads/${id}/status`, { status: destino });
      await carregar();
    } catch {
      setErroAcao('Não foi possível mover o negócio. Tente novamente.');
      await carregar();
    }
  }

  // ── Gerência de colunas (adicionar / editar / excluir / restaurar) ───────────
  const statusDisponiveis = TODOS_STATUS.filter((s) => !colunas.some((c) => c.status === s));

  // Status oferecidos no seletor do editor: os livres + (ao editar) o próprio.
  function opcoesStatusEditor(): StatusLead[] {
    const usados = new Set(colunas.map((c) => c.status));
    if (editor?.modo === 'edit' && editor.alvo) usados.delete(editor.alvo);
    return TODOS_STATUS.filter((s) => !usados.has(s));
  }

  function abrirAdicionar() {
    if (statusDisponiveis.length === 0) return;
    const s = statusDisponiveis[0];
    setEditor({ modo: 'add', status: s, titulo: STATUS_LABEL_PADRAO[s] });
  }

  function abrirEditar(col: ColunaCfg) {
    setEditor({ modo: 'edit', status: col.status, titulo: col.titulo, alvo: col.status });
  }

  function salvarEditor() {
    if (!editor) return;
    const titulo = editor.titulo.trim();
    if (!titulo) return;
    if (editor.modo === 'add') {
      setColunas((cs) => (cs.some((c) => c.status === editor.status) ? cs : [...cs, { status: editor.status, titulo }]));
    } else {
      setColunas((cs) => cs.map((c) => (c.status === editor.alvo ? { status: editor.status, titulo } : c)));
    }
    setEditor(null);
  }

  function excluirColuna(status: StatusLead) {
    if (!window.confirm('Excluir esta coluna? Os negócios com este status deixarão de aparecer no quadro (não serão apagados).')) return;
    setColunas((cs) => cs.filter((c) => c.status !== status));
  }

  const total = leads.length;

  return (
    <PaginaShell titulo="Negócios" subtitulo="Pipeline Kanban — arraste os cards entre as etapas">
      {carregando ? (
        <EstadoCarregando />
      ) : erro ? (
        <EstadoErro mensagem={erro} onTentar={carregar} />
      ) : (
        <>
          {erroAcao && <MensagemErro texto={erroAcao} />}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 12.5, color: 'var(--texto-suave)', fontWeight: 600 }}>{total} negócios</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Btn variante="secondary" tamanho="sm" onClick={abrirAdicionar} disabled={statusDisponiveis.length === 0}>+ Coluna</Btn>
              <Btn variante="secondary" tamanho="sm" onClick={() => setColunas(COLUNAS_PADRAO)}>Restaurar colunas</Btn>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8, alignItems: 'stretch' }}>
            {colunas.map((col) => {
              const doStatus = leads.filter((l) => l.status === col.status);
              const soma = doStatus.reduce((acc, l) => acc + (l.valorEstimado ? Number(l.valorEstimado) : 0), 0);
              return (
                <div
                  key={col.status}
                  onDragOver={(e) => { e.preventDefault(); if (alvo !== col.status) setAlvo(col.status); }}
                  onDragLeave={(e) => { if (e.currentTarget === e.target) setAlvo((a) => (a === col.status ? null : a)); }}
                  onDrop={() => aoSoltar(col.status)}
                  style={{
                    flex: '0 0 264px', background: 'var(--superficie-2)', borderRadius: 12, padding: 10,
                    border: `1px solid ${alvo === col.status ? 'var(--amarelo-fagulha)' : 'var(--borda)'}`,
                    transition: 'border-color 0.12s ease', display: 'flex', flexDirection: 'column',
                  }}
                >
                  {/* Cabeçalho da coluna: etapa + contagem, ações (editar/excluir) e soma abaixo. */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--texto)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{col.titulo}</span>
                      <span style={{ background: 'var(--superficie-4)', borderRadius: 999, fontSize: 10.5, fontWeight: 700, padding: '1px 7px', color: 'var(--texto-suave)', flex: '0 0 auto' }}>{doStatus.length}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 2, flex: '0 0 auto' }}>
                      <button type="button" title="Editar coluna" onClick={() => abrirEditar(col)} style={{ width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'transparent', color: 'var(--texto-fraco)', borderRadius: 6, cursor: 'pointer' }}><IcoEditar /></button>
                      <button type="button" title="Excluir coluna" onClick={() => excluirColuna(col.status)} style={{ width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'transparent', color: 'var(--texto-fraco)', borderRadius: 6, cursor: 'pointer' }}><IcoLixeira /></button>
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--texto-fraco)', marginTop: 2, marginBottom: 10 }}>{formatValor(String(soma))}</div>

                  {/* Corpo da coluna (área de drop). Vazia mostra um placeholder tracejado. */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minHeight: 40 }}>
                    {doStatus.length === 0 ? (
                      <div style={{ border: '1px dashed var(--borda-forte)', borderRadius: 10, padding: '16px 10px', textAlign: 'center', fontSize: 11.5, color: 'var(--texto-fraco)' }}>
                        Solte um negócio aqui
                      </div>
                    ) : doStatus.map((l) => {
                      const dias = diasDesde(l.atualizadoEm);
                      const et = etiquetaAtividade(melhorAtividade(atividades, l.id));
                      const est = TOM_ESTILO[et.tom];
                      const empresa = l.empresa || l.cliente?.nomeFantasia || null;
                      return (
                        <div
                          key={l.id}
                          draggable
                          onDragStart={(e) => { arrastando.current = l.id; e.dataTransfer.effectAllowed = 'move'; }}
                          onDragEnd={() => { arrastando.current = null; setAlvo(null); }}
                          style={{ background: 'var(--superficie)', border: '1px solid var(--borda)', borderRadius: 10, padding: 11, cursor: 'grab', display: 'flex', flexDirection: 'column', gap: 6 }}
                        >
                          {/* Título (negócio | origem) + avatar. */}
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 600, fontSize: 12.5, lineHeight: 1.3, color: 'var(--texto)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {l.nome}{l.origem ? ` | ${l.origem}` : ''}
                              </div>
                            </div>
                            <span style={{ width: 26, height: 26, borderRadius: 999, background: 'var(--gradiente-brasa)', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
                              {iniciais(l.responsavel?.nome ?? l.nome)}
                            </span>
                          </div>

                          {/* Responsável. */}
                          {l.responsavel?.nome && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--texto-suave)' }}>
                              <IcoPessoa />
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.responsavel.nome}</span>
                            </div>
                          )}

                          {/* Empresa. */}
                          {empresa && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--texto-fraco)' }}>
                              <IcoEmpresa />
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{empresa}</span>
                            </div>
                          )}

                          {/* Valor + etiqueta de atividade + contador de dias. */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 2 }}>
                            <b style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{formatValor(l.valorEstimado)}</b>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10.5, fontWeight: 600, padding: '2px 7px', borderRadius: 6, background: est.bg, color: est.cor, border: `1px solid ${est.borda}`, maxWidth: 150, minWidth: 0 }}>
                                {et.tom === 'sem' && <IcoAlerta />}
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{et.texto}</span>
                              </span>
                              <span style={{ fontSize: 11, color: 'var(--texto-fraco)', flex: '0 0 auto' }}>{dias}d</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Modal de adicionar / editar coluna. */}
      {editor && (
        <Modal
          titulo={editor.modo === 'add' ? 'Nova coluna' : 'Editar coluna'}
          onFechar={() => setEditor(null)}
          rodape={<><Btn variante="secondary" onClick={() => setEditor(null)}>Cancelar</Btn><Btn variante="primary" onClick={salvarEditor} disabled={!editor.titulo.trim()}>Salvar</Btn></>}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Campo rotulo="Nome da coluna" value={editor.titulo} onChange={(e) => setEditor((ed) => (ed ? { ...ed, titulo: e.target.value } : ed))} placeholder="Ex.: Reunião agendada" autoFocus />
            <CampoSelect rotulo="Etapa do funil" value={editor.status} onChange={(e) => setEditor((ed) => (ed ? { ...ed, status: e.target.value as StatusLead } : ed))}>
              {opcoesStatusEditor().map((s) => <option key={s} value={s}>{STATUS_LABEL_PADRAO[s]}</option>)}
            </CampoSelect>
            <p style={{ fontSize: 11.5, color: 'var(--texto-fraco)' }}>
              A etapa liga a coluna ao funil do backend — ao arrastar um card para cá, o negócio recebe esse status. Cada etapa só pode estar em uma coluna.
            </p>
          </div>
        </Modal>
      )}
    </PaginaShell>
  );
}
