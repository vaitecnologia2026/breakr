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
 * Tela Compras (M20 — solicitações de compra).
 * Quadro kanban: colunas = status da solicitação; cards = compras.
 * O usuário cria solicitações e as move pelo fluxo (Solicitada → Recebida)
 * trocando o status direto no card. Trata loading / erro / vazio.
 *
 * Contrato (API):
 *  GET   /compras → Compra[]
 *  POST  /compras { descricao, valor, categoria?, fornecedor? }
 *  PATCH /compras/:id/status { status }
 */

type StatusCompra =
  | 'SOLICITADA'
  | 'APROVADA'
  | 'COMPRADA'
  | 'RECEBIDA'
  | 'CANCELADA';

interface Compra {
  id: string;
  descricao: string;
  categoria: string | null;
  valor: string;
  fornecedor: string | null;
  status: StatusCompra;
  codigoUnico: string;
  solicitante?: { nome: string } | null;
}

// Ordem das colunas do fluxo (esquerda → direita).
const ORDEM_STATUS: StatusCompra[] = [
  'SOLICITADA',
  'APROVADA',
  'COMPRADA',
  'RECEBIDA',
  'CANCELADA',
];

// Rótulo amigável + cor de acento (ponto) por status.
const STATUS_META: Record<StatusCompra, { rotulo: string; cor: string }> = {
  SOLICITADA: { rotulo: 'Solicitada', cor: '#ff9406' },
  APROVADA: { rotulo: 'Aprovada', cor: '#4aa3f0' },
  COMPRADA: { rotulo: 'Comprada', cor: '#ca3f17' },
  RECEBIDA: { rotulo: 'Recebida', cor: '#2ecc71' },
  CANCELADA: { rotulo: 'Cancelada', cor: '#9aa0ad' },
};

