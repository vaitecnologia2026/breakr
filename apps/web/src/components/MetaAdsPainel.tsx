// Painel de integração Meta Ads (M17 Fase 2) — isolado e plugável.
// Mostra o status da conexão da conta Meta e permite criar, gerenciar (pausar/
// ativar) e ver resultados (insights) das campanhas reais, chamando a API do
// Breakr (/trafego/meta/*). Degrada com elegância: se não estiver configurado
// ou o app da Meta estiver bloqueado, exibe o aviso e nunca quebra a tela.
// Enquanto em homologação, começa recolhido para não competir com a tela atual.
import { useState } from 'react';
import { api } from '../lib/api';
import { BotaoPrimario, BotaoSecundario, MensagemErro } from './primitivos';

interface MetaResp<T> {
  ok: boolean;
  dados?: T;
  erro?: string;
}
interface StatusDados {
  configurado: boolean;
  conectado: boolean;
  usuario?: { name?: string; id?: string };
  conta?: { name?: string; account_id?: string; currency?: string; account_status?: number };
}
interface CampanhaMeta {
  id: string;
  name: string;
  objective?: string;
  status?: string;
  effective_status?: string;
  daily_budget?: string;
  created_time?: string;
}
interface InsightRow {
  impressions?: string;
  clicks?: string;
  spend?: string;
  reach?: string;
  cpc?: string;
  cpm?: string;
  ctr?: string;
}

const OBJETIVOS = [
  'OUTCOME_TRAFFIC',
  'OUTCOME_LEADS',
  'OUTCOME_SALES',
  'OUTCOME_ENGAGEMENT',
  'OUTCOME_AWARENESS',
  'OUTCOME_APP_PROMOTION',
];

const cardStyle: React.CSSProperties = {
  padding: '10px 12px',
  borderRadius: 10,
  background: 'var(--superficie-2)',
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
};

