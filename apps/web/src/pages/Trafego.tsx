import {
  useEffect,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from 'react';
import { api } from '../lib/api';
import {
  PaginaShell,
  BotaoPrimario,
  BotaoSecundario,
  Campo,
  Overlay,
  MensagemErro,
  EstadoCarregando,
  EstadoErro,
  PainelVazio,
} from '../components/primitivos';

/**
 * Tela de Tráfego (M17 — acompanhamento de campanhas + otimização com IA).
 * Cada campanha é um card com métricas (impressões, cliques, CTR, conversões,
 * gasto, CPA), um seletor de status, edição de métricas e um botão
 * "Sugestões da IA" que pede ao sistema uma análise de otimização assistiva.
 * Trata loading / erro / vazio e erros transitórios de ação.
 *
 * Contrato (API):
 *  GET   /trafego/campanhas → Campanha[]   (cliente.nomeFantasia incluso)
 *  POST  /trafego/campanhas { clienteId, nome, objetivo?, orcamentoDiario? }
 *  PATCH /trafego/campanhas/:id/status   { status }
 *  PATCH /trafego/campanhas/:id/metricas { impressoes?, cliques?, conversoes?, gasto? }
 *  POST  /trafego/campanhas/:id/sugestoes → { sugestoes: string | null, aviso?: string }
 *  GET   /clientes → ClienteOpt[]
 */

type StatusCampanha = 'RASCUNHO' | 'ATIVA' | 'PAUSADA' | 'ENCERRADA';

interface Campanha {
  id: string;
  nome: string;
  objetivo: string | null;
  status: StatusCampanha;
  orcamentoDiario: string | null;
  gasto: string | null;
  impressoes: number;
  cliques: number;
  conversoes: number;
  codigoUnico: string;
  sugestoesIa: string | null;
  clienteId: string;
  cliente?: { nomeFantasia: string };
}

interface ClienteOpt {
  id: string;
  nomeFantasia: string;
}

// Resposta do endpoint de IA: ou vem o texto, ou vem um aviso de configuração.
interface RespostaSugestoes {
  sugestoes: string | null;
  aviso?: string;
}

// Ordem dos status no seletor (ciclo de vida da campanha).
const ORDEM_STATUS: StatusCampanha[] = ['RASCUNHO', 'ATIVA', 'PAUSADA', 'ENCERRADA'];

// Rótulo amigável + cores do badge por status da campanha.
const STATUS_META: Record<
  StatusCampanha,
  { rotulo: string; fundo: string; texto: string; ponto: string }
> = {
  RASCUNHO: {
    rotulo: 'Rascunho',
    fundo: 'rgba(243, 244, 247, 0.08)',
    texto: 'var(--texto-suave)',
    ponto: '#9aa0ad',
  },
  ATIVA: {
    rotulo: 'Ativa',
    fundo: 'rgba(46, 204, 113, 0.14)',
    texto: '#67e0a3',
    ponto: '#2ecc71',
  },
  PAUSADA: {
    rotulo: 'Pausada',
    fundo: 'rgba(255, 148, 6, 0.14)',
    texto: '#ffb44d',
    ponto: '#ff9406',
  },
  ENCERRADA: {
    rotulo: 'Encerrada',
    fundo: 'rgba(243, 244, 247, 0.06)',
    texto: 'var(--texto-fraco)',
    ponto: '#6c7280',
  },
};

// Objetivos disponíveis no modal de criação.
const OBJETIVOS = ['Conversões', 'Tráfego', 'Alcance', 'Engajamento'];

// "1234.56" → "R$ 1.234,56"; nulo/inválido vira "—".
function formatarBRL(valor: string | null): string {
  const n = Number(valor ?? 0);
  if (Number.isNaN(n)) return '—';
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Inteiro pt-BR (separador de milhar).
function formatarInteiro(n: number): string {
  return Math.round(n).toLocaleString('pt-BR');
}

// CTR = cliques / impressões, em %; "—" quando não há impressões.
function calcularCtr(cliques: number, impressoes: number): string {
  if (!impressoes) return '—';
  const pct = (cliques / impressoes) * 100;
  return `${pct.toFixed(2)}%`;
}

// CPA = gasto / conversões, em BRL; "—" quando não há conversões.
function calcularCpa(gasto: string | null, conversoes: number): string {
  if (!conversoes) return '—';
  const total = Number(gasto ?? 0);
  if (Number.isNaN(total)) return '—';
  return (total / conversoes).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export function Trafego() {
  const [campanhas, setCampanhas] = useState<Campanha[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [erroAcao, setErroAcao] = useState<string | null>(null);
  const [busca, setBusca] = useState('');

  async function carregar() {
    setCarregando(true);
    setErro(null);
    try {
      const { data } = await api.get<Campanha[]>('/trafego/campanhas');
      setCampanhas(data);
    } catch {
      setErro('Não foi possível carregar as campanhas. Tente novamente.');
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  const q = busca.toLowerCase().trim();
  const filtrados = q
    ? campanhas.filter(
        (c) =>
          c.nome.toLowerCase().includes(q) ||
          (c.cliente?.nomeFantasia ?? '').toLowerCase().includes(q),
      )
    : campanhas;

  return (
    <PaginaShell
      titulo="Tráfego"
      subtitulo="Campanhas e otimização com IA assistiva"
      acao={<BotaoPrimario onClick={() => setModalAberto(true)}>+ Nova campanha</BotaoPrimario>}
    >
      <div className="brk-filtros">
        <div className="brk-search">
          <span className="brk-search-icon" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            className="brk-input"
            type="search"
            placeholder="Buscar campanha por nome ou cliente…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            disabled={carregando}
          />
        </div>
      </div>

      {carregando ? (
        <EstadoCarregando />
      ) : erro ? (
        <EstadoErro mensagem={erro} onTentar={carregar} />
      ) : campanhas.length === 0 ? (
        <PainelVazio
          titulo="Nenhuma campanha ainda"
          descricao="Crie a primeira campanha para acompanhar métricas e pedir sugestões à IA."
          acao={<BotaoPrimario onClick={() => setModalAberto(true)}>+ Nova campanha</BotaoPrimario>}
        />
      ) : filtrados.length === 0 ? (
        <PainelVazio
          titulo="Nenhum resultado"
          descricao={`Nenhuma campanha corresponde a "${busca}".`}
        />
      ) : (
        <>
          {erroAcao && <MensagemErro texto={erroAcao} />}
          <GradeCampanhas
            campanhas={filtrados}
            aoAtualizar={carregar}
            aoErroAcao={setErroAcao}
          />
        </>
      )}

      {modalAberto && (
        <ModalNovaCampanha
          onFechar={() => setModalAberto(false)}
          onCriada={() => {
            setModalAberto(false);
            carregar();
          }}
        />
      )}
    </PaginaShell>
  );
}

/* ------------------------------ Grade ------------------------------ */

function GradeCampanhas({
  campanhas,
  aoAtualizar,
  aoErroAcao,
}: {
  campanhas: Campanha[];
  aoAtualizar: () => void;
  aoErroAcao: (msg: string | null) => void;
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
        gap: 16,
        alignItems: 'start',
      }}
    >
      {campanhas.map((c) => (
        <CardCampanha
          key={c.id}
          campanha={c}
          aoAtualizar={aoAtualizar}
          aoErroAcao={aoErroAcao}
        />
      ))}
    </div>
  );
}

/* ------------------------------- Card ------------------------------- */

function CardCampanha({
  campanha,
  aoAtualizar,
  aoErroAcao,
}: {
  campanha: Campanha;
  aoAtualizar: () => void;
  aoErroAcao: (msg: string | null) => void;
}) {
  // Trava a troca de status enquanto o PATCH está em voo.
  const [mudandoStatus, setMudandoStatus] = useState(false);
  // Modal de edição de métricas desta campanha.
  const [editando, setEditando] = useState(false);
  // Estado da análise de IA: ocioso → carregando → resultado.
  const [analisando, setAnalisando] = useState(false);
  const [resultadoIa, setResultadoIa] = useState<RespostaSugestoes | null>(null);
  // "Última análise" (cache) recolhida por padrão.
  const [verCache, setVerCache] = useState(false);

  async function trocarStatus(novo: StatusCampanha) {
    if (mudandoStatus || novo === campanha.status) return;
    setMudandoStatus(true);
    aoErroAcao(null);
    try {
      await api.patch(`/trafego/campanhas/${campanha.id}/status`, { status: novo });
      aoAtualizar();
      // Sucesso recarrega a lista por aoAtualizar (desmonta este card).
    } catch {
      aoErroAcao('Não foi possível mudar o status da campanha. Tente novamente.');
      setMudandoStatus(false);
    }
  }

  async function pedirSugestoes() {
    if (analisando) return;
    setAnalisando(true);
    setResultadoIa(null);
    aoErroAcao(null);
    try {
      const { data } = await api.post<RespostaSugestoes>(
        `/trafego/campanhas/${campanha.id}/sugestoes`,
      );
      setResultadoIa(data);
    } catch {
      aoErroAcao('Não foi possível gerar as sugestões da IA. Tente novamente.');
    } finally {
      setAnalisando(false);
    }
  }

  const objetivo = campanha.objetivo?.trim();
  const clienteNome = campanha.cliente?.nomeFantasia;

  return (
    <div
      style={{
        background: 'var(--superficie)',
        border: '1px solid var(--borda)',
        borderRadius: 16,
        boxShadow: 'var(--sombra-card)',
        padding: 18,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        opacity: mudandoStatus ? 0.7 : 1,
        transition: 'opacity 0.15s ease',
      }}
    >
      {/* Cabeçalho: nome + badge + cliente/objetivo */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 10,
          }}
        >
          <span
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: 'var(--texto)',
              lineHeight: 1.3,
              minWidth: 0,
            }}
          >
            {campanha.nome}
          </span>
          <BadgeStatus status={campanha.status} />
        </div>

        {(clienteNome || objetivo) && (
          <div style={{ fontSize: 12.5, color: 'var(--texto-fraco)', lineHeight: 1.4 }}>
            {clienteNome}
            {clienteNome && objetivo ? ' · ' : ''}
            {objetivo}
          </div>
        )}

        <SeletorStatus
          valor={campanha.status}
          desabilitado={mudandoStatus}
          rotuloAcessivel={`Mudar status da campanha ${campanha.nome}`}
          aoMudar={trocarStatus}
        />
      </div>

      {/* Métricas */}
      <GradeMetricas campanha={campanha} />

      {/* Ações */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <BotaoSecundario onClick={() => setEditando(true)} disabled={mudandoStatus}>
          Editar métricas
        </BotaoSecundario>
        <BotaoSecundario onClick={pedirSugestoes} disabled={analisando}>
          {analisando ? 'Analisando…' : 'Sugestões da IA'}
        </BotaoSecundario>
      </div>

      {/* Resultado da análise recém-pedida */}
      {resultadoIa && <ResultadoIa resultado={resultadoIa} />}

      {/* Última análise em cache (sugestoesIa salvo na campanha) */}
      {campanha.sugestoesIa && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            type="button"
            onClick={() => setVerCache((v) => !v)}
            aria-expanded={verCache}
            style={{
              alignSelf: 'flex-start',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'transparent',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              fontSize: 12.5,
              fontWeight: 600,
              color: 'var(--texto-suave)',
            }}
          >
            <IconeSeta aberta={verCache} />
            Última análise da IA
          </button>
          {verCache && <PainelSugestoes texto={campanha.sugestoesIa} cache />}
        </div>
      )}

      {editando && (
        <ModalMetricas
          campanha={campanha}
          onFechar={() => setEditando(false)}
          onSalvo={() => {
            setEditando(false);
            aoAtualizar();
          }}
        />
      )}
    </div>
  );
}

function BadgeStatus({ status }: { status: StatusCampanha }) {
  const cor = STATUS_META[status] ?? STATUS_META.RASCUNHO;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        fontSize: 11.5,
        fontWeight: 700,
        letterSpacing: '0.03em',
        padding: '4px 10px',
        borderRadius: 999,
        background: cor.fundo,
        color: cor.texto,
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 6,
          height: 6,
          borderRadius: 999,
          background: cor.ponto,
          boxShadow: `0 0 6px ${cor.ponto}`,
        }}
      />
      {cor.rotulo}
    </span>
  );
}

