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
interface AcaoMeta {
  action_type?: string;
  value?: string;
}
interface InsightRow {
  impressions?: string;
  clicks?: string;
  spend?: string;
  reach?: string;
  cpc?: string;
  cpm?: string;
  ctr?: string;
  frequency?: string;
  actions?: AcaoMeta[];
  action_values?: AcaoMeta[];
  purchase_roas?: AcaoMeta[];
}
interface SerieDia {
  date_start?: string;
  spend?: string;
  action_values?: AcaoMeta[];
  purchase_roas?: AcaoMeta[];
}
interface AdsetMeta {
  id?: string;
  name?: string;
  status?: string;
  effective_status?: string;
  daily_budget?: string;
}
// Deriva conversoes/receita/ROAS/CPA/CPL dos campos actions/action_values da Meta.
function derivarConversao(row: InsightRow | null): {
  conversoes: number;
  receita: number;
  roas: number | null;
  cpa: number | null;
  cpl: number | null;
} {
  if (!row) return { conversoes: 0, receita: 0, roas: null, cpa: null, cpl: null };
  const soma = (arr: AcaoMeta[] | undefined, filtro: (t: string) => boolean) =>
    (arr ?? []).reduce((s, a) => (filtro((a.action_type ?? '').toLowerCase()) ? s + Number(a.value ?? 0) : s), 0);
  const leads = soma(row.actions, (t) => t.includes('lead'));
  const compras = soma(row.actions, (t) => t.includes('purchase'));
  const conversoes = leads + compras;
  const receita = soma(row.action_values, (t) => t.includes('purchase'));
  const spend = Number(row.spend ?? 0);
  const roasCampo = Number(row.purchase_roas?.[0]?.value ?? 0);
  const roas = roasCampo > 0 ? roasCampo : receita > 0 && spend > 0 ? receita / spend : null;
  const cpa = conversoes > 0 && spend > 0 ? spend / conversoes : null;
  const cpl = leads > 0 && spend > 0 ? spend / leads : null;
  return { conversoes, receita, roas, cpa, cpl };
}
interface ContaAnuncio {
  account_id?: string;
  name?: string;
  account_status?: number;
  currency?: string;
}
interface PaginaMeta {
  id?: string;
  name?: string;
}
interface TokenDebugDados {
  type?: string;
  app_id?: string;
  application?: string;
  is_valid?: boolean;
  expires_at?: number;
  scopes?: string[];
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

  const [contas, setContas] = useState<ContaAnuncio[]>([]);
  const [contasErro, setContasErro] = useState<string | null>(null);
  const [carregandoContas, setCarregandoContas] = useState(false);

  const [paginas, setPaginas] = useState<PaginaMeta[]>([]);
  const [paginasErro, setPaginasErro] = useState<string | null>(null);
  const [carregandoPaginas, setCarregandoPaginas] = useState(false);

  const [tokenAlvo, setTokenAlvo] = useState('');
  const [tokenDebug, setTokenDebug] = useState<TokenDebugDados | null>(null);
  const [tokenErro, setTokenErro] = useState<string | null>(null);
  const [carregandoToken, setCarregandoToken] = useState(false);

  const [serie, setSerie] = useState<SerieDia[]>([]);
  const [serieErro, setSerieErro] = useState<string | null>(null);
  const [carregandoSerie, setCarregandoSerie] = useState(false);

  const [adsetsPor, setAdsetsPor] = useState<Record<string, AdsetMeta[]>>({});
  const [adsetsErro, setAdsetsErro] = useState<string | null>(null);
  const [orcamentoEdit, setOrcamentoEdit] = useState<Record<string, string>>({});

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

