import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';
import { Carregando, ErroEstado } from '../components/ui';
import { MODO_DEMO } from '../lib/demo';

type Tom = 'info' | 'alerta' | 'erro';
interface Acao { chave: string; label: string; count: number; link: string; tom: Tom }
interface Resumo {
  clientes: { ativos: number; onboard: number; total: number };
  comercial: { leadsAtivos: number };
  operacao: { contratosEmVigor: number; conteudosEmProducao: number; onboardingsEmAndamento: number; candidatosEmProcesso: number };
  motor: { execucoes: number };
  csat: { media: number | null; total: number };
  acoes: Acao[];
}

interface PecaMinha {
  id: string;
  titulo: string;
  status: string;
  cliente: string | null;
  dataAgendada: string | null;
  atrasado: boolean;
}
interface ReuniaoHoje { id: string; titulo: string; data: string; meetLink: string | null }
interface MeuDia {
  cargo: string;
  pecas: PecaMinha[];
  atrasadas: number;
  reunioesHoje: ReuniaoHoje[];
  whatsappPendente: number;
  feriadoHoje: string | null;
  homeOfficeHoje: string[];
  financeiro: { faturasVencidas: number; faturasPendentes: number; contratosRevisao: number } | null;
  trafego: { campanhasAtivas: number } | null;
  cs: { atendimentosAbertos: number; onboardingsEmAndamento: number; onboardingsSlaEstourado: number } | null;
  comercial: { leadsAtivos: number } | null;
}

type IcoCor = 'verde' | 'amarelo' | 'laranja' | 'neutro';

// ── Ícones SVG ────────────────────────────────────────────────────────────────

function Svg({ children, size = 18 }: { children: React.ReactNode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

function IcoUsers() {
  return (
    <Svg>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </Svg>
  );
}
function IcoTrendUp() {
  return (
    <Svg>
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
      <polyline points="17 6 23 6 23 12"/>
    </Svg>
  );
}
function IcoFileText() {
  return (
    <Svg>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
    </Svg>
  );
}
function IcoUserPlus() {
  return (
    <Svg>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <line x1="19" y1="8" x2="19" y2="14"/>
      <line x1="22" y1="11" x2="16" y2="11"/>
    </Svg>
  );
}
function IcoImage() {
  return (
    <Svg>
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <circle cx="8.5" cy="8.5" r="1.5"/>
      <polyline points="21 15 16 10 5 21"/>
    </Svg>
  );
}
function IcoLayers() {
  return (
    <Svg>
      <polygon points="12 2 2 7 12 12 22 7 12 2"/>
      <polyline points="2 17 12 22 22 17"/>
      <polyline points="2 12 12 17 22 12"/>
    </Svg>
  );
}
function IcoZap() {
  return <Svg><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></Svg>;
}
function IcoAlertCircle() {
  return (
    <Svg size={14}>
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </Svg>
  );
}
function IcoStar() {
  return <Svg size={16}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></Svg>;
}
function IcoCheckCircle() {
  return (
    <Svg>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </Svg>
  );
}
function IcoChevronRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  );
}

// ── Configuração dos KPIs ─────────────────────────────────────────────────────

const STATS_CONFIG: Array<{
  chave: string; rotulo: string; link: string; cor: IcoCor;
  Ico: () => JSX.Element;
}> = [
  { chave: 'clientes.ativos',                   rotulo: 'Clientes ativos',           link: '/clientes',  cor: 'verde',   Ico: IcoUsers },
  { chave: 'comercial.leadsAtivos',             rotulo: 'Leads no pipeline',          link: '/comercial', cor: 'amarelo', Ico: IcoTrendUp },
  { chave: 'operacao.contratosEmVigor',         rotulo: 'Contratos em vigor',         link: '/contratos', cor: 'amarelo', Ico: IcoFileText },
  { chave: 'clientes.onboard',                  rotulo: 'Em onboarding',              link: '/clientes',  cor: 'laranja', Ico: IcoUserPlus },
  { chave: 'operacao.conteudosEmProducao',      rotulo: 'Conteúdos em produção',      link: '/conteudos', cor: 'neutro',  Ico: IcoImage },
  { chave: 'operacao.onboardingsEmAndamento',   rotulo: 'Onboardings em andamento',   link: '/clientes',  cor: 'neutro',  Ico: IcoLayers },
];

