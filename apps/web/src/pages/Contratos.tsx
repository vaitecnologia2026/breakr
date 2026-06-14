import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../lib/api';
import {
  PaginaShell,
  Th,
  Td,
  RodapeContagem,
  BotaoPrimario,
  BotaoSecundario,
  Campo,
  Overlay,
  MensagemErro,
  EstadoCarregando,
  EstadoErro,
  PainelVazio,
} from './Clientes';

/**
 * Tela de Contratos (Fase 1 — pipeline de entrada).
 * Lista os contratos da carteira e conduz o fluxo do contrato até a vigência:
 * rascunho → aguardando assinatura → em revisão → em vigor. Cada linha expõe
 * apenas a próxima ação possível pelo status. Permite criar um novo contrato
 * via modal (escolhendo cliente + plano). Trata loading / erro / vazio.
 *
 * Contrato (API):
 *  GET  /contratos → Contrato[]   (mais recentes primeiro; cliente.nomeFantasia incluso)
 *  POST /contratos { clienteId, planoId?, valorMensal?, vencimento? }
 *  POST /contratos/:id/enviar-assinatura
 *  POST /contratos/:id/assinado
 *  POST /contratos/:id/vigor
 *  GET  /clientes → ClienteOpt[]   (para o modal)
 *  GET  /planos   → PlanoOpt[]      (para o modal)
 */

type StatusContrato =
  | 'RASCUNHO'
  | 'AGUARDANDO_ASSINATURA'
  | 'EM_REVISAO'
  | 'EM_VIGOR'
  | 'RENOVACAO'
  | 'ENCERRADO';

interface Contrato {
  id: string;
  status: StatusContrato;
  valorMensal: string;
  codigoUnico: string;
  dataInicio: string | null;
  vencimento: string | null;
  clienteId: string;
  planoId: string | null;
  cliente?: { nomeFantasia: string };
}

interface ClienteOpt {
  id: string;
  nomeFantasia: string;
  planoId: string | null;
}

interface PlanoOpt {
  id: string;
  nome: string;
  valor: string;
}

// Rótulo amigável + cores do chip por status do contrato.
const CORES_STATUS: Record<
  StatusContrato,
  { rotulo: string; fundo: string; texto: string; ponto: string }
> = {
  RASCUNHO: {
    rotulo: 'Rascunho',
    fundo: 'rgba(243, 244, 247, 0.08)',
    texto: 'var(--texto-suave)',
    ponto: '#9aa0ad',
  },
  AGUARDANDO_ASSINATURA: {
    rotulo: 'Aguardando assinatura',
    fundo: 'rgba(255, 148, 6, 0.14)',
    texto: '#ffb44d',
    ponto: '#ff9406',
  },
  EM_REVISAO: {
    rotulo: 'Em revisão',
    fundo: 'rgba(202, 63, 23, 0.16)',
    texto: '#f0814f',
    ponto: '#ca3f17',
  },
  EM_VIGOR: {
    rotulo: 'Em vigor',
    fundo: 'rgba(46, 204, 113, 0.14)',
    texto: '#67e0a3',
    ponto: '#2ecc71',
  },
  RENOVACAO: {
    rotulo: 'Renovação',
    fundo: 'rgba(243, 244, 247, 0.1)',
    texto: '#cdd0d8',
    ponto: '#9aa0ad',
  },
  ENCERRADO: {
    rotulo: 'Encerrado',
    fundo: 'rgba(148, 18, 44, 0.18)',
    texto: '#e2738a',
    ponto: '#94122c',
  },
};

// Próxima ação por status: rótulo do botão + sufixo do endpoint POST.
// Status sem ação seguinte ficam de fora deste mapa.
const PROXIMA_ACAO: Partial<
  Record<StatusContrato, { rotulo: string; rota: string }>
> = {
  RASCUNHO: { rotulo: 'Enviar p/ assinatura', rota: 'enviar-assinatura' },
  AGUARDANDO_ASSINATURA: { rotulo: 'Marcar assinado', rota: 'assinado' },
  EM_REVISAO: { rotulo: 'Colocar em vigor', rota: 'vigor' },
};