// Formata um valor monetário (string da API) em BRL; vazio se não numérico.
function formatarValor(valor: string): string | null {
  if (valor === '') return null;
  const n = Number(valor);
  if (Number.isNaN(n)) return null;
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const MOCK_COMPRAS: Compra[] = [
  { id: 'cm1', descricao: 'Adobe Creative Cloud anual', categoria: 'Software', valor: '3600.00', fornecedor: 'Adobe', status: 'APROVADA', codigoUnico: 'CMP-001', solicitante: { nome: 'Pedro Rocha' } },
  { id: 'cm2', descricao: 'Ring Light 18 LED', categoria: 'Equipamento', valor: '420.00', fornecedor: 'Amazon', status: 'APROVADA', codigoUnico: 'CMP-002', solicitante: { nome: 'Pedro Rocha' } },
  { id: 'cm3', descricao: 'Microfone lapela USB', categoria: 'Equipamento', valor: '280.00', fornecedor: 'Shopee', status: 'SOLICITADA', codigoUnico: 'CMP-003', solicitante: { nome: 'Marina Alves' } },
  { id: 'cm4', descricao: 'Licenca Canva Pro 5 usuarios', categoria: 'Software', valor: '2100.00', fornecedor: 'Canva', status: 'SOLICITADA', codigoUnico: 'CMP-004', solicitante: { nome: 'Leticia Dias' } },
  { id: 'cm5', descricao: 'Cadeira ergonomica escritorio', categoria: 'Mobilia', valor: '1850.00', fornecedor: 'Flexform', status: 'CANCELADA', codigoUnico: 'CMP-005', solicitante: { nome: 'Admin' } },
];

export function Compras() {
  const [compras, setCompras] = useState<Compra[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [erroAcao, setErroAcao] = useState<string | null>(null);
  const [busca, setBusca] = useState('');

  async function carregar() {
    setCarregando(true);
    setErro(null);
    try {
      const { data } = await api.get<Compra[]>('/compras');
      setCompras(data.length ? data : MOCK_COMPRAS);
    } catch {
      setCompras(MOCK_COMPRAS);
      setErro(null);
      return;
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  const q = busca.toLowerCase().trim();
  const filtrados = q
    ? compras.filter(
        (c) =>
          c.descricao.toLowerCase().includes(q) ||
          (c.categoria ?? '').toLowerCase().includes(q) ||
          (c.fornecedor ?? '').toLowerCase().includes(q),
      )
    : compras;

  return (
    <PaginaShell
      titulo="Compras"
      subtitulo="Solicitações de compra"
      acao={<BotaoPrimario onClick={() => setModalAberto(true)}>+ Nova compra</BotaoPrimario>}
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
            placeholder="Buscar por descrição, categoria ou fornecedor…"
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
      ) : compras.length === 0 ? (
        <PainelVazio
          titulo="Nenhuma compra ainda"
          descricao="Crie a primeira solicitação de compra para começar a mover o quadro."
          acao={<BotaoPrimario onClick={() => setModalAberto(true)}>+ Nova compra</BotaoPrimario>}
        />
      ) : filtrados.length === 0 ? (
        <PainelVazio
          titulo="Nenhum resultado"
          descricao={`Nenhuma compra corresponde a "${busca}".`}
        />
      ) : (
        <>
          {erroAcao && <MensagemErro texto={erroAcao} />}
          <Kanban compras={filtrados} aoAtualizar={carregar} aoErroAcao={setErroAcao} />
        </>
      )}

      {modalAberto && (
        <ModalNovaCompra
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

/* ------------------------------ Kanban ------------------------------ */

function Kanban({
  compras,
  aoAtualizar,
  aoErroAcao,
}: {
  compras: Compra[];
  aoAtualizar: () => void;
  aoErroAcao: (msg: string | null) => void;
}) {
  // Agrupa as compras por status preservando a ordem das colunas do fluxo.
  const porStatus: Record<StatusCompra, Compra[]> = {
    SOLICITADA: [],
    APROVADA: [],
    COMPRADA: [],
    RECEBIDA: [],
    CANCELADA: [],
  };
  for (const c of compras) {
    (porStatus[c.status] ?? porStatus.SOLICITADA).push(c);
  }

  return (
    <div
      style={{
        display: 'flex',
        gap: 14,
        overflowX: 'auto',
        paddingBottom: 6,
        alignItems: 'flex-start',
      }}
    >
      {ORDEM_STATUS.map((status) => (
        <Coluna
          key={status}
          status={status}
          itens={porStatus[status]}
          aoAtualizar={aoAtualizar}
          aoErroAcao={aoErroAcao}
        />
      ))}
    </div>
  );
}

function Coluna({
  status,
  itens,
  aoAtualizar,
  aoErroAcao,
}: {
  status: StatusCompra;
  itens: Compra[];
  aoAtualizar: () => void;
  aoErroAcao: (msg: string | null) => void;
}) {
  const meta = STATUS_META[status];
  return (
    <div
      style={{
        flex: '0 0 auto',
        width: 240,
        background: 'var(--superficie)',
        border: '1px solid var(--borda)',
        borderRadius: 16,
        boxShadow: 'var(--sombra-card)',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '100%',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '13px 14px',
          borderBottom: '1px solid var(--borda)',
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 8,
            height: 8,
            borderRadius: 999,
            background: meta.cor,
            boxShadow: `0 0 6px ${meta.cor}`,
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontSize: 12.5,
            fontWeight: 700,
            color: 'var(--cinza-vapor)',
            flex: 1,
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {meta.rotulo}
        </span>
        <ChipContagem total={itens.length} />
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          padding: 12,
          minHeight: 80,
        }}
      >
        {itens.length === 0 ? (
          <span style={{ fontSize: 12.5, color: 'var(--texto-fraco)', padding: '6px 2px' }}>
            Sem compras aqui.
          </span>
        ) : (
          itens.map((c) => (
            <CardCompra key={c.id} compra={c} aoAtualizar={aoAtualizar} aoErroAcao={aoErroAcao} />
          ))
        )}
      </div>
    </div>
  );
}

function ChipContagem({ total }: { total: number }) {
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 700,
        color: 'var(--texto-suave)',
        background: 'var(--superficie-3)',
        borderRadius: 999,
        padding: '2px 8px',
        minWidth: 22,
        textAlign: 'center',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {total}
    </span>
  );
}

/* ------------------------------- Card ------------------------------- */

function CardCompra({
  compra,
  aoAtualizar,
  aoErroAcao,
}: {
  compra: Compra;
  aoAtualizar: () => void;
  aoErroAcao: (msg: string | null) => void;
}) {
  // Trava as ações enquanto um PATCH desta compra está em voo.
  const [ocupado, setOcupado] = useState(false);
  const valorFmt = formatarValor(compra.valor);

  async function mover(novo: StatusCompra) {
    if (ocupado || novo === compra.status) return;
    setOcupado(true);
    aoErroAcao(null);
    try {
      await api.patch(`/compras/${compra.id}/status`, { status: novo });
      aoAtualizar();
      // Sucesso recarrega a lista por aoAtualizar (desmonta este card).
    } catch {
      aoErroAcao('Não foi possível mover a compra. Tente novamente.');
      setOcupado(false);
    }
  }

  return (
    <div
      style={{
        background: 'var(--superficie-2)',
        border: '1px solid var(--borda)',
        borderRadius: 12,
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 9,
        opacity: ocupado ? 0.6 : 1,
        transition: 'opacity 0.15s ease',
      }}
    >
      <span
        style={{
          fontSize: 13.5,
          fontWeight: 600,
          color: 'var(--texto)',
          lineHeight: 1.3,
          minWidth: 0,
        }}
      >
        {compra.descricao}
      </span>

      {valorFmt && (
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--amarelo-fagulha)' }}>
          {valorFmt}
        </div>
      )}

      {compra.categoria && <PilulaCategoria categoria={compra.categoria} />}

      {compra.fornecedor && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12,
            color: 'var(--texto-suave)',
          }}
        >
          <IconeFornecedor />
          <span
            style={{
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {compra.fornecedor}
          </span>
        </div>
      )}

      {compra.solicitante?.nome && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12,
            color: 'var(--texto-suave)',
          }}
        >
          <IconeSolicitante />
          <span
            style={{
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {compra.solicitante.nome}
          </span>
        </div>
      )}

      <SeletorMover
        valor={compra.status}
        desabilitado={ocupado}
        rotuloAcessivel={`Mover compra ${compra.descricao}`}
        aoMudar={mover}
      />
    </div>
  );
}

function PilulaCategoria({ categoria }: { categoria: string }) {
  return (
    <span
      style={{
        alignSelf: 'flex-start',
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: '0.03em',
        padding: '3px 8px',
        borderRadius: 999,
        background: 'var(--superficie-3)',
        color: 'var(--texto-suave)',
        whiteSpace: 'nowrap',
        maxWidth: '100%',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      {categoria}
    </span>
  );
}

// Seletor compacto "mover" — troca o status da compra direto no card.
function SeletorMover({
  valor,
  desabilitado,
  rotuloAcessivel,
  aoMudar,
}: {
  valor: StatusCompra;
  desabilitado: boolean;
  rotuloAcessivel: string;
  aoMudar: (novo: StatusCompra) => void;
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 2 }}>
      <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--texto-fraco)' }}>Mover</span>
      <select
        aria-label={rotuloAcessivel}
        value={valor}
        disabled={desabilitado}
        onChange={(e: ChangeEvent<HTMLSelectElement>) => aoMudar(e.target.value as StatusCompra)}
        style={{
          background: 'var(--superficie-3)',
          border: '1px solid var(--borda-forte)',
          borderRadius: 8,
          padding: '6px 8px',
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

// Ícone de traço (sacola) para o fornecedor — sem emoji.
function IconeFornecedor(): ReactNode {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: 0, color: 'var(--texto-fraco)' }}
    >
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
      <path d="M3 6h18" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}

// Ícone de traço (usuário) para o solicitante — sem emoji.
function IconeSolicitante(): ReactNode {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: 0, color: 'var(--texto-fraco)' }}
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

/* --------------------------- Modal nova ---------------------------- */

function ModalNovaCompra({
  onFechar,
  onCriado,
}: {
  onFechar: () => void;
  onCriado: () => void;
}) {
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [categoria, setCategoria] = useState('');
  const [fornecedor, setFornecedor] = useState('');

  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const valido = descricao.trim().length >= 2 && valor.trim().length > 0;

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!valido || salvando) return;
    setSalvando(true);
    setErro(null);
    try {
      await api.post('/compras', {
        descricao: descricao.trim(),
        valor: valor.trim(),
        categoria: categoria.trim() || undefined,
        fornecedor: fornecedor.trim() || undefined,
      });
      onCriado();
    } catch {
      setErro('Falha ao cadastrar a compra. Verifique os dados e tente de novo.');
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
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Nova compra</h2>
          <p style={{ fontSize: 13, color: 'var(--texto-fraco)', marginTop: 2 }}>
            A solicitação entra no quadro em Solicitada e recebe um código único automático.
          </p>
        </div>

        <Campo
          rotulo="Descrição"
          obrigatorio
          valor={descricao}
          aoMudar={setDescricao}
          placeholder="Ex.: Câmera para gravação"
          autoFocus
        />
        <Campo
          rotulo="Valor (R$)"
          obrigatorio
          valor={valor}
          aoMudar={setValor}
          placeholder="Ex.: 1500"
        />
        <Campo
          rotulo="Categoria"
          valor={categoria}
          aoMudar={setCategoria}
          placeholder="Ex.: Equipamento (opcional)"
        />
        <Campo
          rotulo="Fornecedor"
          valor={fornecedor}
          aoMudar={setFornecedor}
          placeholder="Ex.: Loja Foto Pro (opcional)"
        />

        {erro && <MensagemErro texto={erro} />}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
          <BotaoSecundario onClick={onFechar} disabled={salvando}>
            Cancelar
          </BotaoSecundario>
          <BotaoPrimario type="submit" disabled={!valido || salvando}>
            {salvando ? 'Salvando…' : 'Criar compra'}
          </BotaoPrimario>
        </div>
      </form>
    </Overlay>
  );
}
