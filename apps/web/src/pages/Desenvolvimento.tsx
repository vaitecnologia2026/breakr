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
 * Tela Desenvolvimento (M21 — board de bugs e tarefas).
 * Quadro kanban: colunas = status do bug; cards = bugs.
 * O usuário registra bugs e os move pelo board trocando o status no card.
 * Trata loading / erro / vazio.
 *
 * Contrato (API):
 *  GET   /bugs → Bug[]   (responsável incluso quando houver)
 *  POST  /bugs { titulo, descricao?, severidade? } → Bug
 *  PATCH /bugs/:id/status { status } → Bug
 */

type StatusBug = 'ABERTO' | 'EM_ANDAMENTO' | 'EM_REVISAO' | 'RESOLVIDO' | 'FECHADO';

type SeveridadeBug = 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA';

interface Bug {
  id: string;
  titulo: string;
  descricao: string | null;
  severidade: SeveridadeBug;
  status: StatusBug;
  codigoUnico: string;
  responsavel?: { nome: string } | null;
}

// Ordem das colunas do board (esquerda → direita).
const ORDEM_STATUS: StatusBug[] = [
  'ABERTO',
  'EM_ANDAMENTO',
  'EM_REVISAO',
  'RESOLVIDO',
  'FECHADO',
];

// Rótulo amigável + cor de acento (ponto) por status.
const STATUS_META: Record<StatusBug, { rotulo: string; cor: string }> = {
  ABERTO: { rotulo: 'Aberto', cor: '#9aa0ad' },
  EM_ANDAMENTO: { rotulo: 'Em andamento', cor: '#ff9406' },
  EM_REVISAO: { rotulo: 'Em revisão', cor: '#ca3f17' },
  RESOLVIDO: { rotulo: 'Resolvido', cor: '#2ecc71' },
  FECHADO: { rotulo: 'Fechado', cor: '#6b7280' },
};

// Severidades disponíveis no modal de criação (rótulo → valor da API).
const SEVERIDADES: { rotulo: string; valor: SeveridadeBug }[] = [
  { rotulo: 'Baixa', valor: 'BAIXA' },
  { rotulo: 'Média', valor: 'MEDIA' },
  { rotulo: 'Alta', valor: 'ALTA' },
  { rotulo: 'Crítica', valor: 'CRITICA' },
];

// Rótulo + cores (pílula) por severidade do bug.
const SEVERIDADE_META: Record<
  SeveridadeBug,
  { rotulo: string; fundo: string; texto: string }
> = {
  BAIXA: { rotulo: 'Baixa', fundo: 'rgba(243, 244, 247, 0.1)', texto: '#cdd0d8' },
  MEDIA: { rotulo: 'Média', fundo: 'rgba(74, 163, 240, 0.16)', texto: '#8cc4f6' },
  ALTA: { rotulo: 'Alta', fundo: 'rgba(255, 148, 6, 0.16)', texto: '#ffb44d' },
  CRITICA: { rotulo: 'Crítica', fundo: 'rgba(148, 18, 44, 0.2)', texto: '#e2738a' },
};

