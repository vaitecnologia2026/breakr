import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { comDemo, mockSeDemo } from '../lib/demo';
import {
  PaginaShell,
  Th,
  Td,
  RodapeContagem,
  BotaoSecundario,
  EstadoCarregando,
  EstadoErro,
  PainelVazio,
} from '../components/primitivos';

/**
 * Automações — o painel do motor próprio (substitui a tela do n8n).
 * Lista as regras configuráveis (trigger → ações) com liga/desliga e o log de
 * execuções reais (JobExecution). Restrito a Admin/Superadmin no backend.
 *
 * Contrato:
 *  GET   /motor/status     → { habilitado }
 *  GET   /motor/regras     → Regra[]
 *  GET   /motor/execucoes  → Execucao[]
 *  PATCH /motor/regras/:id/toggle → { id, ativa }
 */

interface Regra {
  id: string;
  nome: string;
  ativa: boolean;
  trigger: { evento?: string } | null;
  acoes: { tipo?: string }[] | null;
}

interface Execucao {
  id: string;
  status: string;
  resultado: { evento?: string; acoes?: { tipo: string; ok: boolean }[] } | null;
  erro: string | null;
  criadoEm: string;
  rule: { nome: string } | null;
}

function formatarQuando(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const MOCK_REGRAS: Regra[] = [
  { id: 'rg1', nome: 'Onboarding iniciado → criar etapas padrao', ativa: true, trigger: { evento: 'ONBOARDING_INICIADO' }, acoes: [{ tipo: 'CRIAR_ETAPAS' }, { tipo: 'ENVIAR_EMAIL' }] },
  { id: 'rg2', nome: 'Contrato assinado → criar projeto', ativa: true, trigger: { evento: 'CONTRATO_ASSINADO' }, acoes: [{ tipo: 'CRIAR_PROJETO' }, { tipo: 'NOTIFICAR_CS' }] },
  { id: 'rg3', nome: 'Fatura vencida → alerta Financeiro', ativa: true, trigger: { evento: 'FATURA_VENCIDA' }, acoes: [{ tipo: 'ENVIAR_WHATSAPP' }, { tipo: 'NOTIFICAR_FINANCEIRO' }] },
  { id: 'rg4', nome: 'Conteudo aprovado → agendar publicacao', ativa: false, trigger: { evento: 'CONTEUDO_APROVADO' }, acoes: [{ tipo: 'AGENDAR_PUBLICACAO' }] },
  { id: 'rg5', nome: 'Lead ganho → criar cliente', ativa: true, trigger: { evento: 'LEAD_GANHO' }, acoes: [{ tipo: 'CRIAR_CLIENTE' }, { tipo: 'CRIAR_CONTRATO' }] },
];
const MOCK_EXECUCOES: Execucao[] = [
  { id: 'ex1', status: 'SUCESSO', resultado: { evento: 'ONBOARDING_INICIADO', acoes: [{ tipo: 'CRIAR_ETAPAS', ok: true }, { tipo: 'ENVIAR_EMAIL', ok: true }] }, erro: null, criadoEm: '2026-06-17T09:15:00Z', rule: { nome: 'Onboarding iniciado → criar etapas padrao' } },
  { id: 'ex2', status: 'SUCESSO', resultado: { evento: 'CONTRATO_ASSINADO', acoes: [{ tipo: 'CRIAR_PROJETO', ok: true }, { tipo: 'NOTIFICAR_CS', ok: true }] }, erro: null, criadoEm: '2026-06-17T08:30:00Z', rule: { nome: 'Contrato assinado → criar projeto' } },
  { id: 'ex3', status: 'ERRO', resultado: null, erro: 'Timeout ao conectar com servidor de email', criadoEm: '2026-06-16T22:00:00Z', rule: { nome: 'Fatura vencida → alerta Financeiro' } },
  { id: 'ex4', status: 'SUCESSO', resultado: { evento: 'LEAD_GANHO', acoes: [{ tipo: 'CRIAR_CLIENTE', ok: true }, { tipo: 'CRIAR_CONTRATO', ok: true }] }, erro: null, criadoEm: '2026-06-16T15:45:00Z', rule: { nome: 'Lead ganho → criar cliente' } },
  { id: 'ex5', status: 'SUCESSO', resultado: { evento: 'ONBOARDING_INICIADO', acoes: [{ tipo: 'CRIAR_ETAPAS', ok: true }, { tipo: 'ENVIAR_EMAIL', ok: false }] }, erro: null, criadoEm: '2026-06-15T11:20:00Z', rule: { nome: 'Onboarding iniciado → criar etapas padrao' } },
];

export function Automacoes() {
  const [regras, setRegras] = useState<Regra[]>([]);
  const [execucoes, setExecucoes] = useState<Execucao[]>([]);
  const [habilitado, setHabilitado] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);
  const [alternando, setAlternando] = useState<string | null>(null);

  async function carregar() {
    setCarregando(true);
    setErro(false);
    try {
      const [status, rs, es] = await Promise.all([
        api.get<{ habilitado: boolean }>('/motor/status'),
        api.get<Regra[]>('/motor/regras'),
        api.get<Execucao[]>('/motor/execucoes'),
      ]);
      setHabilitado(status.data.habilitado);
      setRegras(comDemo(rs.data, MOCK_REGRAS));
      setExecucoes(comDemo(es.data, MOCK_EXECUCOES));
    } catch {
      setRegras(mockSeDemo(MOCK_REGRAS)); setExecucoes(mockSeDemo(MOCK_EXECUCOES)); setErro(false);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function alternar(id: string) {
    setAlternando(id);
    try {
      await api.patch(`/motor/regras/${id}/toggle`);
      await carregar();
    } finally {
      setAlternando(null);
    }
  }

  return (
    <PaginaShell
      titulo="Automações"
      subtitulo="O motor próprio da Breakr — regras configuráveis e execuções"
      acao={<BadgeMotor habilitado={habilitado} />}
    >
      {carregando ? (
        <EstadoCarregando />
      ) : erro ? (
        <EstadoErro mensagem="Não foi possível carregar o motor." onTentar={carregar} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <SecaoRegras regras={regras} alternando={alternando} onAlternar={alternar} />
          <SecaoExecucoes execucoes={execucoes} />
        </div>
      )}
    </PaginaShell>
  );
}

/* ------------------------------- Regras ------------------------------- */

function SecaoRegras({
  regras,
  alternando,
  onAlternar,
}: {
  regras: Regra[];
  alternando: string | null;
  onAlternar: (id: string) => void;
}) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--cinza-vapor)' }}>Regras</h2>
      {regras.length === 0 ? (
        <PainelVazio
          titulo="Nenhuma regra ainda"
          descricao="As regras de fábrica (renovação, ativação) aparecem aqui assim que o motor sobe."
        />
      ) : (
        <ul style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {regras.map((regra) => (
            <li
              key={regra.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
                padding: '16px 18px',
                background: 'var(--superficie)',
                border: '1px solid var(--borda)',
                borderRadius: 14,
                boxShadow: 'var(--sombra-card)',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                <span
                  aria-hidden="true"
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: 999,
                    flexShrink: 0,
                    background: regra.ativa ? '#2ecc71' : 'var(--borda-forte)',
                    boxShadow: regra.ativa ? '0 0 8px #2ecc71' : 'none',
                  }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                  <span style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--cinza-vapor)' }}>
                    {regra.nome}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <code
                      style={{
                        fontSize: 11.5,
                        color: 'var(--texto-suave)',
                        background: 'var(--superficie-3)',
                        padding: '2px 8px',
                        borderRadius: 6,
                      }}
                    >
                      quando: {regra.trigger?.evento ?? '—'}
                    </code>
                    <span style={{ fontSize: 12, color: 'var(--texto-fraco)' }}>
                      {(regra.acoes?.length ?? 0)} ação(ões):{' '}
                      {(regra.acoes ?? []).map((a) => a.tipo).filter(Boolean).join(' → ') || '—'}
                    </span>
                  </span>
                </div>
              </div>
              <BotaoSecundario
                onClick={() => onAlternar(regra.id)}
                disabled={alternando === regra.id}
              >
                {alternando === regra.id ? '…' : regra.ativa ? 'Desativar' : 'Ativar'}
              </BotaoSecundario>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ----------------------------- Execuções ------------------------------ */

function SecaoExecucoes({ execucoes }: { execucoes: Execucao[] }) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--cinza-vapor)' }}>
        Execuções recentes
      </h2>
      {execucoes.length === 0 ? (
        <PainelVazio
          titulo="Nenhuma execução ainda"
          descricao="Cada vez que um evento dispara uma regra, a execução é registrada aqui."
        />
      ) : (
        <div
          style={{
            background: 'var(--superficie)',
            border: '1px solid var(--borda)',
            borderRadius: 16,
            overflow: 'hidden',
            boxShadow: 'var(--sombra-card)',
          }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
              <thead>
                <tr>
                  <Th>Quando</Th>
                  <Th>Regra</Th>
                  <Th>Evento</Th>
                  <Th>Ações</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {execucoes.map((ex) => (
                  <tr key={ex.id} className="brk-row" style={{ borderTop: '1px solid var(--borda)' }}>
                    <Td>
                      <span style={{ color: 'var(--texto-fraco)', fontSize: 13 }}>
                        {formatarQuando(ex.criadoEm)}
                      </span>
                    </Td>
                    <Td>
                      <span style={{ color: 'var(--cinza-vapor)' }}>{ex.rule?.nome ?? '—'}</span>
                    </Td>
                    <Td>
                      <code style={{ fontSize: 12, color: 'var(--texto-suave)' }}>
                        {ex.resultado?.evento ?? '—'}
                      </code>
                    </Td>
                    <Td>
                      <span style={{ fontSize: 13, color: 'var(--texto-suave)' }}>
                        {(ex.resultado?.acoes ?? []).map((a) => a.tipo).join(', ') || '—'}
                      </span>
                    </Td>
                    <Td>
                      <BadgeExec status={ex.status} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <RodapeContagem total={execucoes.length} rotulo="execução" />
        </div>
      )}
    </section>
  );
}

/* ------------------------------- Badges ------------------------------- */

function BadgeMotor({ habilitado }: { habilitado: boolean }) {
  const cor = habilitado ? '#67e0a3' : '#ffb44d';
  const fundo = habilitado ? 'rgba(46, 204, 113, 0.14)' : 'rgba(255, 148, 6, 0.14)';
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        fontSize: 12.5,
        fontWeight: 700,
        padding: '6px 12px',
        borderRadius: 999,
        color: cor,
        background: fundo,
      }}
    >
      <span
        aria-hidden="true"
        style={{ width: 7, height: 7, borderRadius: 999, background: cor, boxShadow: `0 0 6px ${cor}` }}
      />
      {habilitado ? 'Motor ativo (fila)' : 'Motor em modo direto'}
    </span>
  );
}

function BadgeExec({ status }: { status: string }) {
  const ok = status === 'SUCESSO';
  const cor = ok ? '#67e0a3' : '#e2738a';
  const fundo = ok ? 'rgba(46, 204, 113, 0.14)' : 'rgba(148, 18, 44, 0.18)';
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 11.5,
        fontWeight: 700,
        padding: '4px 10px',
        borderRadius: 999,
        color: cor,
        background: fundo,
      }}
    >
      <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: 999, background: cor }} />
      {ok ? 'Sucesso' : 'Erro'}
    </span>
  );
}