// Seletor compacto de status — troca o status direto no card.
function SeletorStatus({
  valor,
  desabilitado,
  rotuloAcessivel,
  aoMudar,
}: {
  valor: StatusCampanha;
  desabilitado: boolean;
  rotuloAcessivel: string;
  aoMudar: (novo: StatusCampanha) => void;
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--texto-fraco)' }}>Status</span>
      <select
        aria-label={rotuloAcessivel}
        value={valor}
        disabled={desabilitado}
        onChange={(e: ChangeEvent<HTMLSelectElement>) => aoMudar(e.target.value as StatusCampanha)}
        style={{
          background: 'var(--superficie-3)',
          border: '1px solid var(--borda-forte)',
          borderRadius: 8,
          padding: '7px 9px',
          color: 'var(--texto)',
          fontSize: 12.5,
          outline: 'none',
          cursor: desabilitado ? 'wait' : 'pointer',
          opacity: desabilitado ? 0.7 : 1,
          transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = 'var(--amarelo-fagulha)';
          e.currentTarget.style.boxShadow = '0 0 0 3px var(--foco)';
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = 'var(--borda-forte)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        {ORDEM_STATUS.map((s) => (
          <option key={s} value={s}>
            {STATUS_META[s].rotulo}
          </option>
        ))}
      </select>
    </label>
  );
}