function getVal(resumo: Resumo, chave: string): number {
  const [a, b] = chave.split('.');
  return ((resumo as unknown as Record<string, Record<string, number>>)[a]?.[b] ?? 0);
}

const TOM_COR: Record<Tom, { bg: string; cor: string; bordaCor: string }> = {
  erro:   { bg: 'rgba(239,68,68,0.1)',   cor: 'var(--vermelho)', bordaCor: 'rgba(239,68,68,0.28)' },
  alerta: { bg: 'rgba(245,158,11,0.1)',  cor: 'var(--amarelo)',  bordaCor: 'rgba(245,158,11,0.28)' },
  info:   { bg: 'rgba(59,130,246,0.1)',  cor: 'var(--azul)',     bordaCor: 'rgba(59,130,246,0.28)' },
};

// ── Componente principal ──────────────────────────────────────────────────────

const MOCK_RESUMO: Resumo = {
  clientes: { ativos: 22, onboard: 3, total: 25 },
  comercial: { leadsAtivos: 8 },
  operacao: { contratosEmVigor: 20, conteudosEmProducao: 14, onboardingsEmAndamento: 3, candidatosEmProcesso: 7 },
  motor: { execucoes: 1842 },
  csat: { media: 4.7, total: 58 },
  acoes: [
    { chave: 'conteudos_aguardando', label: 'Peças aguardando aprovação', count: 4, link: '/conteudos', tom: 'alerta' },
    { chave: 'faturas_vencidas', label: 'Faturas vencidas', count: 1, link: '/cobrancas', tom: 'erro' },
    { chave: 'onboarding_pendente', label: 'Etapas de onboarding pendentes', count: 2, link: '/onboarding', tom: 'info' },
  ],
};
const MOCK_MEU_DIA: MeuDia = {
  cargo: 'SUPERADMIN',
  pecas: [
    { id: 'cn1', titulo: 'Post: Promocao Dia dos Namorados', status: 'IDEIA', cliente: 'Tua Pizza', dataAgendada: '2026-06-18T12:00:00Z', atrasado: false },
    { id: 'cn2', titulo: 'Reels: Tour pela cozinha', status: 'PRODUCAO', cliente: 'Rikai Sushi', dataAgendada: '2026-06-20T18:00:00Z', atrasado: false },
    { id: 'cn3', titulo: 'Carrossel: Cardapio de Verao', status: 'REVISAO', cliente: 'Bigger Pizzaria', dataAgendada: '2026-06-15T11:00:00Z', atrasado: true },
  ],
  atrasadas: 1,
  reunioesHoje: [
    { id: 'r1', titulo: 'Daily CS', data: '2026-06-17T09:00:00Z', meetLink: 'https://meet.google.com/abc-defg-hij' },
  ],
  whatsappPendente: 14,
  feriadoHoje: null,
  homeOfficeHoje: ['Marina Alves'],
  financeiro: { faturasVencidas: 1, faturasPendentes: 3, contratosRevisao: 1 },
  trafego: { campanhasAtivas: 4 },
  cs: { atendimentosAbertos: 14, onboardingsEmAndamento: 3, onboardingsSlaEstourado: 0 },
  comercial: { leadsAtivos: 8 },
};

