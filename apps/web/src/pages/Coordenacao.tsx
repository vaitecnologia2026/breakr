// Coordenação (Geral) — dashboard consolidado que "junta" as visões de Comercial,
// Sucesso do Cliente, Marketing/Conteúdo e Financeiro num único painel de
// coordenação. 100% aditivo e read-only: agrega endpoints que já existem
// (/painel/resumo, /faturas/indicadores, /contas-pagar/resumo) e degrada por área
// (Promise.allSettled) sem quebrar nada. NÃO substitui nem remove os dashboards
// de cada área — apenas consolida os números-chave e linka para eles.
import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { api } from '../lib/api';
import { PaginaHeader, Carregando, Alerta } from '../components/ui';

interface PainelResumo {
  clientes: { ativos: number; onboard: number; total: number };
  comercial: { leadsAtivos: number };
  operacao: {
    contratosEmVigor: number;
    conteudosEmProducao: number;
    onboardingsEmAndamento: number;
    candidatosEmProcesso: number;
  };
  csat: { media: number | null; total: number };
}
interface FaturasIndicadores {
  recebidoMes: number;
  aReceberSemana: number;
  aReceberTotal: number;
  pendentesTotal: number;
  pendentesEnviados: number;
}
interface ContasResumo {
  aPagarTotal: number;
  aPagarMes: number;
  vencidas: number;
}

const BRL = (n: number) => (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const NUM = (n: number | null | undefined) => (n == null ? '—' : Number(n).toLocaleString('pt-BR'));

function Kpi({ rotulo, valor, cor }: { rotulo: string; valor: string | number; cor?: string }) {
  return (
    <div className="brk-card brk-card-p" style={{ flex: '1 1 150px' }}>
      <div style={{ fontSize: 12, color: 'var(--texto-fraco)', textTransform: 'uppercase', letterSpacing: '.04em' }}>{rotulo}</div>
      <div style={{ fontSize: 20, fontWeight: 800, marginTop: 6, color: cor }}>{valor}</div>
    </div>
  );
}

function Secao({ titulo, para, paraRotulo, children }: { titulo: string; para: string; paraRotulo: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 22 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '4px 0 10px' }}>
        <h2 style={{ fontSize: 14, fontWeight: 700 }}>{titulo}</h2>
        <NavLink to={para} style={{ fontSize: 12.5, color: 'var(--acento, #6c8cff)', textDecoration: 'none', fontWeight: 600 }}>
          {paraRotulo} →
        </NavLink>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>{children}</div>
    </section>
  );
}

export function Coordenacao() {
  const [painel, setPainel] = useState<PainelResumo | null>(null);
  const [faturas, setFaturas] = useState<FaturasIndicadores | null>(null);
  const [contas, setContas] = useState<ContasResumo | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [semFinanceiro, setSemFinanceiro] = useState(false);

  useEffect(() => {
    (async () => {
      setCarregando(true);
      const [p, f, c] = await Promise.allSettled([
        api.get<PainelResumo>('/painel/resumo'),
        api.get<FaturasIndicadores>('/faturas/indicadores'),
        api.get<ContasResumo>('/contas-pagar/resumo'),
      ]);
      if (p.status === 'fulfilled') setPainel(p.value.data);
      if (f.status === 'fulfilled') setFaturas(f.value.data);
      if (c.status === 'fulfilled') setContas(c.value.data);
      // Financeiro é restrito ao financeiro/admin; se ambos falharem, apenas informa.
      if (f.status === 'rejected' && c.status === 'rejected') setSemFinanceiro(true);
      setCarregando(false);
    })();
  }, []);

  if (carregando) return <Carregando />;

  return (
    <>
      <PaginaHeader
        titulo="Coordenação"
        subtitulo="Visão consolidada das áreas — Comercial, Sucesso do Cliente, Marketing e Financeiro"
      />

      {!painel && (
        <Alerta tipo="info">Não foi possível carregar o resumo geral agora. Tente novamente em instantes.</Alerta>
      )}

      {painel && (
        <>
          <Secao titulo="Comercial" para="/comercial" paraRotulo="Abrir Comercial">
            <Kpi rotulo="Leads ativos" valor={NUM(painel.comercial?.leadsAtivos)} />
            <Kpi rotulo="Clientes ativos" valor={NUM(painel.clientes?.ativos)} cor="#10b981" />
            <Kpi rotulo="Clientes (total)" valor={NUM(painel.clientes?.total)} />
            <Kpi rotulo="Contratos em vigor" valor={NUM(painel.operacao?.contratosEmVigor)} />
          </Secao>

          <Secao titulo="Sucesso do Cliente" para="/nps-cliente" paraRotulo="Abrir NPS">
            <Kpi rotulo="Satisfação (CSAT)" valor={painel.csat?.media != null ? `${painel.csat.media}` : '—'} cor="#f5a623" />
            <Kpi rotulo="Respostas CSAT" valor={NUM(painel.csat?.total)} />
            <Kpi rotulo="Onboardings em andamento" valor={NUM(painel.operacao?.onboardingsEmAndamento)} />
            <Kpi rotulo="Clientes em onboarding" valor={NUM(painel.clientes?.onboard)} />
          </Secao>

          <Secao titulo="Marketing & Conteúdo" para="/dashboard-marketing" paraRotulo="Abrir Marketing">
            <Kpi rotulo="Conteúdos em produção" valor={NUM(painel.operacao?.conteudosEmProducao)} />
          </Secao>
        </>
      )}

      <Secao titulo="Financeiro" para="/financeiro" paraRotulo="Abrir Financeiro">
        {semFinanceiro ? (
          <div className="brk-card brk-card-p" style={{ flex: '1 1 100%' }}>
            <p style={{ fontSize: 13, color: 'var(--texto-fraco)' }}>
              Indicadores financeiros restritos ao financeiro/administração.
            </p>
          </div>
        ) : (
          <>
            <Kpi rotulo="Recebido no mês" valor={faturas ? BRL(faturas.recebidoMes) : '—'} cor="#10b981" />
            <Kpi rotulo="A receber (total)" valor={faturas ? BRL(faturas.aReceberTotal) : '—'} />
            <Kpi rotulo="A pagar (total)" valor={contas ? BRL(contas.aPagarTotal) : '—'} cor="#f5a623" />
            <Kpi rotulo="Contas vencidas" valor={contas ? NUM(contas.vencidas) : '—'} cor="#ef4444" />
          </>
        )}
      </Secao>

      <div className="brk-card brk-card-p">
        <p style={{ fontSize: 12.5, color: 'var(--texto-fraco)' }}>
          Painel de coordenação — números consolidados das áreas. Cada seção abre o dashboard
          completo da respectiva área. Áreas sem permissão para o seu perfil aparecem como “—”.
        </p>
      </div>
    </>
  );
}