/* ----------------------------- Métricas ----------------------------- */

function GradeMetricas({ campanha }: { campanha: Campanha }) {
  const celulas: { rotulo: string; valor: string; destaque?: boolean }[] = [
    { rotulo: 'Impressões', valor: formatarInteiro(campanha.impressoes) },
    { rotulo: 'Cliques', valor: formatarInteiro(campanha.cliques) },
    { rotulo: 'CTR', valor: calcularCtr(campanha.cliques, campanha.impressoes) },
    { rotulo: 'Conversões', valor: formatarInteiro(campanha.conversoes) },
    { rotulo: 'Gasto', valor: formatarBRL(campanha.gasto), destaque: true },
    { rotulo: 'CPA', valor: calcularCpa(campanha.gasto, campanha.conversoes) },
  ];
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 8,
      }}
    >
      {celulas.map((c) => (
        <CelulaMetrica key={c.rotulo} rotulo={c.rotulo} valor={c.valor} destaque={c.destaque} />
      ))}
    </div>
  );
}

function CelulaMetrica({
  rotulo,
  valor,
  destaque,
}: {
  rotulo: string;
  valor: string;
  destaque?: boolean;
}) {
  return (
    <div
      style={{
        background: 'var(--superficie-2)',
        border: '1px solid var(--borda)',
        borderRadius: 10,
        padding: '9px 10px',
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
      }}
    >
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          color: 'var(--texto-fraco)',
        }}
      >
        {rotulo}
      </span>
      <span
        style={{
          fontSize: 14.5,
          fontWeight: 700,
          color: destaque ? 'var(--amarelo-fagulha)' : 'var(--cinza-vapor)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {valor}
      </span>
    </div>
  );
}