export function MetaAdsPainel() {
  const [aberto, setAberto] = useState(false);
  const [status, setStatus] = useState<StatusDados | null>(null);
  const [statusErro, setStatusErro] = useState<string | null>(null);
  const [carregandoStatus, setCarregandoStatus] = useState(false);

  const [campanhas, setCampanhas] = useState<CampanhaMeta[]>([]);
  const [campanhasErro, setCampanhasErro] = useState<string | null>(null);
  const [carregandoCampanhas, setCarregandoCampanhas] = useState(false);

  const [insights, setInsights] = useState<InsightRow | null>(null);
  const [insightsErro, setInsightsErro] = useState<string | null>(null);
  const [carregandoInsights, setCarregandoInsights] = useState(false);

  const [novoNome, setNovoNome] = useState('');
  const [novoObjetivo, setNovoObjetivo] = useState('OUTCOME_TRAFFIC');
  const [novoOrcamento, setNovoOrcamento] = useState('');
  const [criando, setCriando] = useState(false);
  const [acaoErro, setAcaoErro] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function carregarStatus() {
    setCarregandoStatus(true);
    setStatusErro(null);
    try {
      const { data } = await api.get<MetaResp<StatusDados>>('/trafego/meta/status');
      setStatus(data.dados ?? null);
      if (data.erro) setStatusErro(data.erro);
    } catch {
      setStatusErro('Não foi possível consultar o status da conexão Meta.');
    } finally {
      setCarregandoStatus(false);
    }
  }

  async function carregarCampanhas() {
    setCarregandoCampanhas(true);
    setCampanhasErro(null);
    try {
      const { data } = await api.get<MetaResp<{ data?: CampanhaMeta[] }>>('/trafego/meta/campanhas');
      if (!data.ok) {
        setCampanhas([]);
        setCampanhasErro(data.erro ?? 'Não foi possível listar as campanhas da Meta.');
      } else {
        setCampanhas(data.dados?.data ?? []);
      }
    } catch {
      setCampanhasErro('Não foi possível listar as campanhas da Meta.');
    } finally {
      setCarregandoCampanhas(false);
    }
  }

  async function carregarInsights() {
    setCarregandoInsights(true);
    setInsightsErro(null);
    try {
      const { data } = await api.get<MetaResp<{ data?: InsightRow[] }>>(
        '/trafego/meta/insights?nivel=account',
      );
      if (!data.ok) {
        setInsights(null);
        setInsightsErro(data.erro ?? 'Não foi possível ler os resultados.');
      } else {
        setInsights(data.dados?.data?.[0] ?? null);
        if (!data.dados?.data?.length) setInsightsErro('Sem dados de resultado no período.');
      }
    } catch {
      setInsightsErro('Não foi possível ler os resultados.');
    } finally {
      setCarregandoInsights(false);
    }
  }

  async function criar() {
    if (!novoNome.trim()) return;
    setCriando(true);
    setAcaoErro(null);
    setFeedback(null);
    try {
      const { data } = await api.post<MetaResp<{ id?: string }>>('/trafego/meta/campanhas', {
        nome: novoNome.trim(),
        objetivo: novoObjetivo,
        ...(novoOrcamento ? { orcamentoDiario: Number(novoOrcamento) } : {}),
      });
      if (!data.ok) {
        setAcaoErro(data.erro ?? 'Não foi possível criar a campanha na Meta.');
      } else {
        setFeedback('Campanha criada na Meta (pausada por segurança).');
        setNovoNome('');
        setNovoOrcamento('');
        carregarCampanhas();
      }
    } catch {
      setAcaoErro('Não foi possível criar a campanha na Meta.');
    } finally {
      setCriando(false);
    }
  }

  async function mover(id: string, novoStatus: string) {
    setAcaoErro(null);
    setFeedback(null);
    try {
      const { data } = await api.patch<MetaResp<unknown>>(`/trafego/meta/campanhas/${id}/status`, {
        status: novoStatus,
      });
      if (!data.ok) {
        setAcaoErro(data.erro ?? 'Não foi possível alterar o status na Meta.');
      } else {
        setFeedback(`Campanha ${novoStatus === 'ACTIVE' ? 'ativada' : 'pausada'} na Meta.`);
        carregarCampanhas();
      }
    } catch {
      setAcaoErro('Não foi possível alterar o status na Meta.');
    }
  }

  function abrir() {
    const novo = !aberto;
    setAberto(novo);
    if (novo && status === null && !carregandoStatus) carregarStatus();
  }

  const conectado = status?.conectado === true;
  const configurado = status?.configurado === true;

  return (
    <div
      style={{
        border: '1px solid var(--borda)',
        borderRadius: 12,
        background: 'var(--superficie)',
        overflow: 'hidden',
      }}
    >
      <button
        type="button"
        onClick={abrir}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          padding: '12px 14px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'inherit',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 14 }}>
          Meta Ads — integração
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: 999,
              background: conectado
                ? 'var(--verde-fundo)'
                : configurado
                  ? 'var(--amarelo-fundo)'
                  : 'var(--superficie-3)',
              color: conectado ? '#86efac' : configurado ? '#fcd34d' : 'var(--texto-suave)',
            }}
          >
            {carregandoStatus
              ? 'verificando…'
              : conectado
                ? 'conectado'
                : configurado
                  ? 'não conectado'
                  : 'não configurado'}
          </span>
        </span>
        <span style={{ fontSize: 12, color: 'var(--texto-fraco)' }}>{aberto ? 'ocultar ▲' : 'abrir ▼'}</span>
      </button>

      {aberto && (
        <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Status da conexão */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ fontSize: 13 }}>Status da conexão</strong>
              <BotaoSecundario onClick={carregarStatus}>Atualizar</BotaoSecundario>
            </div>
            {!configurado && !statusErro && (
              <span style={{ fontSize: 12.5, color: 'var(--texto-suave)' }}>
                Credenciais não configuradas. Preencha token e ID da conta em Configurações →
                Integrações → Meta Ads.
              </span>
            )}
            {conectado && status?.conta && (
              <span style={{ fontSize: 12.5, color: 'var(--texto-suave)' }}>
                Conta: <strong>{status.conta.name ?? status.conta.account_id}</strong>
                {status.conta.currency ? ` · ${status.conta.currency}` : ''}
                {status.usuario?.name ? ` · usuário ${status.usuario.name}` : ''}
              </span>
            )}
            {statusErro && (
              <span style={{ fontSize: 12.5, color: '#fca5a5' }}>Meta: {statusErro}</span>
            )}
          </div>

          {acaoErro && <MensagemErro texto={acaoErro} />}
          {feedback && (
            <div
              style={{
                fontSize: 12.5,
                color: '#86efac',
                background: 'var(--verde-fundo)',
                borderRadius: 8,
                padding: '8px 10px',
              }}
            >
              {feedback}
            </div>
          )}

          {/* Criar campanha */}
          <div style={cardStyle}>
            <strong style={{ fontSize: 13 }}>Criar campanha na Meta</strong>
            <input
              className="brk-input"
              placeholder="Nome da campanha"
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
            />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <select
                className="brk-input"
                value={novoObjetivo}
                onChange={(e) => setNovoObjetivo(e.target.value)}
                aria-label="Objetivo"
                style={{ flex: '1 1 180px' }}
              >
                {OBJETIVOS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
              <input
                className="brk-input"
                type="number"
                min="0"
                step="0.01"
                placeholder="Orçamento diário (R$)"
                value={novoOrcamento}
                onChange={(e) => setNovoOrcamento(e.target.value)}
                style={{ flex: '1 1 160px' }}
              />
            </div>
            <div>
              <BotaoPrimario onClick={criar} disabled={criando || !novoNome.trim()}>
                {criando ? 'Criando…' : 'Criar campanha'}
              </BotaoPrimario>
            </div>
            <span style={{ fontSize: 11.5, color: 'var(--texto-fraco)' }}>
              A campanha é criada <strong>pausada</strong> por segurança; ative-a na lista abaixo
              quando estiver pronta.
            </span>
          </div>

          {/* Gerenciar campanhas */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ fontSize: 13 }}>Campanhas na Meta</strong>
              <BotaoSecundario onClick={carregarCampanhas}>
                {carregandoCampanhas ? 'Carregando…' : 'Listar / atualizar'}
              </BotaoSecundario>
            </div>
            {campanhasErro && <span style={{ fontSize: 12.5, color: '#fca5a5' }}>Meta: {campanhasErro}</span>}
            {!campanhasErro && campanhas.length === 0 && (
              <span style={{ fontSize: 12.5, color: 'var(--texto-fraco)' }}>
                Nenhuma campanha carregada. Clique em “Listar / atualizar”.
              </span>
            )}
            {campanhas.map((c) => (
              <div
                key={c.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 0',
                  borderTop: '1px solid var(--borda)',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</span>
                  <span style={{ fontSize: 11.5, color: 'var(--texto-fraco)' }}>
                    {c.objective ?? '—'} · {c.effective_status ?? c.status ?? '—'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {c.status !== 'ACTIVE' ? (
                    <BotaoSecundario onClick={() => mover(c.id, 'ACTIVE')}>Ativar</BotaoSecundario>
                  ) : (
                    <BotaoSecundario onClick={() => mover(c.id, 'PAUSED')}>Pausar</BotaoSecundario>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Resultados (insights) */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ fontSize: 13 }}>Resultados (conta)</strong>
              <BotaoSecundario onClick={carregarInsights}>
                {carregandoInsights ? 'Carregando…' : 'Ver resultados'}
              </BotaoSecundario>
            </div>
            {insightsErro && <span style={{ fontSize: 12.5, color: '#fca5a5' }}>Meta: {insightsErro}</span>}
            {insights && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 12.5 }}>
                <span>Investido: <strong>R$ {insights.spend ?? '0'}</strong></span>
                <span>Impressões: <strong>{insights.impressions ?? '0'}</strong></span>
                <span>Cliques: <strong>{insights.clicks ?? '0'}</strong></span>
                <span>CTR: <strong>{insights.ctr ?? '0'}%</strong></span>
                <span>CPC: <strong>R$ {insights.cpc ?? '0'}</strong></span>
                <span>Alcance: <strong>{insights.reach ?? '0'}</strong></span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