export function Contratos() {
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  // Erro transitório de uma ação de linha (avança status), mostrado acima da tabela.
  const [erroAcao, setErroAcao] = useState<string | null>(null);

  async function carregar() {
    setCarregando(true);
    setErro(null);
    try {
      const { data } = await api.get<Contrato[]>('/contratos');
      setContratos(data);
    } catch {
      setErro('Não foi possível carregar os contratos. Tente novamente.');
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  return (
    <PaginaShell
      titulo="Contratos"
      subtitulo="Pipeline de entrada — contrato à assinatura e vigência"
      acao={
        <BotaoPrimario onClick={() => setModalAberto(true)}>
          + Novo contrato
        </BotaoPrimario>
      }
    >
      {carregando ? (
        <EstadoCarregando />
      ) : erro ? (
        <EstadoErro mensagem={erro} onTentar={carregar} />
      ) : contratos.length === 0 ? (
        <PainelVazio
          titulo="Nenhum contrato ainda"
          descricao="Crie o primeiro contrato para iniciar o pipeline de entrada de um cliente."
          acao={<BotaoPrimario onClick={() => setModalAberto(true)}>+ Novo contrato</BotaoPrimario>}
        />
      ) : (
        <>
          {erroAcao && <MensagemErro texto={erroAcao} />}
          <TabelaContratos
            contratos={contratos}
            aoAtualizar={carregar}
            aoErroAcao={setErroAcao}
          />
        </>
      )}

      {modalAberto && (
        <ModalNovoContrato
          onFechar={() => setModalAberto(false)}
          onCriado={() => {
            setModalAberto(false);
            carregar();
          }}
        />
      )}
    </PaginaShell>
  );
}

/* ----------------------------- Tabela ----------------------------- */

function TabelaContratos({
  contratos,
  aoAtualizar,
  aoErroAcao,
}: {
  contratos: Contrato[];
  aoAtualizar: () => void;
  aoErroAcao: (msg: string | null) => void;
}) {
  return (
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
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 880 }}>
          <thead>
            <tr>
              <Th>Cliente</Th>
              <Th>Código</Th>
              <Th>Valor/mês</Th>
              <Th>Status</Th>
              <Th>Vencimento</Th>
              <Th>Ações</Th>
            </tr>
          </thead>
          <tbody>
            {contratos.map((c) => (
              <LinhaContrato
                key={c.id}
                contrato={c}
                aoAtualizar={aoAtualizar}
                aoErroAcao={aoErroAcao}
              />
            ))}
          </tbody>
        </table>
      </div>
      <RodapeContagem total={contratos.length} rotulo="contrato" />
    </div>
  );
}

function LinhaContrato({
  contrato,
  aoAtualizar,
  aoErroAcao,
}: {
  contrato: Contrato;
  aoAtualizar: () => void;
  aoErroAcao: (msg: string | null) => void;
}) {
  const [executando, setExecutando] = useState(false);
  const acao = PROXIMA_ACAO[contrato.status];

  async function avancar() {
    if (!acao || executando) return;
    setExecutando(true);
    aoErroAcao(null);
    try {
      await api.post(`/contratos/${contrato.id}/${acao.rota}`);
      aoAtualizar();
    } catch {
      aoErroAcao('Não foi possível avançar o contrato. Tente novamente.');
      setExecutando(false);
    }
    // Em caso de sucesso a lista é recarregada por aoAtualizar (desmonta a linha).
  }

  return (
    <tr className="brk-row" style={{ borderTop: '1px solid var(--borda)' }}>
      <Td>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Avatar nome={contrato.cliente?.nomeFantasia ?? '?'} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600, color: 'var(--cinza-vapor)' }}>
              {contrato.cliente?.nomeFantasia ?? 'Cliente'}
            </div>
          </div>
        </div>
      </Td>
      <Td>
        <CodigoChip codigo={contrato.codigoUnico} />
      </Td>
      <Td>
        <span style={{ color: 'var(--texto-suave)', fontVariantNumeric: 'tabular-nums' }}>
          {formatarBRL(contrato.valorMensal)}
        </span>
      </Td>
      <Td>
        <BadgeStatusContrato status={contrato.status} />
      </Td>
      <Td>
        <span style={{ color: contrato.vencimento ? 'var(--texto-fraco)' : 'var(--texto-fraco)' }}>
          {formatarData(contrato.vencimento)}
        </span>
      </Td>
      <Td>
        {acao ? (
          <BotaoSecundario onClick={avancar} disabled={executando}>
            {executando ? 'Processando…' : acao.rotulo}
          </BotaoSecundario>
        ) : contrato.status === 'EM_VIGOR' ? (
          <span style={{ fontSize: 12.5, color: 'var(--texto-fraco)' }}>1ª cobrança gerada</span>
        ) : (
          <span style={{ color: 'var(--texto-fraco)' }}>—</span>
        )}
      </Td>
    </tr>
  );
}