  async function carregarContas() {
    setCarregandoContas(true);
    setContasErro(null);
    try {
      const { data } = await api.get<MetaResp<{ data?: ContaAnuncio[] }>>('/trafego/meta/contas');
      if (!data.ok) {
        setContas([]);
        setContasErro(data.erro ?? 'Não foi possível listar as contas de anúncio.');
      } else {
        setContas(data.dados?.data ?? []);
        if (!data.dados?.data?.length) setContasErro('Nenhuma conta de anúncio encontrada para este token.');
      }
    } catch {
      setContasErro('Não foi possível listar as contas de anúncio.');
    } finally {
      setCarregandoContas(false);
    }
  }

  async function carregarPaginas() {
    setCarregandoPaginas(true);
    setPaginasErro(null);
    try {
      const { data } = await api.get<MetaResp<{ data?: PaginaMeta[] }>>('/trafego/meta/paginas');
      if (!data.ok) {
        setPaginas([]);
        setPaginasErro(data.erro ?? 'Não foi possível listar as páginas.');
      } else {
        setPaginas(data.dados?.data ?? []);
        if (!data.dados?.data?.length) setPaginasErro('Nenhuma página encontrada para este token.');
      }
    } catch {
      setPaginasErro('Não foi possível listar as páginas.');
    } finally {
      setCarregandoPaginas(false);
    }
  }

  async function diagnosticar() {
    setCarregandoToken(true);
    setTokenErro(null);
    try {
      const qs = tokenAlvo.trim() ? `?token=${encodeURIComponent(tokenAlvo.trim())}` : '';
      const { data } = await api.get<MetaResp<{ data?: TokenDebugDados }>>(
        `/trafego/meta/token-debug${qs}`,
      );
      if (!data.ok) {
        setTokenDebug(null);
        setTokenErro(data.erro ?? 'Não foi possível diagnosticar o token.');
      } else {
        setTokenDebug(data.dados?.data ?? null);
      }
    } catch {
      setTokenErro('Não foi possível diagnosticar o token.');
    } finally {
      setCarregandoToken(false);
    }
  }

  async function carregarSerie() {
    setCarregandoSerie(true);
    setSerieErro(null);
    try {
      const { data } = await api.get<MetaResp<{ data?: SerieDia[] }>>('/trafego/meta/insights-serie');
      if (!data.ok) {
        setSerie([]);
        setSerieErro(data.erro ?? 'Não foi possível ler a série de gasto × receita.');
      } else {
        setSerie(data.dados?.data ?? []);
        if (!data.dados?.data?.length) setSerieErro('Sem dados no período.');
      }
    } catch {
      setSerieErro('Não foi possível ler a série de gasto × receita.');
    } finally {
      setCarregandoSerie(false);
    }
  }

  async function carregarAdsets(campanhaId: string) {
    setAdsetsErro(null);
    try {
      const { data } = await api.get<MetaResp<{ data?: AdsetMeta[] }>>(
        `/trafego/meta/campanhas/${campanhaId}/adsets`,
      );
      if (!data.ok) {
        setAdsetsErro(data.erro ?? 'Não foi possível listar os conjuntos.');
      } else {
        setAdsetsPor((m) => ({ ...m, [campanhaId]: data.dados?.data ?? [] }));
      }
    } catch {
      setAdsetsErro('Não foi possível listar os conjuntos.');
    }
  }

