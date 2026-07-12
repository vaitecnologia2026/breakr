// Dashboard da Coordenadora de Marketing (Briefing Marketing — Seções 5 e 6).
// Somente leitura: 4 blocos (Produção, Campanhas, Onboarding, Capacidade) + a
// Central de Alertas por prioridade. Consome GET /dashboard-marketing. Aditivo —
// não altera nenhuma página existente.
import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api';
import {
  PaginaHeader, Btn, Campo, CampoSelect, Badge, Modal,
  Carregando, Vazio, ErroEstado,
} from '../components/ui';

type Prioridade = 'ALTA' | 'MEDIA' | 'BAIXA';

interface Alerta {
  tipo: string; prioridade: Prioridade; titulo: string; descricao: string;
  link?: string; referenciaId?: string;
}
interface EtapaProducao { status: string; rotulo: string; total: number }
interface Parado {
  id: string; titulo: string; status: string; statusRotulo: string;
  horasParado: number; campanha: string | null; cliente: string | null; responsavel: string | null;
}
interface CampanhaLinha {
  id: string; nome: string; situacao: string; prazo: string | null;
  diasParaPrazo: number | null; cliente: string | null; squad: string | null;
  totalMateriais: number; materiaisIniciados: number; semInicio: boolean;
}
interface OnboardingLinha {
  clienteId: string | null; cliente: string | null; progresso: number;
  etapaAtual: string | null; etapasConcluidas: number; etapasTotal: number;
  pilarMarketing: boolean; semSquad: boolean;
}
interface Membro { id: string; nome: string; abertas: number; sobrecarregado: boolean }
interface CargaSquad { id: string | null; nome: string; abertas: number }
interface Painel {
  geradoEm: string;
  parametros: {
    paradoHoras: number; criticoHoras: number; aprovacaoParadaDias: number;
    ajusteDias: number; campanhaSemInicioDias: number; sobrecargaTarefas: number;
  };
  producao: { totalMateriais: number; etapas: EtapaProducao[]; parados: Parado[]; totalParados: number };
  campanhas: CampanhaLinha[];
  onboarding: OnboardingLinha[];
  capacidade: { membros: Membro[]; squads: CargaSquad[]; limiteSobrecarga: number };
  alertas: Alerta[];
  resumoAlertas: { total: number; alta: number; media: number; baixa: number };
}
interface OpcoesFiltro {
  squads: { id: string; nome: string }[];
  clientes: { id: string; nomeFantasia: string }[];
}

const SITUACAO_ROTULO: Record<string, string> = {
  PLANEJADA: 'Planejada', EM_ANDAMENTO: 'Em andamento', CONCLUIDA: 'Concluída',
};

function corPrioridade(p: Prioridade): 'vermelho' | 'amarelo' | 'neutro' {
  return p === 'ALTA' ? 'vermelho' : p === 'MEDIA' ? 'amarelo' : 'neutro';
}