/* --------------------------- Sugestões IA --------------------------- */

// Mostra o resultado de uma análise recém-pedida: texto OU aviso de config.
function ResultadoIa({ resultado }: { resultado: RespostaSugestoes }) {
  if (resultado.sugestoes) {
    return <PainelSugestoes texto={resultado.sugestoes} />;
  }
  return (
    <div
      style={{
        background: 'var(--superficie-2)',
        border: '1px solid var(--borda-forte)',
        borderRadius: 12,
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        fontSize: 13,
        color: 'var(--texto-suave)',
        lineHeight: 1.5,
      }}
    >
      <span>
        {resultado.aviso ??
          'A IA ainda não está configurada. Adicione uma chave nas configurações para receber sugestões.'}
      </span>
      <a
        href="/configuracoes"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          alignSelf: 'flex-start',
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--amarelo-fagulha)',
          textDecoration: 'none',
        }}
      >
        Configurar IA
        <IconeSetaLink />
      </a>
    </div>
  );
}

// Painel destacado com o texto da IA; preserva quebras de linha como itens.
function PainelSugestoes({ texto, cache }: { texto: string; cache?: boolean }) {
  const linhas = texto
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  return (
    <div
      className={cache ? undefined : 'brk-gradient-border'}
      style={{
        background: 'var(--superficie-2)',
        border: cache ? '1px solid var(--borda)' : undefined,
        borderRadius: 12,
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      {!cache && (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.03em',
            color: 'var(--amarelo-fagulha)',
          }}
        >
          <IconeFaisca />
          Sugestões da IA
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {linhas.map((linha, i) => (
          <p
            key={i}
            style={{
              fontSize: 13,
              color: 'var(--texto-suave)',
              lineHeight: 1.55,
              margin: 0,
            }}
          >
            {linha}
          </p>
        ))}
      </div>
    </div>
  );
}

/* --------------------------- Modal criação --------------------------- */

function ModalNovaCampanha({
  onFechar,
  onCriada,
}: {
  onFechar: () => void;
  onCriada: () => void;
}) {
  const [clientes, setClientes] = useState<ClienteOpt[]>([]);
  const [carregandoClientes, setCarregandoClientes] = useState(true);
  const [erroClientes, setErroClientes] = useState<string | null>(null);

  const [clienteId, setClienteId] = useState('');
  const [nome, setNome] = useState('');
  const [objetivo, setObjetivo] = useState(OBJETIVOS[0]);
  const [orcamentoDiario, setOrcamentoDiario] = useState('');

  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    (async () => {
      setCarregandoClientes(true);
      setErroClientes(null);
      try {
        const { data } = await api.get<ClienteOpt[]>('/clientes');
        if (!ativo) return;
        setClientes(data);
        if (data.length > 0) setClienteId(data[0].id);
      } catch {
        if (ativo) setErroClientes('Não foi possível carregar os clientes.');
      } finally {
        if (ativo) setCarregandoClientes(false);
      }
    })();
    return () => {
      ativo = false;
    };
  }, []);

  const valido = clienteId !== '' && nome.trim().length >= 2;

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!valido || salvando) return;
    setSalvando(true);
    setErro(null);
    try {
      await api.post('/trafego/campanhas', {
        clienteId,
        nome: nome.trim(),
        objetivo: objetivo || undefined,
        orcamentoDiario: orcamentoDiario.trim() || undefined,
      });
      onCriada();
    } catch {
      setErro('Falha ao criar a campanha. Verifique os dados e tente de novo.');
      setSalvando(false);
    }
  }

  return (
    <Overlay onFechar={onFechar}>
      <form
        onSubmit={enviar}
        className="brk-gradient-border"
        style={{
          width: 'min(460px, 92vw)',
          background: 'var(--superficie)',
          borderRadius: 18,
          padding: 24,
          boxShadow: 'var(--sombra-card)',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Nova campanha</h2>
          <p style={{ fontSize: 13, color: 'var(--texto-fraco)', marginTop: 2 }}>
            A campanha nasce em rascunho e recebe um código único automático.
          </p>
        </div>

        {carregandoClientes ? (
          <p style={{ fontSize: 13, color: 'var(--texto-fraco)' }}>Carregando clientes…</p>
        ) : erroClientes ? (
          <MensagemErro texto={erroClientes} />
        ) : clientes.length === 0 ? (
          <MensagemErro texto="Cadastre um cliente antes de criar uma campanha." />
        ) : (
          <CampoSelect rotulo="Cliente" obrigatorio valor={clienteId} aoMudar={setClienteId}>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nomeFantasia}
              </option>
            ))}
          </CampoSelect>
        )}

        <Campo
          rotulo="Nome"
          obrigatorio
          valor={nome}
          aoMudar={setNome}
          placeholder="Ex.: Lançamento happy hour"
          autoFocus
        />

        <CampoSelect rotulo="Objetivo" valor={objetivo} aoMudar={setObjetivo}>
          {OBJETIVOS.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </CampoSelect>

        <Campo
          rotulo="Orçamento diário (R$)"
          valor={orcamentoDiario}
          aoMudar={setOrcamentoDiario}
          placeholder="Ex.: 50 (opcional)"
        />

        {erro && <MensagemErro texto={erro} />}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
          <BotaoSecundario onClick={onFechar} disabled={salvando}>
            Cancelar
          </BotaoSecundario>
          <BotaoPrimario type="submit" disabled={!valido || salvando}>
            {salvando ? 'Salvando…' : 'Criar campanha'}
          </BotaoPrimario>
        </div>
      </form>
    </Overlay>
  );
}