  async function ajustarOrcamento(campanhaId: string) {
    const valor = Number(orcamentoEdit[campanhaId]);
    if (!(valor > 0)) return;
    setAcaoErro(null);
    setFeedback(null);
    try {
      const { data } = await api.patch<MetaResp<unknown>>(
        `/trafego/meta/campanhas/${campanhaId}/orcamento`,
        { orcamentoDiario: valor },
      );
      if (!data.ok) {
        setAcaoErro(data.erro ?? 'Não foi possível ajustar o orçamento na Meta.');
      } else {
        setFeedback('Orçamento diário ajustado na Meta.');
        setOrcamentoEdit((m) => ({ ...m, [campanhaId]: '' }));
        carregarCampanhas();
      }
    } catch {
      setAcaoErro('Não foi possível ajustar o orçamento na Meta.');
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

          {/* Descoberta / diagnóstico — apoia o preenchimento das credenciais */}
          <div style={cardStyle}>
            <strong style={{ fontSize: 13 }}>Descoberta / diagnóstico</strong>
            <span style={{ fontSize: 11.5, color: 'var(--texto-fraco)' }}>
              Use o token já configurado para descobrir o ID da conta (act_…) e o Page ID, e para
              conferir se o token é do tipo/validade certos.
            </span>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <BotaoSecundario onClick={carregarContas}>
                {carregandoContas ? 'Carregando…' : 'Listar contas de anúncio'}
              </BotaoSecundario>
              <BotaoSecundario onClick={carregarPaginas}>
                {carregandoPaginas ? 'Carregando…' : 'Listar páginas'}
              </BotaoSecundario>
            </div>

            {contasErro && <span style={{ fontSize: 12.5, color: '#fca5a5' }}>Contas — {contasErro}</span>}
            {contas.map((c) => (
              <span key={c.account_id ?? c.name} style={{ fontSize: 12.5, color: 'var(--texto-suave)' }}>
                <strong>act_{c.account_id}</strong> · {c.name ?? '—'}
                {c.currency ? ` · ${c.currency}` : ''}
              </span>
            ))}

            {paginasErro && <span style={{ fontSize: 12.5, color: '#fca5a5' }}>Páginas — {paginasErro}</span>}
            {paginas.map((p) => (
              <span key={p.id} style={{ fontSize: 12.5, color: 'var(--texto-suave)' }}>
                Página <strong>{p.id}</strong> · {p.name ?? '—'}
              </span>
            ))}

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
              <input
                className="brk-input"
                placeholder="Token para diagnosticar (vazio = o configurado)"
                value={tokenAlvo}
                onChange={(e) => setTokenAlvo(e.target.value)}
                style={{ flex: '1 1 220px' }}
              />
              <BotaoSecundario onClick={diagnosticar}>
                {carregandoToken ? 'Diagnosticando…' : 'Diagnosticar token'}
              </BotaoSecundario>
            </div>
            {tokenErro && <span style={{ fontSize: 12.5, color: '#fca5a5' }}>Token — {tokenErro}</span>}
            {tokenDebug && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 12.5 }}>
                <span>Tipo: <strong>{tokenDebug.type ?? '—'}</strong></span>
                <span>Válido: <strong>{tokenDebug.is_valid ? 'sim' : 'não'}</strong></span>
                <span>App: <strong>{tokenDebug.application ?? tokenDebug.app_id ?? '—'}</strong></span>
                <span>
                  Expira:{' '}
                  <strong>
                    {tokenDebug.expires_at
                      ? new Date(tokenDebug.expires_at * 1000).toLocaleString('pt-BR')
                      : 'não expira'}
                  </strong>
                </span>
                {tokenDebug.scopes?.length ? (
                  <span>Permissões: <strong>{tokenDebug.scopes.join(', ')}</strong></span>
                ) : null}
              </div>
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
                  flexDirection: 'column',
                  gap: 6,
                  padding: '8px 0',
                  borderTop: '1px solid var(--borda)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 8,
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
                    <BotaoSecundario onClick={() => carregarAdsets(c.id)}>Conjuntos</BotaoSecundario>
                  </div>
                </div>
                {/* Fase B — ajustar orçamento diário (escreve na Meta) */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  <input
                    className="brk-input"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Novo orçamento diário (R$)"
                    value={orcamentoEdit[c.id] ?? ''}
                    onChange={(e) => setOrcamentoEdit((m) => ({ ...m, [c.id]: e.target.value }))}
                    style={{ flex: '1 1 160px' }}
                  />
                  <BotaoSecundario
                    onClick={() => ajustarOrcamento(c.id)}
                    disabled={!(Number(orcamentoEdit[c.id]) > 0)}
                  >
                    Ajustar orçamento
                  </BotaoSecundario>
                </div>
                {/* Hierarquia — conjuntos (adsets) da campanha */}
                {adsetsPor[c.id]?.map((a) => (
                  <span
                    key={a.id}
                    style={{ fontSize: 11.5, color: 'var(--texto-suave)', paddingLeft: 8 }}
                  >
                    ↳ {a.name ?? a.id} · {a.effective_status ?? a.status ?? '—'}
                    {a.daily_budget ? ` · R$ ${(Number(a.daily_budget) / 100).toFixed(2)}/d` : ''}
                  </span>
                ))}
              </div>
            ))}
            {adsetsErro && <span style={{ fontSize: 12.5, color: '#fca5a5' }}>Conjuntos — {adsetsErro}</span>}
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
                <span>CPM: <strong>R$ {insights.cpm ?? '0'}</strong></span>
                <span>Alcance: <strong>{insights.reach ?? '0'}</strong></span>
                <span>Frequência: <strong>{insights.frequency ?? '0'}</strong></span>
                {(() => {
                  const d = derivarConversao(insights);
                  return (
                    <>
                      <span>Conversões: <strong>{d.conversoes}</strong></span>
                      <span>Receita: <strong>R$ {d.receita.toFixed(2)}</strong></span>
                      <span>ROAS: <strong>{d.roas != null ? `${d.roas.toFixed(2)}x` : '—'}</strong></span>
                      <span>CPA: <strong>{d.cpa != null ? `R$ ${d.cpa.toFixed(2)}` : '—'}</strong></span>
                      <span>CPL: <strong>{d.cpl != null ? `R$ ${d.cpl.toFixed(2)}` : '—'}</strong></span>
                    </>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Série gasto × receita (30 dias) */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ fontSize: 13 }}>Gasto × Receita (30 dias)</strong>
              <BotaoSecundario onClick={carregarSerie}>
                {carregandoSerie ? 'Carregando…' : 'Ver série'}
              </BotaoSecundario>
            </div>
            {serieErro && <span style={{ fontSize: 12.5, color: '#fca5a5' }}>Meta: {serieErro}</span>}
            {serie.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {(() => {
                  const linhas = serie.map((d) => {
                    const gasto = Number(d.spend ?? 0);
                    const receita = (d.action_values ?? []).reduce(
                      (s, a) => (String(a.action_type ?? '').toLowerCase().includes('purchase') ? s + Number(a.value ?? 0) : s),
                      0,
                    );
                    return { data: d.date_start ?? '', gasto, receita };
                  });
                  const max = Math.max(1, ...linhas.map((l) => Math.max(l.gasto, l.receita)));
                  return linhas.map((l) => (
                    <div key={l.data} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5 }}>
                      <span style={{ width: 74, color: 'var(--texto-fraco)' }}>{l.data}</span>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <div style={{ height: 6, borderRadius: 3, background: 'var(--superficie-3)', overflow: 'hidden' }}>
                          <div style={{ width: `${(l.gasto / max) * 100}%`, height: '100%', background: '#4c7cf2' }} />
                        </div>
                        <div style={{ height: 6, borderRadius: 3, background: 'var(--superficie-3)', overflow: 'hidden' }}>
                          <div style={{ width: `${(l.receita / max) * 100}%`, height: '100%', background: '#2ed88f' }} />
                        </div>
                      </div>
                      <span style={{ width: 150, textAlign: 'right', color: 'var(--texto-suave)' }}>
                        R$ {l.gasto.toFixed(0)} · R$ {l.receita.toFixed(0)}
                      </span>
                    </div>
                  ));
                })()}
                <span style={{ fontSize: 11, color: 'var(--texto-fraco)', marginTop: 2 }}>
                  Azul = gasto · Verde = receita (por dia).
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
