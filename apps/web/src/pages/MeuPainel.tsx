// Tela "Meu Painel" (CRM Comercial) — visão do vendedor com dados REAIS:
// KPIs e listas computados dos Leads (/comercial/leads) e das Atividades
// (/comercial/atividades). Estados carregando/erro no padrão do app.
import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { comDemo, mockSeDemo } from '../lib/demo';
import { PaginaShell, EstadoCarregando, EstadoErro } from '../components/primitivos';
import { Card, Badge } from '../components/ui';

type StatusLead = 'NOVO' | 'CONTATADO' | 'QUALIFICADO' | 'PROPOSTA' | 'GANHO' | 'PERDIDO';

interface Lead {
  id: string; nome: string; empresa: string | null; status: StatusLead;
  valorEstimado: string | null; atualizadoEm: string; responsavel?: { nome: string } | null;
}
interface Atividade {
  id: string; titulo: string; tipo: string; status: 'PENDENTE' | 'CONCLUIDA';
  vencimento: string | null; lead?: { nome: string } | null;
}

const MOCK_LEADS: Lead[] = [
  { id: 'm1', nome: 'Guria Doceira', empresa: 'Guria Doceira Ltda', status: 'NOVO', valorEstimado: null, atualizadoEm: '2026-07-03T12:00:00Z' },
  { id: 'm2', nome: 'Fornalha Pizzaria', empresa: null, status: 'QUALIFICADO', valorEstimado: '4150', atualizadoEm: '2026-06-12T12:00:00Z' },
  { id: 'm3', nome: 'Bolonhê', empresa: 'Bolonhê Lasanhas', status: 'GANHO', valorEstimado: '8000', atualizadoEm: '2026-07-06T12:00:00Z' },
];
const MOCK_ATIV: Atividade[] = [
  { id: 'a1', titulo: 'Ligação de contato', tipo: 'LIGACAO', status: 'PENDENTE', vencimento: new Date().toISOString(), lead: { nome: 'KI PIZZA TEUTÔNIA' } },
];

const ETAPAS: { status: StatusLead; rotulo: string }[] = [
  { status: 'NOVO', rotulo: 'Novo' },
  { status: 'CONTATADO', rotulo: 'Contatado' },
  { status: 'QUALIFICADO', rotulo: 'Qualificado' },
  { status: 'PROPOSTA', rotulo: 'Proposta' },
  { status: 'GANHO', rotulo: 'Ganho' },
  { status: 'PERDIDO', rotulo: 'Perdido' },
];