export function Inicio() {
  const { usuario } = useAuth();
  const primeiroNome = usuario?.nome?.split(' ')[0] ?? 'usuário';
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [meuDia, setMeuDia] = useState<MeuDia | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);

  async function carregar() {
    setCarregando(true); setErro(false);
    try {
      const [r, m] = await Promise.all([
        api.get<Resumo>('/painel/resumo'),
        api.get<MeuDia>('/painel/meu-dia'),
      ]);
      setResumo(r.data ?? (MODO_DEMO ? MOCK_RESUMO : null));
      setMeuDia(m.data ?? (MODO_DEMO ? MOCK_MEU_DIA : null));
    } catch {
      setResumo(MODO_DEMO ? MOCK_RESUMO : null);
      setMeuDia(MODO_DEMO ? MOCK_MEU_DIA : null);
    }
    finally { setCarregando(false); }
  }

  useEffect(() => { carregar(); }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      {/* Saudação */}
      <div style={{ paddingBottom: 4 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.035em', lineHeight: 1.15 }}>
          Olá, <span className="brk-gradient-text">{primeiroNome}</span>
        </h1>
        <p style={{ fontSize: 13.5, color: 'var(--texto-fraco)', marginTop: 6 }}>
          Panorama operacional &middot;{' '}
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {carregando ? <Carregando /> : erro || !resumo ? (
        <ErroEstado mensagem="Não foi possível carregar o painel." onTentar={carregar} />
      ) : (
        <>
          {/* Meu dia — Hoje & Atrasados (personalizado por cargo) */}
          {meuDia && <MeuDiaSecao meuDia={meuDia} />}

          {/* KPI Grid */}
          <div className="brk-stats-grid">
            {STATS_CONFIG.map((s) => {
              const val = getVal(resumo, s.chave);
              const Ico = s.Ico;
              return (
                <Link
                  key={s.chave}
                  to={s.link}
                  className="brk-card brk-kpi-card brk-card-hover"
                  style={{ textDecoration: 'none' }}
                >
                  <div className={`brk-kpi-ico brk-kpi-ico-${s.cor}`}>
                    <Ico />
                  </div>
                  <div className="brk-kpi-valor">{val}</div>
                  <div className="brk-kpi-label">{s.rotulo}</div>
                </Link>
              );
            })}
          </div>

          {/* Status bar do motor */}
          <div className="brk-status-bar">
            <span className="brk-status-bar-dot verde" />
            <span style={{ color: 'var(--verde)', display: 'flex' }}>
              <IcoZap />
            </span>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--texto)' }}>
                Motor de automação ativo
              </span>
              <span style={{ fontSize: 12, color: 'var(--texto-fraco)' }}>
                {resumo.motor.execucoes} execução(ões) registrada(s) &middot; {resumo.clientes.total} clientes na carteira
              </span>
            </div>
            <span className="brk-status-bar-badge">Operacional</span>
          </div>

          {/* CSAT */}
          {resumo.csat.total > 0 && (
            <div className="brk-status-bar" style={{ gap: 14 }}>
              <span style={{ color: 'var(--amarelo)', display: 'flex' }}>
                <IcoStar />
              </span>
              <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--texto)', letterSpacing: '-0.02em' }}>
                {resumo.csat.media?.toFixed(1)}<span style={{ fontSize: 11, fontWeight: 500, color: 'var(--texto-fraco)', marginLeft: 3 }}>/5</span>
              </span>
              <div style={{ display: 'flex', gap: 2 }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <svg key={n} width={13} height={13} viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M12 3.5l2.6 5.27 5.82.85-4.21 4.1.99 5.79L12 16.77l-5.2 2.73.99-5.79-4.21-4.1 5.82-.85L12 3.5Z"
                      fill={n <= Math.round(resumo.csat.media ?? 0) ? '#ff9406' : 'transparent'}
                      stroke={n <= Math.round(resumo.csat.media ?? 0) ? '#ff9406' : 'var(--borda-forte)'}
                      strokeWidth="1.6" strokeLinejoin="round"
                    />
                  </svg>
                ))}
              </div>
              <span style={{ fontSize: 12.5, color: 'var(--texto-fraco)' }}>
                CSAT &middot; {resumo.csat.total} {resumo.csat.total === 1 ? 'avaliação' : 'avaliações'} de conteúdo
              </span>
            </div>
          )}

          {/* Pendências */}
          {resumo.acoes.length > 0 && (
            <section>
              <div className="brk-secao-titulo">
                <IcoAlertCircle />
                Precisa de atenção
                <span
                  style={{
                    fontSize: 10.5, fontWeight: 700,
                    background: 'rgba(239,68,68,0.12)', color: 'var(--vermelho)',
                    border: '1px solid rgba(239,68,68,0.25)',
                    borderRadius: 999, padding: '1px 7px', marginLeft: 2,
                  }}
                >
                  {resumo.acoes.length}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
                {resumo.acoes.map((a) => {
                  const t = TOM_COR[a.tom];
                  return (
                    <Link
                      key={a.chave}
                      to={a.link}
                      className="brk-card brk-card-hover"
                      style={{
                        display: 'flex', alignItems: 'center', gap: 14,
                        padding: '16px 18px', textDecoration: 'none',
                        borderLeft: `3px solid ${t.bordaCor}`,
                      }}
                    >
                      <span
                        style={{
                          minWidth: 44, height: 44, borderRadius: 10, flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 18, fontWeight: 800,
                          background: t.bg, color: t.cor,
                          border: `1px solid ${t.bordaCor}`,
                        }}
                      >
                        {a.count}
                      </span>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                        <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--texto)' }}>{a.label}</span>
                        <span style={{ fontSize: 12, color: 'var(--texto-fraco)' }}>Clique para resolver</span>
                      </div>
                      <span style={{ color: 'var(--texto-fraco)', opacity: 0.5, flexShrink: 0, display: 'flex' }}>
                        <IcoChevronRight />
                      </span>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {resumo.acoes.length === 0 && (
            <div className="brk-status-bar" style={{ borderColor: 'rgba(34,197,94,0.2)', background: 'rgba(34,197,94,0.04)' }}>
              <span style={{ color: 'var(--verde)', display: 'flex' }}>
                <IcoCheckCircle />
              </span>
              <span style={{ fontSize: 13.5, color: '#86efac', fontWeight: 600 }}>
                Tudo em dia — nenhuma pendência aberta agora.
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Meu dia (Hoje & Atrasados personalizado) ─────────────────────────────────

const STATUS_CONTEUDO_ROTULO: Record<string, string> = {
  IDEIA: 'Ideia',
  ROTEIRO: 'Roteiro',
  PRODUCAO: 'Em produção',
  REVISAO: 'Em revisão',
  APROVACAO_CLIENTE: 'Aprovação do cliente',
  AGENDADO: 'Agendado',
};

function MiniStat({ rotulo, valor, link, alerta }: { rotulo: string; valor: number; link: string; alerta?: boolean }) {
  return (
    <Link
      to={link}
      className="brk-card brk-card-hover"
      style={{
        display: 'flex', flexDirection: 'column', gap: 2, padding: '12px 14px',
        textDecoration: 'none', minWidth: 130, flex: '1 1 130px',
        borderLeft: alerta && valor > 0 ? '3px solid var(--vermelho)' : undefined,
      }}
    >
      <span style={{ fontSize: 22, fontWeight: 800, color: alerta && valor > 0 ? 'var(--vermelho)' : 'var(--texto)' }}>
        {valor}
      </span>
      <span style={{ fontSize: 12, color: 'var(--texto-fraco)' }}>{rotulo}</span>
    </Link>
  );
}

function MeuDiaSecao({ meuDia }: { meuDia: MeuDia }) {
  const { pecas, atrasadas, financeiro, trafego, cs, comercial, reunioesHoje, whatsappPendente, feriadoHoje, homeOfficeHoje } = meuDia;
  const temBlocos = financeiro || trafego || cs || comercial;
  const temConteudo = pecas.length > 0 || temBlocos || reunioesHoje.length > 0 || whatsappPendente > 0 || !!feriadoHoje || homeOfficeHoje.length > 0;

  if (!temConteudo) return null;

  const horaBR = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="brk-secao-titulo">
        Meu dia
        {atrasadas > 0 && (
          <span
            style={{
              fontSize: 10.5, fontWeight: 700,
              background: 'rgba(239,68,68,0.12)', color: 'var(--vermelho)',
              border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: 999, padding: '1px 7px', marginLeft: 2,
            }}
          >
            {atrasadas} atrasada{atrasadas === 1 ? '' : 's'}
          </span>
        )}
      </div>

      {feriadoHoje && (
        <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', fontSize: 13.5, fontWeight: 600, color: 'var(--amarelo)' }}>
          🌴 Hoje é feriado: {feriadoHoje} — sem expediente.
        </div>
      )}
      {homeOfficeHoje.length > 0 && (
        <div style={{ fontSize: 12.5, color: 'var(--texto-fraco)' }}>
          Em home office hoje: {homeOfficeHoje.join(', ')}
        </div>
      )}

      {/* Blocos por cargo */}
      {(temBlocos || whatsappPendente > 0) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          {financeiro && (
            <>
              <MiniStat rotulo="Faturas vencidas" valor={financeiro.faturasVencidas} link="/cobrancas" alerta />
              <MiniStat rotulo="Cobranças pendentes" valor={financeiro.faturasPendentes} link="/cobrancas" />
              <MiniStat rotulo="Contratos p/ revisar" valor={financeiro.contratosRevisao} link="/contratos" />
            </>
          )}
          {trafego && (
            <MiniStat rotulo="Campanhas ativas" valor={trafego.campanhasAtivas} link="/trafego" />
          )}
          {cs && (
            <>
              <MiniStat rotulo="Atendimentos abertos" valor={cs.atendimentosAbertos} link="/atendimento" />
              <MiniStat rotulo="Onboardings em andamento" valor={cs.onboardingsEmAndamento} link="/onboarding" />
              <MiniStat rotulo="Onboarding SLA 3h estourado" valor={cs.onboardingsSlaEstourado} link="/onboarding" alerta />
            </>
          )}
          {comercial && (
            <MiniStat rotulo="Leads no pipeline" valor={comercial.leadsAtivos} link="/comercial" />
          )}
          {whatsappPendente > 0 && (
            <MiniStat rotulo="WhatsApp pendente" valor={whatsappPendente} link="/atendimento" alerta />
          )}
        </div>
      )}

      {/* Reuniões de hoje */}
      {reunioesHoje.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--texto-fraco)' }}>Reuniões de hoje</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {reunioesHoje.map((r) => (
              <div key={r.id} className="brk-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 14px' }}>
                <span style={{ fontSize: 13.5, color: 'var(--texto)' }}>
                  <strong style={{ color: 'var(--cinza-vapor)' }}>{horaBR(r.data)}</strong> · {r.titulo}
                </span>
                {r.meetLink && (
                  <a href={r.meetLink} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--cinza-vapor)', textDecoration: 'none' }}>
                    Entrar →
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Minhas peças (conteúdo atribuído a mim) */}
      {pecas.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--texto-fraco)' }}>
            Minhas peças ({pecas.length})
          </span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
            {pecas.map((p) => (
              <Link
                key={p.id}
                to="/conteudos"
                className="brk-card brk-card-hover"
                style={{
                  display: 'flex', flexDirection: 'column', gap: 4, padding: '12px 14px',
                  textDecoration: 'none',
                  borderLeft: p.atrasado ? '3px solid var(--vermelho)' : '3px solid var(--borda)',
                }}
              >
                <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--texto)' }}>{p.titulo}</span>
                <span style={{ fontSize: 12, color: 'var(--texto-fraco)' }}>
                  {p.cliente ?? 'Sem cliente'} · {STATUS_CONTEUDO_ROTULO[p.status] ?? p.status}
                </span>
                {p.atrasado && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--vermelho)' }}>Atrasada</span>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