export function DashboardMarketing() {
  const [dados, setDados] = useState<Painel | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);
  const [opcoes, setOpcoes] = useState<OpcoesFiltro>({ squads: [], clientes: [] });
  const [squadId, setSquadId] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [modalConfig, setModalConfig] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(false);
    try {
      const params: Record<string, string> = {};
      if (squadId) params.squadId = squadId;
      if (clienteId) params.clienteId = clienteId;
      const { data } = await api.get<Painel>('/dashboard-marketing', { params });
      setDados(data);
    } catch {
      setErro(true);
    } finally {
      setCarregando(false);
    }
  }, [squadId, clienteId]);

  useEffect(() => {
    api.get<OpcoesFiltro>('/dashboard-marketing/filtros')
      .then(({ data }) => setOpcoes(data))
      .catch(() => setOpcoes({ squads: [], clientes: [] }));
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  return (
    <div>
      <PaginaHeader
        titulo="Dashboard de Marketing"
        subtitulo="Visão da coordenadora: produção, campanhas, onboarding, capacidade e alertas."
        acoes={
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn variante="secondary" onClick={() => setModalConfig(true)}>Configurar prazos</Btn>
            <Btn variante="secondary" onClick={() => carregar()}>Atualizar</Btn>
          </div>
        }
      />

      {modalConfig && (
        <ModalConfigAlertas
          onFechar={() => setModalConfig(false)}
          onSalvo={() => { setModalConfig(false); carregar(); }}
        />
      )}

      {/* Filtros por squad e cliente (Seção 5, Bloco 1). */}
      <div className="brk-card brk-card-p" style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ minWidth: 200 }}>
          <CampoSelect rotulo="Squad" value={squadId} onChange={(e) => setSquadId(e.target.value)}>
            <option value="">Todos os squads</option>
            {opcoes.squads.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </CampoSelect>
        </div>
        <div style={{ minWidth: 200 }}>
          <CampoSelect rotulo="Cliente" value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
            <option value="">Todos os clientes</option>
            {opcoes.clientes.map((c) => <option key={c.id} value={c.id}>{c.nomeFantasia}</option>)}
          </CampoSelect>
        </div>
        {(squadId || clienteId) && (
          <Btn variante="secondary" onClick={() => { setSquadId(''); setClienteId(''); }}>Limpar</Btn>
        )}
      </div>

      {carregando && <Carregando />}
      {!carregando && erro && <ErroEstado mensagem="Não foi possível carregar o dashboard." onTentar={carregar} />}

      {!carregando && !erro && dados && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginTop: 16 }}>

          {/* ---------- CENTRAL DE ALERTAS (Seção 6) ---------- */}
          <section className="brk-card brk-card-p">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <h3 style={{ margin: 0 }}>Central de alertas</h3>
              <div style={{ display: 'flex', gap: 8 }}>
                <Badge cor="vermelho">{dados.resumoAlertas.alta} alta</Badge>
                <Badge cor="amarelo">{dados.resumoAlertas.media} média</Badge>
                <Badge cor="neutro">{dados.resumoAlertas.baixa} baixa</Badge>
              </div>
            </div>
            {dados.alertas.length === 0 ? (
              <Vazio titulo="Nenhum alerta" subtitulo="Nada exige atenção imediata no momento." />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                {dados.alertas.map((a, i) => (
                  <div key={i} style={{
                    display: 'flex', gap: 12, alignItems: 'flex-start',
                    padding: '10px 12px', border: '1px solid var(--borda)', borderRadius: 8,
                    background: 'var(--superficie-2)',
                  }}>
                    <Badge cor={corPrioridade(a.prioridade)}>{a.titulo}</Badge>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: 'var(--texto)' }}>{a.descricao}</div>
                      {a.link && (
                        <a href={a.link} style={{ fontSize: 13, color: 'var(--azul)' }}>Abrir</a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ---------- BLOCO 1 — VISÃO DE PRODUÇÃO ---------- */}
          <section className="brk-card brk-card-p">
            <h3 style={{ marginTop: 0 }}>Visão de produção</h3>
            <p style={{ color: 'var(--texto-suave)', marginTop: 0 }}>
              {dados.producao.totalMateriais} materiais no pipeline · {dados.producao.totalParados} parado(s) há mais de {dados.parametros.paradoHoras}h.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
              {dados.producao.etapas.map((e) => (
                <div key={e.status} style={{
                  padding: '10px 12px', border: '1px solid var(--borda)', borderRadius: 8,
                }}>
                  <div style={{ fontSize: 13, color: 'var(--texto-suave)' }}>{e.rotulo}</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--texto)' }}>{e.total}</div>
                </div>
              ))}
            </div>
            {dados.producao.parados.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <h4 style={{ marginBottom: 8 }}>Parados na etapa</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {dados.producao.parados.map((p) => (
                    <div key={p.id} style={{
                      display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap',
                      padding: '8px 10px', border: '1px solid var(--borda)', borderRadius: 8,
                    }}>
                      <Badge cor="amarelo">{p.statusRotulo}</Badge>
                      <span style={{ flex: 1, color: 'var(--texto)' }}>
                        {p.titulo}{p.cliente ? ` — ${p.cliente}` : ''}
                      </span>
                      <span style={{ color: 'var(--texto-fraco)', fontSize: 13 }}>
                        {p.responsavel ?? 'Sem responsável'} · {p.horasParado}h
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* ---------- BLOCO 2 — CAMPANHAS ATIVAS E PLANEJADAS ---------- */}
          <section className="brk-card brk-card-p">
            <h3 style={{ marginTop: 0 }}>Campanhas ativas e planejadas</h3>
            {dados.campanhas.length === 0 ? (
              <Vazio titulo="Nenhuma campanha" subtitulo="Não há campanhas para o filtro atual." />
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', color: 'var(--texto-suave)', fontSize: 13 }}>
                      <th style={{ padding: '6px 8px' }}>Campanha</th>
                      <th style={{ padding: '6px 8px' }}>Cliente</th>
                      <th style={{ padding: '6px 8px' }}>Squad</th>
                      <th style={{ padding: '6px 8px' }}>Situação</th>
                      <th style={{ padding: '6px 8px' }}>Materiais</th>
                      <th style={{ padding: '6px 8px' }}>Prazo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dados.campanhas.map((c) => (
                      <tr key={c.id} style={{ borderTop: '1px solid var(--borda)' }}>
                        <td style={{ padding: '8px' }}>
                          {c.nome}{' '}
                          {c.semInicio && <Badge cor="vermelho">sem início</Badge>}
                        </td>
                        <td style={{ padding: '8px', color: 'var(--texto-suave)' }}>{c.cliente ?? '—'}</td>
                        <td style={{ padding: '8px', color: 'var(--texto-suave)' }}>{c.squad ?? '—'}</td>
                        <td style={{ padding: '8px' }}>
                          <Badge cor={c.situacao === 'CONCLUIDA' ? 'verde' : c.situacao === 'EM_ANDAMENTO' ? 'azul' : 'amarelo'}>
                            {SITUACAO_ROTULO[c.situacao] ?? c.situacao}
                          </Badge>
                        </td>
                        <td style={{ padding: '8px', color: 'var(--texto-suave)' }}>
                          {c.materiaisIniciados}/{c.totalMateriais} iniciados
                        </td>
                        <td style={{ padding: '8px', color: 'var(--texto-suave)' }}>
                          {c.prazo ? new Date(c.prazo).toLocaleDateString('pt-BR') : '—'}
                          {c.diasParaPrazo !== null && ` (${c.diasParaPrazo}d)`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* ---------- BLOCO 3 — CLIENTES EM ONBOARDING ---------- */}
          <section className="brk-card brk-card-p">
            <h3 style={{ marginTop: 0 }}>Clientes em onboarding</h3>
            {dados.onboarding.length === 0 ? (
              <Vazio titulo="Nenhum cliente em onboarding" subtitulo="Nenhum onboarding em andamento." />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {dados.onboarding.map((o, i) => (
                  <div key={o.clienteId ?? i} style={{
                    display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap',
                    padding: '8px 10px', border: '1px solid var(--borda)', borderRadius: 8,
                  }}>
                    <span style={{ flex: 1, color: 'var(--texto)' }}>{o.cliente ?? 'Cliente'}</span>
                    {o.pilarMarketing && <Badge cor="azul">Marketing</Badge>}
                    {o.semSquad && <Badge cor="vermelho">sem squad</Badge>}
                    <span style={{ color: 'var(--texto-suave)', fontSize: 13 }}>
                      {o.etapaAtual ?? 'Sem etapa'} · {o.etapasConcluidas}/{o.etapasTotal} · {o.progresso}%
                    </span>
                    {o.semSquad && o.clienteId && (
                      <VincularSquad clienteId={o.clienteId} squads={opcoes.squads} aoVincular={carregar} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ---------- BLOCO 4 — CAPACIDADE DO TIME ---------- */}
          <section className="brk-card brk-card-p">
            <h3 style={{ marginTop: 0 }}>Capacidade do time</h3>
            <p style={{ color: 'var(--texto-suave)', marginTop: 0 }}>
              Tarefas abertas por membro (acima de {dados.capacidade.limiteSobrecarga} = sobrecarregado).
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div>
                <h4 style={{ marginTop: 0, marginBottom: 8 }}>Por membro</h4>
                {dados.capacidade.membros.length === 0 ? (
                  <Vazio titulo="Sem tarefas abertas" />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {dados.capacidade.membros.map((m) => (
                      <div key={m.id} style={{
                        display: 'flex', gap: 10, alignItems: 'center',
                        padding: '8px 10px', border: '1px solid var(--borda)', borderRadius: 8,
                      }}>
                        <span style={{ flex: 1, color: 'var(--texto)' }}>{m.nome}</span>
                        <Badge cor={m.sobrecarregado ? 'vermelho' : 'verde'}>{m.abertas} tarefa(s)</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <h4 style={{ marginTop: 0, marginBottom: 8 }}>Por squad</h4>
                {dados.capacidade.squads.length === 0 ? (
                  <Vazio titulo="Sem squads" />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {dados.capacidade.squads.map((s, i) => (
                      <div key={s.id ?? i} style={{
                        display: 'flex', gap: 10, alignItems: 'center',
                        padding: '8px 10px', border: '1px solid var(--borda)', borderRadius: 8,
                      }}>
                        <span style={{ flex: 1, color: 'var(--texto)' }}>{s.nome}</span>
                        <Badge cor="neutro">{s.abertas} aberta(s)</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          <p style={{ color: 'var(--texto-fraco)', fontSize: 12, textAlign: 'right' }}>
            Gerado em {new Date(dados.geradoEm).toLocaleString('pt-BR')}
          </p>
        </div>
      )}
    </div>
  );
}

// Vincular squad ao cliente direto do bloco de onboarding (Fatia 9 — Seção 10).
function VincularSquad({
  clienteId,
  squads,
  aoVincular,
}: {
  clienteId: string;
  squads: { id: string; nome: string }[];
  aoVincular: () => void;
}) {
  const [squadId, setSquadId] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function vincular() {
    if (!squadId || salvando) return;
    setSalvando(true);
    try {
      await api.post(`/dashboard-marketing/onboarding/${clienteId}/vincular-squad`, { squadId });
      aoVincular();
    } catch {
      setSalvando(false);
    }
  }

  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      <select
        value={squadId}
        onChange={(e) => setSquadId(e.target.value)}
        className="brk-input"
        style={{ fontSize: 12, padding: '4px 6px' }}
        disabled={salvando}
      >
        <option value="">Vincular squad…</option>
        {squads.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
      </select>
      <Btn variante="secondary" onClick={vincular} disabled={!squadId || salvando}>Vincular</Btn>
    </div>
  );
}

// Configuração dos prazos/alertas do dashboard (Fatia 10 — Seção 6).
interface ParametrosAlertas {
  paradoHoras: number; criticoHoras: number; aprovacaoParadaDias: number;
  ajusteDias: number; campanhaSemInicioDias: number; sobrecargaTarefas: number;
}
function ModalConfigAlertas({ onFechar, onSalvo }: { onFechar: () => void; onSalvo: () => void }) {
  const [cfg, setCfg] = useState<ParametrosAlertas | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    api.get<ParametrosAlertas>('/dashboard-marketing/config')
      .then(({ data }) => setCfg(data))
      .catch(() => setErro('Não foi possível carregar a configuração.'));
  }, []);

  function set(campo: keyof ParametrosAlertas, valor: string) {
    if (!cfg) return;
    setCfg({ ...cfg, [campo]: Math.max(1, Number(valor) || 1) });
  }

  async function salvar() {
    if (!cfg || salvando) return;
    setSalvando(true);
    setErro(null);
    try {
      await api.patch('/dashboard-marketing/config', cfg);
      onSalvo();
    } catch {
      setErro('Não foi possível salvar.');
      setSalvando(false);
    }
  }

  return (
    <Modal
      titulo="Configurar prazos e alertas"
      onFechar={onFechar}
      rodape={
        <div style={{ display: 'flex', gap: 10 }}>
          <Btn variante="secondary" onClick={onFechar} disabled={salvando}>Cancelar</Btn>
          <Btn variante="primary" onClick={salvar} disabled={!cfg || salvando}>{salvando ? 'Salvando…' : 'Salvar'}</Btn>
        </div>
      }
    >
      {!cfg ? (
        <Carregando />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Campo rotulo="Parado na etapa (horas)" type="number" value={String(cfg.paradoHoras)} onChange={(e) => set('paradoHoras', e.target.value)} />
          <Campo rotulo="Prazo crítico (horas)" type="number" value={String(cfg.criticoHoras)} onChange={(e) => set('criticoHoras', e.target.value)} />
          <Campo rotulo="Aprovação parada (dias)" type="number" value={String(cfg.aprovacaoParadaDias)} onChange={(e) => set('aprovacaoParadaDias', e.target.value)} />
          <Campo rotulo="Material em ajuste (dias)" type="number" value={String(cfg.ajusteDias)} onChange={(e) => set('ajusteDias', e.target.value)} />
          <Campo rotulo="Campanha sem início (dias p/ prazo)" type="number" value={String(cfg.campanhaSemInicioDias)} onChange={(e) => set('campanhaSemInicioDias', e.target.value)} />
          <Campo rotulo="Sobrecarga (tarefas por membro)" type="number" value={String(cfg.sobrecargaTarefas)} onChange={(e) => set('sobrecargaTarefas', e.target.value)} />
          {erro && <p style={{ color: 'var(--vermelho)', fontSize: 13 }}>{erro}</p>}
        </div>
      )}
    </Modal>
  );
}