/* --------------------------- Modal métricas --------------------------- */

function ModalMetricas({
  campanha,
  onFechar,
  onSalvo,
}: {
  campanha: Campanha;
  onFechar: () => void;
  onSalvo: () => void;
}) {
  const [impressoes, setImpressoes] = useState(String(campanha.impressoes));
  const [cliques, setCliques] = useState(String(campanha.cliques));
  const [conversoes, setConversoes] = useState(String(campanha.conversoes));
  const [gasto, setGasto] = useState(campanha.gasto ?? '');

  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Converte texto → número inteiro não negativo; vazio/inválido fica undefined.
  function inteiro(v: string): number | undefined {
    const t = v.trim();
    if (t === '') return undefined;
    const n = Number(t);
    if (Number.isNaN(n) || n < 0) return undefined;
    return Math.round(n);
  }

  // Converte texto → número decimal não negativo (gasto).
  function decimal(v: string): number | undefined {
    const t = v.trim();
    if (t === '') return undefined;
    const n = Number(t);
    if (Number.isNaN(n) || n < 0) return undefined;
    return n;
  }

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (salvando) return;
    setSalvando(true);
    setErro(null);
    try {
      await api.patch(`/trafego/campanhas/${campanha.id}/metricas`, {
        impressoes: inteiro(impressoes),
        cliques: inteiro(cliques),
        conversoes: inteiro(conversoes),
        gasto: decimal(gasto),
      });
      onSalvo();
    } catch {
      setErro('Falha ao salvar as métricas. Verifique os valores e tente de novo.');
      setSalvando(false);
    }
  }

  return (
    <Overlay onFechar={onFechar}>
      <form
        onSubmit={enviar}
        className="brk-gradient-border"
        style={{
          width: 'min(460px, 92vw)',
          background: 'var(--superficie)',
          borderRadius: 18,
          padding: 24,
          boxShadow: 'var(--sombra-card)',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Editar métricas</h2>
          <p style={{ fontSize: 13, color: 'var(--texto-fraco)', marginTop: 2 }}>
            Atualize os números de {campanha.nome}. CTR e CPA são recalculados.
          </p>
        </div>

        <Campo rotulo="Impressões" valor={impressoes} aoMudar={setImpressoes} placeholder="0" />
        <Campo rotulo="Cliques" valor={cliques} aoMudar={setCliques} placeholder="0" />
        <Campo rotulo="Conversões" valor={conversoes} aoMudar={setConversoes} placeholder="0" />
        <Campo rotulo="Gasto (R$)" valor={gasto} aoMudar={setGasto} placeholder="Ex.: 1500" />

        {erro && <MensagemErro texto={erro} />}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
          <BotaoSecundario onClick={onFechar} disabled={salvando}>
            Cancelar
          </BotaoSecundario>
          <BotaoPrimario type="submit" disabled={salvando}>
            {salvando ? 'Salvando…' : 'Salvar métricas'}
          </BotaoPrimario>
        </div>
      </form>
    </Overlay>
  );
}

/* --------------------------- Helper local --------------------------- */

/**
 * Select estilizado como o `Campo` de Clientes.tsx (que só cobre texto).
 * Espelha o CampoSelect de Comercial.tsx: superfície --superficie-2,
 * borda --borda-forte, raio 10 e anel de foco com --amarelo-fagulha.
 */
function CampoSelect({
  rotulo,
  valor,
  aoMudar,
  children,
  obrigatorio,
  desabilitado,
}: {
  rotulo: string;
  valor: string;
  aoMudar: (v: string) => void;
  children: ReactNode;
  obrigatorio?: boolean;
  desabilitado?: boolean;
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--texto-suave)' }}>
        {rotulo}
        {obrigatorio && <span style={{ color: 'var(--amarelo-fagulha)' }}> *</span>}
      </span>
      <select
        aria-label={rotulo}
        value={valor}
        disabled={desabilitado}
        onChange={(e: ChangeEvent<HTMLSelectElement>) => aoMudar(e.target.value)}
        style={{
          background: 'var(--superficie-2)',
          border: '1px solid var(--borda-forte)',
          borderRadius: 10,
          padding: '11px 13px',
          color: 'var(--texto)',
          fontSize: 14,
          outline: 'none',
          cursor: desabilitado ? 'not-allowed' : 'pointer',
          opacity: desabilitado ? 0.6 : 1,
          transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = 'var(--amarelo-fagulha)';
          e.currentTarget.style.boxShadow = '0 0 0 3px var(--foco)';
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = 'var(--borda-forte)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        {children}
      </select>
    </label>
  );
}

/* ------------------------------ Ícones ------------------------------ */

// Faísca (otimização da IA) — traço, sem emoji.
function IconeFaisca(): ReactNode {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
      <path d="m6.5 6.5 2.5 2.5M15 15l2.5 2.5M17.5 6.5 15 9M9 15l-2.5 2.5" />
    </svg>
  );
}

// Seta de expandir/recolher (chevron) para o cache da IA.
function IconeSeta({ aberta }: { aberta: boolean }): ReactNode {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{
        flexShrink: 0,
        transform: aberta ? 'rotate(90deg)' : 'rotate(0deg)',
        transition: 'transform 0.15s ease',
      }}
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

// Seta para o link "Configurar IA →".
function IconeSetaLink(): ReactNode {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}