export function Desenvolvimento() {
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [erroAcao, setErroAcao] = useState<string | null>(null);
  const [busca, setBusca] = useState('');

  async function carregar() {
    setCarregando(true);
    setErro(null);
    try {
      const { data } = await api.get<Bug[]>('/bugs');
      setBugs(data);
    } catch {
      setErro('Não foi possível carregar os bugs. Tente novamente.');
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  const q = busca.toLowerCase().trim();
  const filtrados = q
    ? bugs.filter(
        (b) =>
          b.titulo.toLowerCase().includes(q) ||
          (b.descricao ?? '').toLowerCase().includes(q),
      )
    : bugs;

  return (
    <PaginaShell
      titulo="Desenvolvimento"
      subtitulo="Board de bugs e tarefas"
      acao={<BotaoPrimario onClick={() => setModalAberto(true)}>+ Novo bug</BotaoPrimario>}
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
            placeholder="Buscar bug por título ou descrição…"
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
      ) : bugs.length === 0 ? (
        <PainelVazio
          titulo="Nenhum bug ainda"
          descricao="Registre o primeiro bug para começar a mover o board."
          acao={<BotaoPrimario onClick={() => setModalAberto(true)}>+ Novo bug</BotaoPrimario>}
        />
      ) : filtrados.length === 0 ? (
        <PainelVazio
          titulo="Nenhum resultado"
          descricao={`Nenhum bug corresponde a "${busca}".`}
        />
      ) : (
        <>
          {erroAcao && <MensagemErro texto={erroAcao} />}
          <Kanban bugs={filtrados} aoAtualizar={carregar} aoErroAcao={setErroAcao} />
        </>
      )}

      {modalAberto && (
        <ModalNovoBug
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
  bugs,
  aoAtualizar,
  aoErroAcao,
}: {
  bugs: Bug[];
  aoAtualizar: () => void;
  aoErroAcao: (msg: string | null) => void;
}) {
  // Agrupa os bugs por status preservando a ordem das colunas do board.
  const porStatus: Record<StatusBug, Bug[]> = {
    ABERTO: [],
    EM_ANDAMENTO: [],
    EM_REVISAO: [],
    RESOLVIDO: [],
    FECHADO: [],
  };
  for (const b of bugs) {
    (porStatus[b.status] ?? porStatus.ABERTO).push(b);
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
  status: StatusBug;
  itens: Bug[];
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
            Sem bugs aqui.
          </span>
        ) : (
          itens.map((b) => (
            <CardBug key={b.id} bug={b} aoAtualizar={aoAtualizar} aoErroAcao={aoErroAcao} />
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

function CardBug({
  bug,
  aoAtualizar,
  aoErroAcao,
}: {
  bug: Bug;
  aoAtualizar: () => void;
  aoErroAcao: (msg: string | null) => void;
}) {
  // Trava as ações enquanto um PATCH deste bug está em voo.
  const [ocupado, setOcupado] = useState(false);

  async function mover(novo: StatusBug) {
    if (ocupado || novo === bug.status) return;
    setOcupado(true);
    aoErroAcao(null);
    try {
      await api.patch(`/bugs/${bug.id}/status`, { status: novo });
      aoAtualizar();
      // Sucesso recarrega a lista por aoAtualizar (desmonta este card).
    } catch {
      aoErroAcao('Não foi possível mover o bug. Tente novamente.');
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
        {bug.titulo}
      </span>

      <BadgeSeveridade severidade={bug.severidade} />

      <code
        style={{
          alignSelf: 'flex-start',
          fontSize: 11.5,
          color: 'var(--texto-suave)',
          background: 'var(--superficie-3)',
          padding: '2px 8px',
          borderRadius: 6,
          maxWidth: '100%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {bug.codigoUnico}
      </code>

      {bug.responsavel?.nome && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12,
            color: 'var(--texto-suave)',
          }}
        >
          <IconeResponsavel />
          <span
            style={{
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {bug.responsavel.nome}
          </span>
        </div>
      )}

      <SeletorMover
        valor={bug.status}
        desabilitado={ocupado}
        rotuloAcessivel={`Mover bug ${bug.titulo}`}
        aoMudar={mover}
      />
    </div>
  );
}

function BadgeSeveridade({ severidade }: { severidade: SeveridadeBug }) {
  const meta = SEVERIDADE_META[severidade] ?? SEVERIDADE_META.BAIXA;
  return (
    <span
      style={{
        alignSelf: 'flex-start',
        display: 'inline-flex',
        alignItems: 'center',
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: '0.03em',
        padding: '3px 9px',
        borderRadius: 999,
        background: meta.fundo,
        color: meta.texto,
        whiteSpace: 'nowrap',
      }}
    >
      {meta.rotulo}
    </span>
  );
}

// Seletor compacto "mover" — troca o status do bug direto no card.
function SeletorMover({
  valor,
  desabilitado,
  rotuloAcessivel,
  aoMudar,
}: {
  valor: StatusBug;
  desabilitado: boolean;
  rotuloAcessivel: string;
  aoMudar: (novo: StatusBug) => void;
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 2 }}>
      <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--texto-fraco)' }}>Mover</span>
      <select
        aria-label={rotuloAcessivel}
        value={valor}
        disabled={desabilitado}
        onChange={(e: ChangeEvent<HTMLSelectElement>) => aoMudar(e.target.value as StatusBug)}
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

// Ícone de traço (usuário) para o responsável — sem emoji.
function IconeResponsavel(): ReactNode {
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

/* --------------------------- Modal novo ---------------------------- */

function ModalNovoBug({
  onFechar,
  onCriado,
}: {
  onFechar: () => void;
  onCriado: () => void;
}) {
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [severidade, setSeveridade] = useState<SeveridadeBug>('MEDIA');

  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const valido = titulo.trim().length >= 2;

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!valido || salvando) return;
    setSalvando(true);
    setErro(null);
    try {
      await api.post('/bugs', {
        titulo: titulo.trim(),
        descricao: descricao.trim() || undefined,
        severidade,
      });
      onCriado();
    } catch {
      setErro('Falha ao registrar o bug. Verifique os dados e tente de novo.');
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
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Novo bug</h2>
          <p style={{ fontSize: 13, color: 'var(--texto-fraco)', marginTop: 2 }}>
            O bug entra no board em Aberto e recebe um código único automático.
          </p>
        </div>

        <Campo
          rotulo="Título"
          obrigatorio
          valor={titulo}
          aoMudar={setTitulo}
          placeholder="Ex.: Erro ao salvar cliente"
          autoFocus
        />

        <CampoTextarea
          rotulo="Descrição"
          valor={descricao}
          aoMudar={setDescricao}
          placeholder="Passos para reproduzir, comportamento esperado etc. (opcional)"
        />

        <CampoSelect
          rotulo="Severidade"
          valor={severidade}
          aoMudar={(v) => setSeveridade(v as SeveridadeBug)}
        >
          {SEVERIDADES.map((s) => (
            <option key={s.valor} value={s.valor}>
              {s.rotulo}
            </option>
          ))}
        </CampoSelect>

        {erro && <MensagemErro texto={erro} />}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
          <BotaoSecundario onClick={onFechar} disabled={salvando}>
            Cancelar
          </BotaoSecundario>
          <BotaoPrimario type="submit" disabled={!valido || salvando}>
            {salvando ? 'Salvando…' : 'Criar bug'}
          </BotaoPrimario>
        </div>
      </form>
    </Overlay>
  );
}

/* --------------------------- Helpers locais --------------------------- */

/**
 * Select estilizado como o `Campo` de Clientes.tsx (que só cobre texto).
 * Superfície --superficie-2, borda --borda-forte, raio 10 e anel de foco
 * com --amarelo-fagulha. Aceita as <option> como children.
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

/**
 * Textarea estilizado como o `Campo` de Clientes.tsx, para a descrição
 * multilinha do bug. Mesma superfície/borda/foco dos demais campos.
 */
function CampoTextarea({
  rotulo,
  valor,
  aoMudar,
  placeholder,
}: {
  rotulo: string;
  valor: string;
  aoMudar: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--texto-suave)' }}>
        {rotulo}
      </span>
      <textarea
        value={valor}
        onChange={(e: ChangeEvent<HTMLTextAreaElement>) => aoMudar(e.target.value)}
        placeholder={placeholder}
        rows={4}
        style={{
          background: 'var(--superficie-2)',
          border: '1px solid var(--borda-forte)',
          borderRadius: 10,
          padding: '11px 13px',
          color: 'var(--texto)',
          fontSize: 14,
          outline: 'none',
          resize: 'vertical',
          minHeight: 88,
          fontFamily: 'inherit',
          lineHeight: 1.4,
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
      />
    </label>
  );
}