function brl(n: number): string {
  return `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function dias(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000));
}
function horaLabel(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
function mesmoMes(iso: string, ref: Date): boolean {
  const d = new Date(iso);
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
}

// ── Ícones (SVG inline, sem dependência nova) ──────────────────────────────
type IcoProps = { size?: number };
const svg = (size: number, path: ReactNode) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">{path}</svg>
);
const IcoCifrao = ({ size = 16 }: IcoProps) => svg(size, <><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></>);
const IcoCheck = ({ size = 16 }: IcoProps) => svg(size, <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></>);
const IcoTrend = ({ size = 16 }: IcoProps) => svg(size, <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></>);
const IcoRelogio = ({ size = 16 }: IcoProps) => svg(size, <><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>);
const IcoTelefone = ({ size = 16 }: IcoProps) => svg(size, <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.94.36 1.85.7 2.73a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.35-1.35a2 2 0 0 1 2.11-.45c.88.33 1.79.57 2.73.7A2 2 0 0 1 22 16.92z" />);
const IcoChat = ({ size = 16 }: IcoProps) => svg(size, <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />);
const IcoCamera = ({ size = 16 }: IcoProps) => svg(size, <><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><circle cx="12" cy="12" r="4" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></>);
const IcoEmail = ({ size = 16 }: IcoProps) => svg(size, <><rect x="2" y="4" width="20" height="16" rx="2" /><polyline points="22,6 12,13 2,6" /></>);
const IcoCalendario = ({ size = 16 }: IcoProps) => svg(size, <><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></>);
const IcoEmpresa = ({ size = 14 }: IcoProps) => svg(size, <><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="9" y1="9" x2="9" y2="9.01" /><line x1="15" y1="9" x2="15" y2="9.01" /><line x1="9" y1="13" x2="9" y2="13.01" /><line x1="15" y1="13" x2="15" y2="13.01" /></>);
const IcoAlerta = ({ size = 16 }: IcoProps) => svg(size, <><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12" y2="17.01" /></>);
const IcoMais = ({ size = 18 }: IcoProps) => svg(size, <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>);
const IcoGrafico = ({ size = 18 }: IcoProps) => svg(size, <><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></>);
const IcoSeta = ({ size = 18 }: IcoProps) => svg(size, <><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></>);

// Ícone + cor por tipo de atividade.
function ativVisual(tipo: string): { ico: ReactNode; rotulo: string } {
  switch ((tipo || '').toUpperCase()) {
    case 'LIGACAO': return { ico: <IcoTelefone />, rotulo: 'LIGAÇÃO' };
    case 'WHATSAPP': return { ico: <IcoChat />, rotulo: 'WHATSAPP' };
    case 'EMAIL': return { ico: <IcoEmail />, rotulo: 'EMAIL' };
    case 'INSTAGRAM': return { ico: <IcoCamera />, rotulo: 'INSTAGRAM' };
    case 'REUNIAO': return { ico: <IcoCalendario />, rotulo: 'REUNIÃO' };
    default: return { ico: <IcoRelogio />, rotulo: (tipo || 'ATIVIDADE').toUpperCase() };
  }
}

function Kpi({ rotulo, valor, hint, cor, corIcone, ico }: {
  rotulo: string; valor: string; hint?: string; cor?: string; corIcone: string; ico: ReactNode;
}) {
  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ color: 'var(--texto-fraco)', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>{rotulo}</div>
        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 9, background: `color-mix(in srgb, ${corIcone} 16%, transparent)`, color: corIcone, flexShrink: 0 }}>{ico}</span>
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: 0.3, color: cor ?? 'var(--texto)' }}>{valor}</div>
      {hint && <div style={{ color: 'var(--texto-fraco)', fontSize: 11.5, marginTop: 3 }}>{hint}</div>}
    </Card>
  );
}
function Painel({ titulo, acao, children }: { titulo: ReactNode; acao?: ReactNode; children: ReactNode }) {
  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 10 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>{titulo}</h3>
        {acao}
      </div>
      {children}
    </Card>
  );
}

export function MeuPainel() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [ativ, setAtiv] = useState<Atividade[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  async function carregar() {
    setCarregando(true);
    setErro(null);
    try {
      const { data } = await api.get<Lead[]>('/comercial/leads');
      setLeads(comDemo(data, MOCK_LEADS));
      api.get<Atividade[]>('/comercial/atividades')
        .then(({ data: a }) => setAtiv(comDemo(a, MOCK_ATIV)))
        .catch(() => setAtiv(mockSeDemo(MOCK_ATIV)));
    } catch {
      setLeads(mockSeDemo(MOCK_LEADS));
      setAtiv(mockSeDemo(MOCK_ATIV));
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  const hoje = new Date();
  const dataLonga = hoje.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  if (carregando) {
    return <PaginaShell titulo="Meu Painel" subtitulo={dataLonga}><EstadoCarregando /></PaginaShell>;
  }
  if (erro) {
    return <PaginaShell titulo="Meu Painel" subtitulo={dataLonga}><EstadoErro mensagem={erro} onTentar={carregar} /></PaginaShell>;
  }

  const abertos = leads.filter((l) => l.status !== 'GANHO' && l.status !== 'PERDIDO');
  const ganhos = leads.filter((l) => l.status === 'GANHO');
  const perdidos = leads.filter((l) => l.status === 'PERDIDO');
  const totalPipeline = abertos.reduce((s, l) => s + (l.valorEstimado ? Number(l.valorEstimado) : 0), 0);
  const fechados = ganhos.length + perdidos.length;
  const taxa = fechados > 0 ? Math.round((ganhos.length / fechados) * 100) : 0;
  const ativHoje = ativ
    .filter((a) => a.status === 'PENDENTE' && a.vencimento && new Date(a.vencimento).toDateString() === hoje.toDateString())
    .sort((a, b) => new Date(a.vencimento ?? 0).getTime() - new Date(b.vencimento ?? 0).getTime());
  const parados = [...abertos]
    .filter((l) => dias(l.atualizadoEm) >= 7)
    .sort((a, b) => new Date(a.atualizadoEm).getTime() - new Date(b.atualizadoEm).getTime())
    .slice(0, 10);

  // Ganhos/Perdidos do mês corrente.
  const ganhosMes = ganhos.filter((l) => mesmoMes(l.atualizadoEm, hoje));
  const perdidosMes = perdidos.filter((l) => mesmoMes(l.atualizadoEm, hoje));
  const valorGanhosMes = ganhosMes.reduce((s, l) => s + (l.valorEstimado ? Number(l.valorEstimado) : 0), 0);

  // Negócios por etapa (nosso funil de status) — contagem + soma de valor.
  const porEtapa = ETAPAS.map((e) => {
    const doStatus = leads.filter((l) => l.status === e.status);
    return {
      rotulo: e.rotulo,
      qtd: doStatus.length,
      valor: doStatus.reduce((s, l) => s + (l.valorEstimado ? Number(l.valorEstimado) : 0), 0),
    };
  });
  const maxEtapa = Math.max(1, ...porEtapa.map((e) => e.qtd));

  return (
    <PaginaShell titulo="Meu Painel" subtitulo={dataLonga}>
      {/* KPIs */}
      <div className="brk-rgrid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <Kpi rotulo="Total em Pipeline" valor={brl(totalPipeline)} hint={`${abertos.length} negócios abertos`} corIcone="var(--amarelo-fagulha)" ico={<IcoCifrao />} />
        <Kpi rotulo="Ganhos no Mês" valor={brl(valorGanhosMes)} hint={`${ganhosMes.length} negócios fechados`} cor="var(--texto)" corIcone="var(--verde)" ico={<IcoCheck />} />
        <Kpi rotulo="Taxa de Conversão" valor={`${taxa}%`} hint="negócios fechados" corIcone="var(--azul)" ico={<IcoTrend />} />
        <Kpi rotulo="Atividades Hoje" valor={String(ativHoje.length)} hint="pendentes" corIcone="#a855f7" ico={<IcoRelogio />} />
      </div>

      {/* Negócios parados */}
      <Painel
        titulo={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><span style={{ color: 'var(--amarelo-fagulha)' }}><IcoAlerta /></span> Negócios parados</span>}
        acao={<span style={{ color: 'var(--texto-fraco)', fontSize: 12 }}>{parados.length} {parados.length === 1 ? 'negócio' : 'negócios'}</span>}
      >
        {parados.length === 0 ? (
          <div style={{ color: 'var(--texto-fraco)', fontSize: 12.5 }}>Nenhum negócio parado.</div>
        ) : parados.map((l) => {
          const d = dias(l.atualizadoEm);
          const etapa = ETAPAS.find((e) => e.status === l.status)?.rotulo ?? l.status;
          return (
            <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 4px', borderTop: '1px solid var(--borda)' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--texto-fraco)', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{l.nome}</div>
                <div style={{ color: 'var(--texto-fraco)', fontSize: 11.5, marginTop: 2, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span>{etapa}</span>
                  {l.empresa && <><span>·</span><span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><IcoEmpresa /> {l.empresa}</span></>}
                </div>
              </div>
              <Badge cor={d >= 7 ? 'amarelo' : 'neutro'}>{d} dias parado</Badge>
            </div>
          );
        })}
      </Painel>

      {/* Negócios por Etapa + Atividades de Hoje */}
      <div className="brk-rgrid-2" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 14 }}>
        <Painel titulo="Negócios por Etapa">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {porEtapa.map((e) => (
              <div key={e.rotulo} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 96, fontSize: 12, color: 'var(--texto-suave)', flexShrink: 0 }}>{e.rotulo}</span>
                <div style={{ flex: 1, height: 26, borderRadius: 6, background: 'var(--superficie-2)', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', inset: 0, width: `${Math.round((e.qtd / maxEtapa) * 100)}%`, minWidth: e.qtd > 0 ? 26 : 0, background: 'color-mix(in srgb, var(--azul) 30%, transparent)', borderRadius: 6 }} />
                  <span style={{ position: 'absolute', left: 8, top: 0, bottom: 0, display: 'flex', alignItems: 'center', fontSize: 12, fontWeight: 700, color: 'var(--texto)' }}>{e.qtd}</span>
                </div>
                <span style={{ width: 92, textAlign: 'right', fontSize: 12, color: 'var(--texto-suave)', flexShrink: 0 }}>{brl(e.valor)}</span>
              </div>
            ))}
          </div>
        </Painel>

        <Painel titulo="Atividades de Hoje" acao={<Link to="/atividades" style={{ color: 'var(--amarelo-fagulha)', fontSize: 12, textDecoration: 'none' }}>Ver todas</Link>}>
          {ativHoje.length === 0 ? (
            <div style={{ color: 'var(--texto-fraco)', fontSize: 12.5 }}>Sem atividades para hoje.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {ativHoje.map((a) => {
                const v = ativVisual(a.tipo);
                return (
                  <div key={a.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '10px 2px', borderTop: '1px solid var(--borda)' }}>
                    <span style={{ color: 'var(--texto-suave)', marginTop: 2, flexShrink: 0 }}>{v.ico}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 0.4, color: 'var(--texto-fraco)' }}>{v.rotulo} {horaLabel(a.vencimento)}</div>
                      <div style={{ fontWeight: 600, fontSize: 12.5, marginTop: 2 }}>{a.titulo}</div>
                      {a.lead?.nome && <div style={{ fontSize: 11.5, marginTop: 2, color: 'var(--amarelo-fagulha)' }}>{a.lead.nome}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 0.4, color: 'var(--texto-fraco)', marginBottom: 8 }}>ESTE MÊS</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ border: '1px solid color-mix(in srgb, var(--verde) 40%, var(--borda))', borderRadius: 10, padding: '12px 10px', textAlign: 'center', background: 'color-mix(in srgb, var(--verde) 8%, transparent)' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--verde)' }}>{ganhosMes.length}</div>
                <div style={{ fontSize: 11.5, color: 'var(--texto-suave)' }}>Ganhos</div>
              </div>
              <div style={{ border: '1px solid color-mix(in srgb, var(--vermelho) 40%, var(--borda))', borderRadius: 10, padding: '12px 10px', textAlign: 'center', background: 'color-mix(in srgb, var(--vermelho) 8%, transparent)' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--vermelho)' }}>{perdidosMes.length}</div>
                <div style={{ fontSize: 11.5, color: 'var(--texto-suave)' }}>Perdidos</div>
              </div>
            </div>
          </div>
        </Painel>
      </div>

      {/* Ações Rápidas */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.4, color: 'var(--texto-fraco)', marginBottom: 10 }}>Ações Rápidas</div>
        <div className="brk-rgrid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[
            { to: '/negocios', ico: <IcoMais />, cor: 'var(--amarelo-fagulha)', titulo: 'Novo Negócio', sub: 'Adicionar ao pipeline' },
            { to: '/atividades', ico: <IcoRelogio size={18} />, cor: 'var(--azul)', titulo: 'Nova Atividade', sub: 'Agendar tarefa' },
            { to: '/metricas', ico: <IcoGrafico />, cor: '#a855f7', titulo: 'Ver Relatórios', sub: 'Análise de desempenho' },
          ].map((a) => (
            <Link key={a.to} to={a.to} style={{ textDecoration: 'none' }}>
              <Card>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: 9, background: `color-mix(in srgb, ${a.cor} 16%, transparent)`, color: a.cor, flexShrink: 0 }}>{a.ico}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--texto)' }}>{a.titulo}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--texto-fraco)' }}>{a.sub}</div>
                  </div>
                  <span style={{ color: 'var(--texto-fraco)', flexShrink: 0 }}><IcoSeta /></span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </PaginaShell>
  );
}