function BadgeStatusContrato({ status }: { status: StatusContrato }) {
  const cor = CORES_STATUS[status] ?? CORES_STATUS.RASCUNHO;
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

/* --------------------------- Modal novo --------------------------- */

function ModalNovoContrato({
  onFechar,
  onCriado,
}: {
  onFechar: () => void;
  onCriado: () => void;
}) {
  const [clientes, setClientes] = useState<ClienteOpt[]>([]);
  const [planos, setPlanos] = useState<PlanoOpt[]>([]);
  const [carregandoOpcoes, setCarregandoOpcoes] = useState(true);
  const [erroOpcoes, setErroOpcoes] = useState(false);

  const [clienteId, setClienteId] = useState('');
  const [planoId, setPlanoId] = useState('');
  const [valorMensal, setValorMensal] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Carrega clientes e planos em paralelo para popular os selects.
  useEffect(() => {
    let ativo = true;
    (async () => {
      setCarregandoOpcoes(true);
      setErroOpcoes(false);
      try {
        const [resClientes, resPlanos] = await Promise.all([
          api.get<ClienteOpt[]>('/clientes'),
          api.get<PlanoOpt[]>('/planos'),
        ]);
        if (!ativo) return;
        setClientes(resClientes.data);
        setPlanos(resPlanos.data);
      } catch {
        if (ativo) setErroOpcoes(true);
      } finally {
        if (ativo) setCarregandoOpcoes(false);
      }
    })();
    return () => {
      ativo = false;
    };
  }, []);

  // Ao escolher o cliente, sugere o plano dele (se houver) quando ainda não há plano escolhido.
  function escolherCliente(id: string) {
    setClienteId(id);
    const cli = clientes.find((c) => c.id === id);
    if (cli?.planoId) setPlanoId(cli.planoId);
  }

  const valido = clienteId.length > 0;

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!valido || salvando) return;
    setSalvando(true);
    setErro(null);
    try {
      await api.post('/contratos', {
        clienteId,
        planoId: planoId || undefined,
        valorMensal: valorMensal.trim() || undefined,
        vencimento: undefined,
      });
      onCriado();
    } catch {
      setErro('Falha ao criar o contrato. Verifique os dados e tente de novo.');
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
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Novo contrato</h2>
          <p style={{ fontSize: 13, color: 'var(--texto-fraco)', marginTop: 2 }}>
            O código único e o status inicial (rascunho) são gerados automaticamente.
          </p>
        </div>

        {erroOpcoes ? (
          <MensagemErro texto="Não foi possível carregar clientes e planos. Feche e tente de novo." />
        ) : (
          <>
            <CampoSelect
              rotulo="Cliente"
              obrigatorio
              valor={clienteId}
              aoMudar={escolherCliente}
              desabilitado={carregandoOpcoes}
              opcoes={[
                {
                  valor: '',
                  rotulo: carregandoOpcoes ? 'Carregando…' : 'Selecione o cliente',
                },
                ...clientes.map((c) => ({ valor: c.id, rotulo: c.nomeFantasia })),
              ]}
            />
            <CampoSelect
              rotulo="Plano"
              valor={planoId}
              aoMudar={setPlanoId}
              desabilitado={carregandoOpcoes}
              opcoes={[
                { valor: '', rotulo: 'Sem plano / definir depois' },
                ...planos.map((p) => ({
                  valor: p.id,
                  rotulo: `${p.nome} · ${formatarBRL(p.valor)}`,
                })),
              ]}
            />
            <Campo
              rotulo="Valor mensal (opcional — usa o do plano se vazio)"
              valor={valorMensal}
              aoMudar={setValorMensal}
              placeholder="Ex.: 2500.00"
            />
          </>
        )}

        {erro && <MensagemErro texto={erro} />}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
          <BotaoSecundario onClick={onFechar} disabled={salvando}>
            Cancelar
          </BotaoSecundario>
          <BotaoPrimario type="submit" disabled={!valido || salvando || erroOpcoes}>
            {salvando ? 'Criando…' : 'Criar contrato'}
          </BotaoPrimario>
        </div>
      </form>
    </Overlay>
  );
}

/* ------------------------- Helpers locais ------------------------- */

/**
 * Select estilizado para casar com o <input> do Campo de Clientes.tsx
 * (mesmo fundo, borda, raio e anel de foco). Mantido local para não
 * acoplar nem alterar os primitivos compartilhados.
 */
function CampoSelect({
  rotulo,
  valor,
  aoMudar,
  opcoes,
  obrigatorio,
  desabilitado,
}: {
  rotulo: string;
  valor: string;
  aoMudar: (v: string) => void;
  opcoes: { valor: string; rotulo: string }[];
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
        value={valor}
        onChange={(e) => aoMudar(e.target.value)}
        disabled={desabilitado}
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
          appearance: 'none',
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
        {opcoes.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.rotulo}
          </option>
        ))}
      </select>
    </label>
  );
}

function CodigoChip({ codigo }: { codigo: string }) {
  return (
    <code
      style={{
        fontSize: 12.5,
        color: 'var(--texto-suave)',
        background: 'var(--superficie-3)',
        padding: '2px 8px',
        borderRadius: 6,
      }}
    >
      {codigo}
    </code>
  );
}

function Avatar({ nome }: { nome: string }) {
  const iniciais = nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
  return (
    <span
      aria-hidden="true"
      className="brk-gradient-bg"
      style={{
        width: 34,
        height: 34,
        flexShrink: 0,
        borderRadius: 10,
        display: 'grid',
        placeItems: 'center',
        color: '#fff',
        fontWeight: 800,
        fontSize: 12.5,
      }}
    >
      {iniciais || '?'}
    </span>
  );
}

// Formata "1234.56" → "R$ 1.234,56". Valor inválido cai para "—".
function formatarBRL(valor: string): string {
  const n = Number(valor);
  if (Number.isNaN(n)) return '—';
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Copiada (não importada) de Clientes.tsx; aceita null para datas opcionais.
function formatarData(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}
