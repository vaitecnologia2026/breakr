import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';
import { EstadoCarregando, EstadoErro } from './Clientes';

/**
 * Painel inicial "Hoje & Atrasados" — panorama agregado de todos os módulos.
 * Mostra o que precisa de atenção agora (ações) + métricas operacionais.
 *
 * Contrato: GET /painel/resumo → Resumo
 */

type Tom = 'info' | 'alerta' | 'erro';

interface Acao {
  chave: string;
  label: string;
  count: number;
  link: string;
  tom: Tom;
}

interface Resumo {
  clientes: { ativos: number; onboard: number; total: number };
  comercial: { leadsAtivos: number };
  operacao: {
    contratosEmVigor: number;
    conteudosEmProducao: number;
    onboardingsEmAndamento: number;
    candidatosEmProcesso: number;
  };
  motor: { execucoes: number };
  acoes: Acao[];
}

// Cor de acento por urgência da ação.
const TOM: Record<Tom, { cor: string; fundo: string }> = {
  erro: { cor: '#e2738a', fundo: 'rgba(148, 18, 44, 0.16)' },
  alerta: { cor: '#ffb44d', fundo: 'rgba(255, 148, 6, 0.14)' },
  info: { cor: '#9ec5f0', fundo: 'rgba(74, 163, 240, 0.14)' },
};

export function Inicio() {
  const { usuario } = useAuth();
  const primeiroNome = usuario?.nome?.split(' ')[0] ?? 'usuário';

  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);

  async function carregar() {
    setCarregando(true);
    setErro(false);
    try {
      const { data } = await api.get<Resumo>('/painel/resumo');
      setResumo(data);
    } catch {
      setErro(true);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>Olá, {primeiroNome}</h1>
        <p style={{ fontSize: 13.5, color: 'var(--texto-fraco)', marginTop: 2 }}>
          Seu panorama de hoje no Breakr OS
        </p>
      </div>

      {carregando ? (
        <EstadoCarregando />
      ) : erro || !resumo ? (
        <EstadoErro mensagem="Não foi possível carregar o painel." onTentar={carregar} />
      ) : (
        <>
          <SecaoAcoes acoes={resumo.acoes} />
          <Metricas resumo={resumo} />
        </>
      )}
    </div>
  );
}

/* --------------------------- Ações necessárias ------------------------ */

function SecaoAcoes({ acoes }: { acoes: Acao[] }) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--cinza-vapor)' }}>
        Precisa de você
      </h2>

      {acoes.length === 0 ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '18px 20px',
            borderRadius: 14,
            background: 'var(--superficie)',
            border: '1px solid var(--borda)',
          }}
        >
          <PontoBrilho cor="#2ecc71" />
          <span style={{ fontSize: 14, color: 'var(--texto-suave)' }}>
            Tudo em dia — nenhuma pendência aberta agora.
          </span>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 12,
          }}
        >
          {acoes.map((acao) => (
            <CardAcao key={acao.chave} acao={acao} />
          ))}
        </div>
      )}
    </section>
  );
}

function CardAcao({ acao }: { acao: Acao }) {
  const tom = TOM[acao.tom];
  return (
    <Link
      to={acao.link}
      className="brk-card-hover"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '16px 18px',
        borderRadius: 14,
        background: 'var(--superficie)',
        border: '1px solid var(--borda)',
        boxShadow: 'var(--sombra-card)',
      }}
    >
      <span
        style={{
          minWidth: 44,
          height: 44,
          borderRadius: 12,
          display: 'grid',
          placeItems: 'center',
          fontSize: 18,
          fontWeight: 800,
          color: tom.cor,
          background: tom.fundo,
        }}
      >
        {acao.count}
      </span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--cinza-vapor)' }}>
          {acao.label}
        </span>
        <span style={{ fontSize: 12.5, color: 'var(--texto-fraco)' }}>Ver e resolver →</span>
      </div>
    </Link>
  );
}

/* ------------------------------ Métricas ------------------------------ */

function Metricas({ resumo }: { resumo: Resumo }) {
  const cards = [
    { rotulo: 'Clientes ativos', valor: resumo.clientes.ativos, link: '/clientes' },
    { rotulo: 'Em onboarding', valor: resumo.clientes.onboard, link: '/clientes' },
    { rotulo: 'Leads no pipeline', valor: resumo.comercial.leadsAtivos, link: '/comercial' },
    { rotulo: 'Contratos em vigor', valor: resumo.operacao.contratosEmVigor, link: '/contratos' },
    { rotulo: 'Conteúdo em produção', valor: resumo.operacao.conteudosEmProducao, link: '/conteudos' },
    { rotulo: 'Candidatos em processo', valor: resumo.operacao.candidatosEmProcesso, link: '/recrutamento' },
  ];

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--cinza-vapor)' }}>Panorama</h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: 12,
        }}
      >
        {cards.map((c) => (
          <Link
            key={c.rotulo}
            to={c.link}
            className="brk-card-hover"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              padding: '16px 18px',
              borderRadius: 14,
              background: 'var(--superficie)',
              border: '1px solid var(--borda)',
            }}
          >
            <span style={{ fontSize: 26, fontWeight: 800, color: 'var(--cinza-vapor)' }}>
              {c.valor}
            </span>
            <span style={{ fontSize: 12.5, color: 'var(--texto-fraco)' }}>{c.rotulo}</span>
          </Link>
        ))}
      </div>
      <p style={{ fontSize: 12.5, color: 'var(--texto-fraco)' }}>
        {resumo.motor.execucoes} automação(ões) executada(s) pelo motor · {resumo.clientes.total}{' '}
        clientes na carteira
      </p>
    </section>
  );
}

/* ------------------------------ Primitivos ---------------------------- */

function PontoBrilho({ cor }: { cor: string }) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: 9,
        height: 9,
        borderRadius: 999,
        flexShrink: 0,
        background: cor,
        boxShadow: `0 0 8px ${cor}`,
      }}
    />
  );
}
