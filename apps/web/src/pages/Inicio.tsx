import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';
import { Carregando, ErroEstado, Badge } from '../components/ui';

type Tom = 'info' | 'alerta' | 'erro';
interface Acao { chave: string; label: string; count: number; link: string; tom: Tom }
interface Resumo {
  clientes: { ativos: number; onboard: number; total: number };
  comercial: { leadsAtivos: number };
  operacao: { contratosEmVigor: number; conteudosEmProducao: number; onboardingsEmAndamento: number; candidatosEmProcesso: number };
  motor: { execucoes: number };
  acoes: Acao[];
}

const STATS_CONFIG = [
  { chave: 'clientes.ativos', rotulo: 'Clientes ativos', link: '/clientes', icone: '◉', cor: 'verde' as const },
  { chave: 'comercial.leadsAtivos', rotulo: 'Leads no pipeline', link: '/comercial', icone: '◈', cor: 'amarelo' as const },
  { chave: 'operacao.contratosEmVigor', rotulo: 'Contratos em vigor', link: '/contratos', icone: '◫', cor: 'amarelo' as const },
  { chave: 'clientes.onboard', rotulo: 'Em onboarding', link: '/clientes', icone: '◐', cor: 'neutro' as const },
  { chave: 'operacao.conteudosEmProducao', rotulo: 'Conteúdos em produção', link: '/conteudos', icone: '◧', cor: 'neutro' as const },
  { chave: 'operacao.onboardingsEmAndamento', rotulo: 'Onboardings em andamento', link: '/clientes', icone: '◎', cor: 'neutro' as const },
] as const;

function getVal(resumo: Resumo, chave: string): number {
  const [a, b] = chave.split('.');
  return ((resumo as unknown as Record<string, Record<string, number>>)[a]?.[b] ?? 0);
}

const TOM_COR: Record<Tom, { badge: 'verde' | 'vermelho' | 'amarelo' | 'neutro'; bg: string }> = {
  erro: { badge: 'vermelho', bg: 'rgba(239,68,68,0.1)' },
  alerta: { badge: 'amarelo', bg: 'rgba(245,158,11,0.1)' },
  info: { badge: 'neutro', bg: 'rgba(59,130,246,0.1)' },
};

export function Inicio() {
  const { usuario } = useAuth();
  const primeiroNome = usuario?.nome?.split(' ')[0] ?? 'usuário';
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);

  async function carregar() {
    setCarregando(true); setErro(false);
    try {
      const { data } = await api.get<Resumo>('/painel/resumo');
      setResumo(data);
    } catch { setErro(true); }
    finally { setCarregando(false); }
  }

  useEffect(() => { carregar(); }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* Saudação */}
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em' }}>
          Olá, <span className="brk-gradient-text">{primeiroNome}</span>
        </h1>
        <p style={{ fontSize: 13.5, color: 'var(--texto-fraco)', marginTop: 4 }}>
          Panorama operacional · {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {carregando ? <Carregando /> : erro || !resumo ? (
        <ErroEstado mensagem="Não foi possível carregar o painel." onTentar={carregar} />
      ) : (
        <>
          {/* Stats grid */}
          <div className="brk-stats-grid">
            {STATS_CONFIG.map((s) => {
              const val = getVal(resumo, s.chave);
              return (
                <Link
                  key={s.chave}
                  to={s.link}
                  className="brk-card brk-card-stat brk-card-hover"
                  style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
                >
                  <div className="brk-card-stat-valor">{val}</div>
                  <div className="brk-card-stat-label">{s.rotulo}</div>
                  <Badge cor={s.cor}>{val === 1 ? 'registro' : 'registros'}</Badge>
                </Link>
              );
            })}
          </div>

          {/* Motor info */}
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '12px 16px', borderRadius: 'var(--r-lg)',
              background: 'var(--superficie)', border: '1px solid var(--borda)',
            }}
          >
            <span
              style={{
                width: 8, height: 8, borderRadius: 999, flexShrink: 0,
                background: 'var(--verde)', boxShadow: '0 0 8px var(--verde)',
              }}
            />
            <span style={{ fontSize: 13, color: 'var(--texto-suave)' }}>
              Motor de automação ativo —{' '}
              <strong style={{ color: 'var(--texto)' }}>{resumo.motor.execucoes}</strong>{' '}
              execução(ões) registrada(s) ·{' '}
              <strong style={{ color: 'var(--texto)' }}>{resumo.clientes.total}</strong> clientes na carteira
            </span>
          </div>

          {/* Pendências */}
          {resumo.acoes.length > 0 && (
            <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--texto-suave)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Precisa de atenção
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
                {resumo.acoes.map((a) => {
                  const t = TOM_COR[a.tom];
                  return (
                    <Link
                      key={a.chave}
                      to={a.link}
                      className="brk-card brk-card-hover"
                      style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px' }}
                    >
                      <span
                        style={{
                          minWidth: 40, height: 40, borderRadius: 10,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 17, fontWeight: 800,
                          background: t.bg,
                          color: t.badge === 'vermelho' ? 'var(--vermelho)' : t.badge === 'amarelo' ? 'var(--amarelo)' : 'var(--azul)',
                        }}
                      >
                        {a.count}
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                        <span style={{ fontSize: 13.5, fontWeight: 600 }}>{a.label}</span>
                        <span style={{ fontSize: 12, color: 'var(--texto-fraco)' }}>Clique para resolver →</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {resumo.acoes.length === 0 && (
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 18px', borderRadius: 'var(--r-lg)',
                background: 'var(--verde-fundo)', border: '1px solid var(--verde-borda)',
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--verde)', boxShadow: '0 0 6px var(--verde)', flexShrink: 0 }} />
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
