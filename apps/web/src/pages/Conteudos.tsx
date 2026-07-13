import {
  useEffect,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
} from 'react';
import { api } from '../lib/api';
import { comDemo, mockSeDemo } from '../lib/demo';
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
import { GuiaJornadaMarketing } from '../components/GuiaJornadaMarketing';

/**
 * Tela de Conteúdo (M16 — funil de produção das peças).
 * Quadro kanban: colunas = status; cards = peças de conteúdo.
 * O usuário cria peças e as move pelo funil trocando o status no card.
 * Trata loading / erro / vazio.
 *
 * Contrato (API):
 *  GET   /conteudos → Conteudo[]   (cliente / squad / responsavel inclusos)
 *  POST  /conteudos { clienteId, titulo, tipo?, descricao? }
 *  PATCH /conteudos/:id/status { status }
 *  GET   /clientes → ClienteOpt[]   (para o modal de criação)
 */

type StatusConteudo =
  | 'IDEIA'
  | 'ROTEIRO'
  | 'PRODUCAO'
  | 'REVISAO'
  | 'EM_ALTERACAO'
  | 'APROVACAO_CLIENTE'
  | 'AGENDADO'
  | 'LABORATORIO'
  | 'PUBLICADO'
  | 'ARQUIVADO';

type TipoConteudo = 'POST' | 'REELS' | 'STORY' | 'CARROSSEL' | 'VIDEO' | 'ARTIGO';

// Squad do cliente (auto-preenchimento na criação de peça).
interface SquadDoCliente {
  squad: { id: string; nome: string } | null;
  membros: { funcao: string; usuario: { id: string; nome: string; cargo: string } }[];
}

const FUNCAO_ROTULO: Record<string, string> = {
  CS: 'CS',
  COPYWRITER: 'Copywriter',
  DESIGNER: 'Designer',
  EDITOR_VIDEO: 'Editor de vídeo',
  GESTOR_TRAFEGO: 'Gestor de tráfego',
  ESTRATEGISTA: 'Estrategista',
};

interface Conteudo {
  id: string;
  titulo: string;
  descricao: string | null;
  midiaUrl?: string | null;
  tipo: TipoConteudo;
  status: StatusConteudo;
  codigoUnico: string;
  dataAgendada: string | null;
  estrelas: number | null;
  paraTrafego?: boolean;
  clienteId: string;
  squadId: string | null;
  responsavelId: string | null;
  cliente?: { nomeFantasia: string };
  squad?: { nome: string } | null;
  responsavel?: { nome: string } | null;
}

interface ClienteOpt {
  id: string;
  nomeFantasia: string;
}

// Ordem das colunas do funil (esquerda → direita).
const ORDEM_STATUS: StatusConteudo[] = [
  'IDEIA',
  'ROTEIRO',
  'PRODUCAO',
  'REVISAO',
  'EM_ALTERACAO',
  'APROVACAO_CLIENTE',
  'AGENDADO',
  'LABORATORIO',
  'PUBLICADO',
  'ARQUIVADO',
];

// Rótulo amigável + cor de acento (ponto) por status.
const STATUS_META: Record<StatusConteudo, { rotulo: string; cor: string }> = {
  IDEIA: { rotulo: 'Ideia', cor: '#9aa0ad' },
  ROTEIRO: { rotulo: 'Roteiro', cor: '#9aa0ad' },
  PRODUCAO: { rotulo: 'Produção', cor: '#ff9406' },
  REVISAO: { rotulo: 'Revisão', cor: '#a855f7' },
  EM_ALTERACAO: { rotulo: 'Em alteração', cor: '#ef4444' },
  APROVACAO_CLIENTE: { rotulo: 'Aprovação do cliente', cor: '#ca3f17' },
  AGENDADO: { rotulo: 'Agendado', cor: '#4aa3f0' },
  LABORATORIO: { rotulo: 'Laboratório de criativos', cor: '#a855f7' },
  PUBLICADO: { rotulo: 'Publicado', cor: '#2ecc71' },
  ARQUIVADO: { rotulo: 'Arquivado', cor: '#9aa0ad' },
};

// Rótulo amigável por tipo de peça (pílula do card + opções do modal).
const TIPO_META: Record<TipoConteudo, string> = {
  POST: 'Post',
  REELS: 'Reels',
  STORY: 'Story',
  CARROSSEL: 'Carrossel',
  VIDEO: 'Vídeo',
  ARTIGO: 'Artigo',
};

const TIPOS: TipoConteudo[] = ['POST', 'REELS', 'STORY', 'CARROSSEL', 'VIDEO', 'ARTIGO'];

const MOCK_CONTEUDOS: Conteudo[] = [
  { id: 'cn1', titulo: 'Post: Promocao Dia dos Namorados', descricao: 'Post estatico para feed com oferta especial.', tipo: 'POST', status: 'IDEIA', codigoUnico: 'CNT-001', dataAgendada: '2026-06-18T12:00:00Z', estrelas: null, paraTrafego: false, clienteId: 'c1', squadId: 'sq1', responsavelId: null, cliente: { nomeFantasia: 'Tua Pizza' }, squad: { nome: 'Squad Restaurantes' }, responsavel: { nome: 'Leticia Dias' } },
  { id: 'cn2', titulo: 'Reels: Tour pela cozinha', descricao: 'Video curto mostrando o processo de preparo do sushi.', tipo: 'REELS', status: 'PRODUCAO', codigoUnico: 'CNT-002', dataAgendada: '2026-06-20T18:00:00Z', estrelas: null, paraTrafego: false, clienteId: 'c2', squadId: 'sq1', responsavelId: null, cliente: { nomeFantasia: 'Rikai Sushi' }, squad: { nome: 'Squad Restaurantes' }, responsavel: { nome: 'Pedro Rocha' } },
  { id: 'cn3', titulo: 'Carrossel: Cardapio de Verao', descricao: '5 slides apresentando novidades do cardapio.', tipo: 'CARROSSEL', status: 'REVISAO', codigoUnico: 'CNT-003', dataAgendada: '2026-06-21T11:00:00Z', estrelas: null, paraTrafego: false, clienteId: 'c3', squadId: 'sq2', responsavelId: null, cliente: { nomeFantasia: 'Bigger Pizzaria' }, squad: { nome: 'Squad Premium' }, responsavel: { nome: 'Leticia Dias' } },
  { id: 'cn4', titulo: 'Story: Enquete de sabores', descricao: 'Stories interativos com enquete sobre proximo sabor.', tipo: 'STORY', status: 'APROVACAO_CLIENTE', codigoUnico: 'CNT-004', dataAgendada: '2026-06-22T09:00:00Z', estrelas: null, paraTrafego: false, clienteId: 'c4', squadId: 'sq1', responsavelId: null, cliente: { nomeFantasia: 'Brasa Burger' }, squad: { nome: 'Squad Restaurantes' }, responsavel: { nome: 'Leticia Dias' } },
  { id: 'cn5', titulo: 'Post: Depoimento de cliente', descricao: 'Print de depoimento de cliente satisfeito.', tipo: 'POST', status: 'AGENDADO', codigoUnico: 'CNT-005', dataAgendada: '2026-06-23T14:00:00Z', estrelas: 5, paraTrafego: false, clienteId: 'c5', squadId: 'sq3', responsavelId: null, cliente: { nomeFantasia: 'Taco Loco' }, squad: { nome: 'Squad Growth' }, responsavel: { nome: 'Leticia Dias' } },
  { id: 'cn6', titulo: 'Reels: Tempo de preparo pizza', descricao: 'Timelapse do preparo da pizza especial.', tipo: 'REELS', status: 'PUBLICADO', codigoUnico: 'CNT-006', dataAgendada: '2026-06-10T12:00:00Z', estrelas: 4, paraTrafego: true, clienteId: 'c1', squadId: 'sq1', responsavelId: null, cliente: { nomeFantasia: 'Tua Pizza' }, squad: { nome: 'Squad Restaurantes' }, responsavel: { nome: 'Pedro Rocha' } },
  { id: 'cn7', titulo: 'Post: Promocao segunda-feira', descricao: 'Desconto especial para segunda-feira.', tipo: 'POST', status: 'IDEIA', codigoUnico: 'CNT-007', dataAgendada: '2026-06-24T11:00:00Z', estrelas: null, paraTrafego: false, clienteId: 'c6', squadId: 'sq2', responsavelId: null, cliente: { nomeFantasia: 'Kings Pizza' }, squad: { nome: 'Squad Premium' }, responsavel: { nome: 'Leticia Dias' } },
  { id: 'cn8', titulo: 'Carrossel: Combos do final de semana', descricao: 'Apresentacao dos combos de sabado e domingo.', tipo: 'CARROSSEL', status: 'PRODUCAO', codigoUnico: 'CNT-008', dataAgendada: '2026-06-25T15:00:00Z', estrelas: null, paraTrafego: false, clienteId: 'c7', squadId: 'sq3', responsavelId: null, cliente: { nomeFantasia: 'Brasils Pizzeria' }, squad: { nome: 'Squad Growth' }, responsavel: { nome: 'Leticia Dias' } },
];

export function Conteudos() {
  const [conteudos, setConteudos] = useState<Conteudo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [erroAcao, setErroAcao] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [filtroCliente, setFiltroCliente] = useState('');

  async function carregar() {
    setCarregando(true);
    setErro(null);
    try {
      const { data } = await api.get<Conteudo[]>('/conteudos');
      setConteudos(comDemo(data, MOCK_CONTEUDOS));
    } catch {
      setConteudos(mockSeDemo(MOCK_CONTEUDOS));
      setErro(null);
      return;
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  const clientesUnicos = Array.from(
    new Map(conteudos.map((c) => [c.clienteId, c.cliente?.nomeFantasia ?? c.clienteId])).entries(),
  ).sort((a, b) => a[1].localeCompare(b[1]));

  const q = busca.toLowerCase().trim();
  const filtrados = conteudos.filter((c) => {
    if (filtroCliente && c.clienteId !== filtroCliente) return false;
    if (q) {
      return (
        c.titulo.toLowerCase().includes(q) ||
        (c.cliente?.nomeFantasia ?? '').toLowerCase().includes(q) ||
        TIPO_META[c.tipo].toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <PaginaShell
      titulo="Conteúdo"
      subtitulo="Funil de produção das peças"
      acao={<BotaoPrimario onClick={() => setModalAberto(true)}>+ Nova peça</BotaoPrimario>}
    >
      <GuiaJornadaMarketing etapaAtual="producao" />

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
            placeholder="Buscar por título, cliente ou tipo…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            disabled={carregando}
          />
        </div>
        <select
          className="brk-select-filtro"
          value={filtroCliente}
          onChange={(e) => setFiltroCliente(e.target.value)}
          disabled={carregando || clientesUnicos.length === 0}
        >
          <option value="">Todos os clientes</option>
          {clientesUnicos.map(([id, nome]) => (
            <option key={id} value={id}>{nome}</option>
          ))}
        </select>
        {(filtroCliente || busca) && !carregando && (
          <button
            className="brk-btn-limpar-filtro"
            onClick={() => { setFiltroCliente(''); setBusca(''); }}
          >
            Limpar
          </button>
        )}
        {!carregando && (filtroCliente || busca) && (
          <span style={{ fontSize: 12.5, color: 'var(--texto-fraco)', whiteSpace: 'nowrap' }}>
            {filtrados.length} de {conteudos.length} peças
          </span>
        )}
      </div>

      {carregando ? (
        <EstadoCarregando />
      ) : erro ? (
        <EstadoErro mensagem={erro} onTentar={carregar} />
      ) : conteudos.length === 0 ? (
        <PainelVazio
          titulo="Nenhuma peça ainda"
          descricao="Crie a primeira peça de conteúdo para começar a mover o funil."
          acao={<BotaoPrimario onClick={() => setModalAberto(true)}>+ Nova peça</BotaoPrimario>}
        />
      ) : filtrados.length === 0 ? (
        <PainelVazio
          titulo="Nenhum resultado"
          descricao={`Nenhuma peça corresponde a "${busca}".`}
        />
      ) : (
        <>
          {erroAcao && <MensagemErro texto={erroAcao} />}
          <Kanban conteudos={filtrados} aoAtualizar={carregar} aoErroAcao={setErroAcao} />
        </>
      )}

      {modalAberto && (
        <ModalNovaPeca
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
  conteudos,
  aoAtualizar,
  aoErroAcao,
}: {
  conteudos: Conteudo[];
  aoAtualizar: () => void;
  aoErroAcao: (msg: string | null) => void;
}) {
  // Agrupa as peças por status preservando a ordem das colunas do funil.
  const porStatus: Record<StatusConteudo, Conteudo[]> = {
    IDEIA: [],
    ROTEIRO: [],
    PRODUCAO: [],
    REVISAO: [],
    EM_ALTERACAO: [],
    APROVACAO_CLIENTE: [],
    AGENDADO: [],
    LABORATORIO: [],
    PUBLICADO: [],
    ARQUIVADO: [],
  };
  for (const c of conteudos) {
    (porStatus[c.status] ?? porStatus.IDEIA).push(c);
  }

  // Solta um card numa coluna → move a peça para o status daquela coluna,
  // reusando exatamente o mesmo PATCH /conteudos/:id/status do seletor "Mover".
  // Ignora se a peça já estiver na coluna (nenhuma chamada desnecessária).
  async function aoSoltar(id: string, novoStatus: StatusConteudo) {
    const peca = conteudos.find((c) => c.id === id);
    if (!peca || peca.status === novoStatus) return;
    aoErroAcao(null);
    try {
      await api.patch(`/conteudos/${id}/status`, { status: novoStatus });
      aoAtualizar();
    } catch {
      aoErroAcao('Não foi possível mover a peça. Tente novamente.');
    }
  }

  return (
    <div
      className="brk-kanban-scroll"
      style={{
        display: 'flex',
        gap: 14,
        overflowX: 'auto',
        paddingBottom: 6,
        // Colunas com a mesma altura: assim a área de drop de cada coluna cobre
        // toda a faixa vertical, permitindo soltar um card em QUALQUER coluna
        // (para frente OU para trás) mesmo que ela tenha menos peças.
        alignItems: 'stretch',
      }}
    >
      {ORDEM_STATUS.map((status) => (
        <Coluna
          key={status}
          status={status}
          itens={porStatus[status]}
          aoAtualizar={aoAtualizar}
          aoErroAcao={aoErroAcao}
          aoSoltar={aoSoltar}
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
  aoSoltar,
}: {
  status: StatusConteudo;
  itens: Conteudo[];
  aoAtualizar: () => void;
  aoErroAcao: (msg: string | null) => void;
  aoSoltar: (id: string, novoStatus: StatusConteudo) => void;
}) {
  const meta = STATUS_META[status];
  // Realce da coluna enquanto um card é arrastado por cima dela (feedback de drop).
  const [sobre, setSobre] = useState(false);
  return (
    <div
      className="brk-kanban-col"
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (!sobre) setSobre(true);
      }}
      onDragLeave={(e) => {
        // Só apaga o realce ao sair de fato da coluna (ignora troca entre filhos).
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setSobre(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setSobre(false);
        const id = e.dataTransfer.getData('text/plain');
        if (id) aoSoltar(id, status);
      }}
      style={{
        flex: '0 0 auto',
        background: sobre ? 'var(--superficie-2)' : 'var(--superficie)',
        border: `1px solid ${sobre ? 'var(--amarelo-fagulha)' : 'var(--borda)'}`,
        borderRadius: 16,
        boxShadow: 'var(--sombra-card)',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '100%',
        transition: 'background 0.15s ease, border-color 0.15s ease',
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
          // Ocupa toda a altura da coluna (que agora é igual entre colunas) para
          // que o espaço vazio abaixo dos cards também aceite o drop — soltar
          // um card no mesmo nível vertical funciona indo para frente ou para trás.
          flex: 1,
        }}
      >
        {itens.length === 0 ? (
          <span style={{ fontSize: 12.5, color: 'var(--texto-fraco)', padding: '6px 2px' }}>
            Sem peças aqui.
          </span>
        ) : (
          itens.map((c) => (
            <CardConteudo
              key={c.id}
              conteudo={c}
              aoAtualizar={aoAtualizar}
              aoErroAcao={aoErroAcao}
            />
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

function CardConteudo({
  conteudo,
  aoAtualizar,
  aoErroAcao,
}: {
  conteudo: Conteudo;
  aoAtualizar: () => void;
  aoErroAcao: (msg: string | null) => void;
}) {
  // Trava o seletor enquanto o PATCH desta peça está em voo.
  const [movendo, setMovendo] = useState(false);
  // Editor inline da URL da mídia (imagem/vídeo) que o cliente vê na aprovação (B5).
  const [editMidia, setEditMidia] = useState(false);
  const [midia, setMidia] = useState(conteudo.midiaUrl ?? '');
  // Upload de arquivo (imagem/vídeo/documento) — alternativa ao anexo por link.
  const [enviandoArq, setEnviandoArq] = useState(false);
  // Arrastando este card (feedback visual). Drag só é habilitado quando o card
  // não está movendo nem com o editor de mídia aberto (para não capturar a
  // seleção de texto do input de URL). O drop é tratado pela Coluna.
  const [arrastando, setArrastando] = useState(false);
  // Abre o modal de detalhes (somente leitura) com todas as informações de
  // marketing da peça — o "card aberto".
  const [detalheAberto, setDetalheAberto] = useState(false);
  // Com o modal de detalhes/edição aberto, o card não pode ser arrastado — evita
  // que a seleção de texto nos inputs dispare o drag (mesma regra do editor de mídia).
  const podeArrastar = !movendo && !editMidia && !detalheAberto;

  async function mover(novo: StatusConteudo) {
    if (movendo || novo === conteudo.status) return;
    setMovendo(true);
    aoErroAcao(null);
    try {
      await api.patch(`/conteudos/${conteudo.id}/status`, { status: novo });
      aoAtualizar();
      // Sucesso recarrega a lista por aoAtualizar (desmonta este card).
    } catch {
      aoErroAcao('Não foi possível mover a peça. Tente novamente.');
      setMovendo(false);
    }
  }

  // Handoff copy→design: move para Produção e marca o designer do squad.
  async function encaminharDesign() {
    if (movendo) return;
    setMovendo(true);
    aoErroAcao(null);
    try {
      await api.post(`/conteudos/${conteudo.id}/encaminhar-design`);
      aoAtualizar();
    } catch {
      aoErroAcao('Não foi possível encaminhar para design.');
      setMovendo(false);
    }
  }

  // Anexa/atualiza a URL da mídia da peça (para o cliente visualizar na aprovação).
  async function salvarMidia() {
    if (movendo) return;
    setMovendo(true);
    aoErroAcao(null);
    try {
      await api.patch(`/conteudos/${conteudo.id}/midia`, { midiaUrl: midia.trim() });
      aoAtualizar();
    } catch {
      aoErroAcao('Não foi possível salvar a mídia.');
      setMovendo(false);
    }
  }

  // Upload de arquivo de mídia (imagem/vídeo/documento) até 20 MB — alternativa ao
  // anexo por link. Envia multipart para o backend, que salva e devolve a peça.
  async function enviarArquivo(file: File) {
    if (enviandoArq || movendo) return;
    if (file.size > 20 * 1024 * 1024) {
      aoErroAcao('Arquivo maior que 20 MB. Escolha um arquivo menor.');
      return;
    }
    setEnviandoArq(true);
    aoErroAcao(null);
    try {
      const form = new FormData();
      form.append('arquivo', file);
      await api.post(`/conteudos/${conteudo.id}/midia/upload`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      aoAtualizar();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      aoErroAcao(msg ?? 'Não foi possível enviar o arquivo.');
    } finally {
      setEnviandoArq(false);
    }
  }

  // Mostra o botão de handoff nas fases de copy (antes do design).
  const podeEncaminhar =
    conteudo.status === 'ROTEIRO' || conteudo.status === 'REVISAO';

  return (
    <div
      draggable={podeArrastar}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', conteudo.id);
        e.dataTransfer.effectAllowed = 'move';
        setArrastando(true);
      }}
      onDragEnd={() => setArrastando(false)}
      style={{
        background: 'var(--superficie-2)',
        border: '1px solid var(--borda)',
        borderRadius: 12,
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 9,
        opacity: movendo ? 0.6 : arrastando ? 0.4 : 1,
        cursor: podeArrastar ? 'grab' : 'default',
        transition: 'opacity 0.15s ease',
      }}
    >
      {/* Área clicável do card: abre o modal com todas as informações de marketing
          da peça. Fica separada dos controles abaixo (Mover, mídia, encaminhar)
          para não interferir no arraste nem nos botões existentes. */}
      <div
        role="button"
        tabIndex={0}
        title="Ver detalhes da peça"
        onClick={() => setDetalheAberto(true)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setDetalheAberto(true); } }}
        style={{ display: 'flex', flexDirection: 'column', gap: 9, cursor: 'pointer' }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <span
            style={{
              fontSize: 13.5,
              fontWeight: 600,
              color: 'var(--texto)',
              lineHeight: 1.3,
              flex: 1,
              minWidth: 0,
            }}
          >
            {conteudo.titulo}
          </span>
          <BadgeTipo tipo={conteudo.tipo} />
        </div>

        <div style={{ fontSize: 12, color: 'var(--texto-fraco)', display: 'flex', alignItems: 'center', gap: 6 }}>
          {conteudo.cliente?.nomeFantasia ?? 'Cliente'}
          {conteudo.paraTrafego && (
            <span style={{ fontSize: 10, fontWeight: 700, color: '#a855f7' }}>· TRÁFEGO</span>
          )}
        </div>

        {conteudo.responsavel?.nome && (
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
            <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {conteudo.responsavel.nome}
            </span>
          </div>
        )}
      </div>

      <SeletorMover
        valor={conteudo.status}
        desabilitado={movendo}
        rotuloAcessivel={`Mover peça ${conteudo.titulo}`}
        aoMudar={mover}
      />

      {podeEncaminhar && (
        <button
          type="button"
          onClick={encaminharDesign}
          disabled={movendo}
          style={{
            fontSize: 12,
            fontWeight: 600,
            padding: '6px 10px',
            borderRadius: 8,
            border: '1px solid var(--borda-forte)',
            background: 'var(--superficie-3)',
            color: 'var(--cinza-vapor)',
            cursor: movendo ? 'default' : 'pointer',
          }}
        >
          Encaminhar p/ design →
        </button>
      )}

      {editMidia ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--texto-fraco)', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {enviandoArq ? 'Enviando arquivo…' : 'Enviar arquivo (até 20 MB — imagem, vídeo ou documento)'}
            <input
              type="file"
              accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
              disabled={movendo || enviandoArq}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) enviarArquivo(f); e.currentTarget.value = ''; }}
              style={{ fontSize: 12 }}
            />
          </label>
          <span style={{ fontSize: 11, color: 'var(--texto-fraco)', textAlign: 'center' }}>ou importe por link:</span>
          <input
            className="brk-input"
            type="url"
            placeholder="URL da imagem/vídeo…"
            value={midia}
            onChange={(e) => setMidia(e.target.value)}
            disabled={movendo}
            style={{ fontSize: 12 }}
          />
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              onClick={salvarMidia}
              disabled={movendo}
              style={{ fontSize: 11.5, fontWeight: 600, padding: '5px 9px', borderRadius: 7, border: '1px solid var(--borda-forte)', background: 'var(--superficie-3)', color: 'var(--cinza-vapor)', cursor: movendo ? 'default' : 'pointer' }}
            >
              Salvar mídia
            </button>
            <button
              type="button"
              onClick={() => { setEditMidia(false); setMidia(conteudo.midiaUrl ?? ''); }}
              disabled={movendo}
              style={{ fontSize: 11.5, padding: '5px 9px', borderRadius: 7, border: '1px solid var(--borda)', background: 'transparent', color: 'var(--texto-fraco)', cursor: movendo ? 'default' : 'pointer' }}
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setEditMidia(true)}
          disabled={movendo}
          style={{ fontSize: 12, fontWeight: 600, padding: '6px 10px', borderRadius: 8, border: '1px solid var(--borda)', background: 'transparent', color: 'var(--texto-suave)', cursor: movendo ? 'default' : 'pointer', textAlign: 'left' }}
        >
          {conteudo.midiaUrl ? '🎬 Editar mídia' : '🎬 Anexar mídia'}
        </button>
      )}

      {detalheAberto && (
        <DetalheConteudo
          conteudo={conteudo}
          aoAtualizar={aoAtualizar}
          onFechar={() => setDetalheAberto(false)}
        />
      )}
    </div>
  );
}

function BadgeTipo({ tipo }: { tipo: TipoConteudo }) {
  return (
    <span
      style={{
        flexShrink: 0,
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: '0.03em',
        textTransform: 'uppercase',
        padding: '3px 8px',
        borderRadius: 999,
        background: 'rgba(255, 148, 6, 0.14)',
        color: '#ffb44d',
        whiteSpace: 'nowrap',
      }}
    >
      {TIPO_META[tipo]}
    </span>
  );
}

/* ----------------------- Detalhe da peça (modal) ---------------------- */

// Formata data ISO -> "DD/MM/AAAA HH:mm" (pt-BR). Sem data vira "—".
function formatarDataHora(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// Converte ISO -> valor de <input type="datetime-local"> ("YYYY-MM-DDTHH:mm"),
// no fuso local. Sem data vira string vazia.
function isoParaInputLocal(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

// Detecta o tipo de mídia pela extensão da URL (para pré-visualizar imagem/vídeo).
function tipoMidia(url: string): 'imagem' | 'video' | 'outro' {
  const u = url.toLowerCase().split('?')[0];
  if (/\.(jpg|jpeg|png|gif|webp|avif|bmp|svg)$/.test(u)) return 'imagem';
  if (/\.(mp4|webm|ogg|mov|m4v)$/.test(u)) return 'video';
  return 'outro';
}

// Linha "rótulo → valor" do painel de detalhes.
function LinhaInfo({ rotulo, valor }: { rotulo: string; valor: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--texto-fraco)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
        {rotulo}
      </span>
      <span style={{ fontSize: 13.5, color: 'var(--texto)', wordBreak: 'break-word' }}>{valor}</span>
    </div>
  );
}

// Linha "rótulo → campo editável" (mesmo visual do LinhaInfo, mas com input/select).
function LinhaEdit({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--texto-fraco)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
        {rotulo}
      </span>
      {children}
    </label>
  );
}

/**
 * Modal com TODAS as informações de marketing da peça (o "card aberto"): código,
 * status, cliente, squad, responsável, tipo, tráfego, agendamento, avaliação,
 * descrição e a mídia. Suporta EDIÇÃO das informações (título, tipo, descrição,
 * agendamento, tráfego e mídia) salvando via PATCH /conteudos/:id e recarregando
 * a lista. Status/responsável continuam com os controles próprios do card.
 */
function DetalheConteudo({
  conteudo,
  aoAtualizar,
  onFechar,
}: {
  conteudo: Conteudo;
  aoAtualizar: () => void;
  onFechar: () => void;
}) {
  const meta = STATUS_META[conteudo.status];
  const midia = conteudo.midiaUrl?.trim();
  const tm = midia ? tipoMidia(midia) : 'outro';

  // Modo edição + estado do formulário (inicia com os valores atuais da peça).
  const [editando, setEditando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erroSalvar, setErroSalvar] = useState<string | null>(null);
  const [fTitulo, setFTitulo] = useState(conteudo.titulo);
  const [fTipo, setFTipo] = useState<TipoConteudo>(conteudo.tipo);
  const [fDescricao, setFDescricao] = useState(conteudo.descricao ?? '');
  const [fMidia, setFMidia] = useState(conteudo.midiaUrl ?? '');
  const [fData, setFData] = useState(isoParaInputLocal(conteudo.dataAgendada));
  const [fTrafego, setFTrafego] = useState(conteudo.paraTrafego);

  // Desfaz as edições, voltando aos valores atuais da peça.
  function resetForm() {
    setFTitulo(conteudo.titulo);
    setFTipo(conteudo.tipo);
    setFDescricao(conteudo.descricao ?? '');
    setFMidia(conteudo.midiaUrl ?? '');
    setFData(isoParaInputLocal(conteudo.dataAgendada));
    setFTrafego(conteudo.paraTrafego);
    setErroSalvar(null);
  }

  async function salvar() {
    if (salvando) return;
    if (fTitulo.trim().length < 2) {
      setErroSalvar('O título precisa de ao menos 2 caracteres.');
      return;
    }
    setSalvando(true);
    setErroSalvar(null);
    try {
      await api.patch(`/conteudos/${conteudo.id}`, {
        titulo: fTitulo.trim(),
        tipo: fTipo,
        descricao: fDescricao.trim(),
        midiaUrl: fMidia.trim(),
        paraTrafego: fTrafego,
        dataAgendada: fData ? new Date(fData).toISOString() : null,
      });
      aoAtualizar();
      onFechar();
    } catch {
      setErroSalvar('Não foi possível salvar as alterações. Tente novamente.');
      setSalvando(false);
    }
  }

  const estiloInput: CSSProperties = { width: '100%', fontSize: 13.5 };

  return (
    <Overlay onFechar={onFechar}>
      <div
        className="brk-gradient-border"
        style={{
          width: 'min(560px, 94vw)',
          maxHeight: '88vh',
          overflowY: 'auto',
          background: 'var(--superficie)',
          borderRadius: 18,
          padding: 24,
          boxShadow: 'var(--sombra-card)',
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
        }}
      >
        {/* Cabeçalho: título + tipo + código + fechar */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {editando ? (
              <input
                className="brk-input"
                value={fTitulo}
                onChange={(e) => setFTitulo(e.target.value)}
                maxLength={160}
                placeholder="Título da peça"
                style={{ width: '100%', fontSize: 16, fontWeight: 600 }}
              />
            ) : (
              <h2 style={{ fontSize: 18, fontWeight: 600, lineHeight: 1.3 }}>{conteudo.titulo}</h2>
            )}
            <p style={{ fontSize: 12, color: 'var(--texto-fraco)', marginTop: 4 }}>
              Peça Nº <b style={{ color: 'var(--texto-suave)' }}>{conteudo.codigoUnico}</b>
            </p>
          </div>
          <BadgeTipo tipo={conteudo.tipo} />
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar"
            style={{ background: 'transparent', border: 'none', color: 'var(--texto-fraco)', fontSize: 20, lineHeight: 1, cursor: 'pointer', padding: 2 }}
          >
            ×
          </button>
        </div>

        {/* Status — mesmo indicador do funil (editado pelo seletor "Mover" do card) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span aria-hidden="true" style={{ width: 9, height: 9, borderRadius: 999, background: meta.cor, boxShadow: `0 0 6px ${meta.cor}`, flexShrink: 0 }} />
          <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--texto)' }}>{meta.rotulo}</span>
        </div>

        {/* Grade com as informações de marketing da peça */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14 }}>
          <LinhaInfo rotulo="Cliente" valor={conteudo.cliente?.nomeFantasia ?? '—'} />
          {editando ? (
            <LinhaEdit rotulo="Tipo">
              <select
                className="brk-input"
                value={fTipo}
                onChange={(e) => setFTipo(e.target.value as TipoConteudo)}
                style={estiloInput}
              >
                {TIPOS.map((t) => (
                  <option key={t} value={t}>{TIPO_META[t]}</option>
                ))}
              </select>
            </LinhaEdit>
          ) : (
            <LinhaInfo rotulo="Tipo" valor={TIPO_META[conteudo.tipo]} />
          )}
          <LinhaInfo rotulo="Squad" valor={conteudo.squad?.nome ?? '—'} />
          <LinhaInfo rotulo="Responsável" valor={conteudo.responsavel?.nome ?? '—'} />
          {editando ? (
            <LinhaEdit rotulo="Agendada para">
              <input
                className="brk-input"
                type="datetime-local"
                value={fData}
                onChange={(e) => setFData(e.target.value)}
                style={estiloInput}
              />
            </LinhaEdit>
          ) : (
            <LinhaInfo rotulo="Agendada para" valor={formatarDataHora(conteudo.dataAgendada)} />
          )}
          {editando ? (
            <LinhaEdit rotulo="Para tráfego pago">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, color: 'var(--texto-suave)', cursor: 'pointer', paddingTop: 6 }}>
                <input type="checkbox" checked={fTrafego} onChange={(e) => setFTrafego(e.target.checked)} />
                {fTrafego ? 'Sim' : 'Não'}
              </label>
            </LinhaEdit>
          ) : (
            <LinhaInfo rotulo="Para tráfego pago" valor={conteudo.paraTrafego ? 'Sim' : 'Não'} />
          )}
          <LinhaInfo
            rotulo="Avaliação"
            valor={conteudo.estrelas != null
              ? '★'.repeat(conteudo.estrelas) + '☆'.repeat(Math.max(0, 5 - conteudo.estrelas))
              : '—'}
          />
        </div>

        {/* Descrição / briefing */}
        {editando ? (
          <LinhaEdit rotulo="Descrição / briefing">
            <textarea
              className="brk-input"
              value={fDescricao}
              onChange={(e) => setFDescricao(e.target.value)}
              maxLength={2000}
              rows={4}
              placeholder="Briefing curto da peça (opcional)"
              style={{ width: '100%', fontSize: 13.5, resize: 'vertical', fontFamily: 'inherit' }}
            />
          </LinhaEdit>
        ) : (
          <LinhaInfo
            rotulo="Descrição / briefing"
            valor={conteudo.descricao?.trim()
              ? <span style={{ whiteSpace: 'pre-wrap' }}>{conteudo.descricao}</span>
              : <span style={{ color: 'var(--texto-fraco)' }}>Sem descrição.</span>}
          />
        )}

        {/* Mídia da peça — edição por URL ou pré-visualização + link */}
        {editando ? (
          <LinhaEdit rotulo="Mídia (URL)">
            <input
              className="brk-input"
              type="url"
              value={fMidia}
              onChange={(e) => setFMidia(e.target.value)}
              maxLength={500}
              placeholder="Link da imagem/vídeo (opcional)"
              style={estiloInput}
            />
          </LinhaEdit>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--texto-fraco)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              Mídia
            </span>
            {midia ? (
              <>
                {tm === 'imagem' && (
                  <img src={midia} alt={`Mídia de ${conteudo.titulo}`} style={{ maxWidth: '100%', borderRadius: 12, border: '1px solid var(--borda)' }} />
                )}
                {tm === 'video' && (
                  <video src={midia} controls style={{ maxWidth: '100%', borderRadius: 12, border: '1px solid var(--borda)' }} />
                )}
                <a href={midia} target="_blank" rel="noreferrer" style={{ fontSize: 12.5, color: 'var(--amarelo-fagulha)', wordBreak: 'break-all' }}>
                  {midia}
                </a>
              </>
            ) : (
              <span style={{ fontSize: 13, color: 'var(--texto-fraco)' }}>Nenhuma mídia anexada.</span>
            )}
          </div>
        )}

        {erroSalvar && <MensagemErro texto={erroSalvar} />}

        {/* Rodapé: alterna entre ler e editar */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          {editando ? (
            <>
              <BotaoSecundario onClick={() => { resetForm(); setEditando(false); }} disabled={salvando}>
                Cancelar
              </BotaoSecundario>
              <BotaoPrimario onClick={salvar} disabled={salvando}>
                {salvando ? 'Salvando…' : 'Salvar alterações'}
              </BotaoPrimario>
            </>
          ) : (
            <>
              <BotaoSecundario onClick={onFechar}>Fechar</BotaoSecundario>
              <BotaoPrimario onClick={() => setEditando(true)}>Editar</BotaoPrimario>
            </>
          )}
        </div>
      </div>
    </Overlay>
  );
}

// Seletor compacto "mover" — troca o status da peça direto no card.
function SeletorMover({
  valor,
  desabilitado,
  rotuloAcessivel,
  aoMudar,
}: {
  valor: StatusConteudo;
  desabilitado: boolean;
  rotuloAcessivel: string;
  aoMudar: (novo: StatusConteudo) => void;
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 2 }}>
      <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--texto-fraco)' }}>Mover</span>
      <select
        aria-label={rotuloAcessivel}
        value={valor}
        disabled={desabilitado}
        onChange={(e: ChangeEvent<HTMLSelectElement>) =>
          aoMudar(e.target.value as StatusConteudo)
        }
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

/* --------------------------- Modal nova ---------------------------- */

function ModalNovaPeca({
  onFechar,
  onCriado,
}: {
  onFechar: () => void;
  onCriado: () => void;
}) {
  const [clientes, setClientes] = useState<ClienteOpt[]>([]);
  const [carregandoClientes, setCarregandoClientes] = useState(true);
  const [erroClientes, setErroClientes] = useState<string | null>(null);

  const [clienteId, setClienteId] = useState('');
  const [titulo, setTitulo] = useState('');
  const [tipo, setTipo] = useState<TipoConteudo>('POST');
  const [descricao, setDescricao] = useState('');
  const [midiaUrl, setMidiaUrl] = useState('');
  const [paraTrafego, setParaTrafego] = useState(false);

  // Squad do cliente (auto-resolvido) + responsável escolhido entre os membros.
  const [squadInfo, setSquadInfo] = useState<SquadDoCliente | null>(null);
  const [responsavelId, setResponsavelId] = useState('');

  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    (async () => {
      setCarregandoClientes(true);
      setErroClientes(null);
      try {
        const { data } = await api.get<ClienteOpt[]>('/clientes');
        if (ativo) setClientes(data);
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

  // Ao escolher o cliente, resolve o squad e os membros (auto-preenchimento).
  useEffect(() => {
    if (!clienteId) {
      setSquadInfo(null);
      setResponsavelId('');
      return;
    }
    let ativo = true;
    (async () => {
      try {
        const { data } = await api.get<SquadDoCliente>(`/squads/do-cliente/${clienteId}`);
        if (!ativo) return;
        setSquadInfo(data);
        // Sugere o copywriter como responsável inicial (início do funil é copy).
        const copy = data.membros.find((m) => m.funcao === 'COPYWRITER');
        setResponsavelId(copy?.usuario.id ?? '');
      } catch {
        if (ativo) setSquadInfo(null);
      }
    })();
    return () => {
      ativo = false;
    };
  }, [clienteId]);

  const valido = clienteId !== '' && titulo.trim().length >= 2;

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!valido || salvando) return;
    setSalvando(true);
    setErro(null);
    try {
      await api.post('/conteudos', {
        clienteId,
        titulo: titulo.trim(),
        tipo,
        descricao: descricao.trim() || undefined,
        midiaUrl: midiaUrl.trim() || undefined,
        squadId: squadInfo?.squad?.id,
        responsavelId: responsavelId || undefined,
        paraTrafego,
      });
      onCriado();
    } catch {
      setErro('Falha ao criar a peça. Verifique os dados e tente de novo.');
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
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Nova peça</h2>
          <p style={{ fontSize: 13, color: 'var(--texto-fraco)', marginTop: 2 }}>
            A peça entra no funil em Ideia e recebe um código único automático.
          </p>
        </div>

        <CampoSelect
          rotulo="Cliente"
          obrigatorio
          valor={clienteId}
          aoMudar={setClienteId}
          desabilitado={carregandoClientes || clientes.length === 0}
        >
          <option value="" disabled>
            {carregandoClientes
              ? 'Carregando clientes…'
              : clientes.length === 0
                ? 'Nenhum cliente disponível'
                : 'Selecione um cliente'}
          </option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nomeFantasia}
            </option>
          ))}
        </CampoSelect>

        {erroClientes && <MensagemErro texto={erroClientes} />}

        <Campo
          rotulo="Título"
          obrigatorio
          valor={titulo}
          aoMudar={setTitulo}
          placeholder="Ex.: Reels — bastidores da cozinha"
          autoFocus
        />

        <CampoSelect
          rotulo="Tipo"
          obrigatorio
          valor={tipo}
          aoMudar={(v) => setTipo(v as TipoConteudo)}
        >
          {TIPOS.map((t) => (
            <option key={t} value={t}>
              {TIPO_META[t]}
            </option>
          ))}
        </CampoSelect>

        <Campo
          rotulo="Descrição"
          valor={descricao}
          aoMudar={setDescricao}
          placeholder="Briefing curto da peça (opcional)"
        />

        <Campo
          rotulo="URL da mídia"
          valor={midiaUrl}
          aoMudar={setMidiaUrl}
          placeholder="Link da imagem/vídeo p/ o cliente aprovar (opcional)"
        />

        {/* Squad resolvido automaticamente pelo cliente + responsável do squad. */}
        {clienteId && squadInfo && (
          squadInfo.squad ? (
            <>
              <p style={{ fontSize: 12.5, color: 'var(--texto-fraco)' }}>
                Squad: <strong style={{ color: 'var(--texto-suave)' }}>{squadInfo.squad.nome}</strong>
              </p>
              {squadInfo.membros.length > 0 && (
                <CampoSelect rotulo="Responsável" valor={responsavelId} aoMudar={setResponsavelId}>
                  <option value="">Sem responsável definido</option>
                  {squadInfo.membros.map((m) => (
                    <option key={m.usuario.id} value={m.usuario.id}>
                      {m.usuario.nome} — {FUNCAO_ROTULO[m.funcao] ?? m.funcao}
                    </option>
                  ))}
                </CampoSelect>
              )}
            </>
          ) : (
            <p style={{ fontSize: 12.5, color: 'var(--amarelo-fagulha)' }}>
              Este cliente ainda não tem squad — defina o squad em Clientes para auto-atribuir.
            </p>
          )
        )}

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, color: 'var(--texto-suave)', cursor: 'pointer' }}>
          <input type="checkbox" checked={paraTrafego} onChange={(e) => setParaTrafego(e.target.checked)} />
          Peça para tráfego pago (após aprovação vai ao laboratório de criativos)
        </label>

        {erro && <MensagemErro texto={erro} />}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
          <BotaoSecundario onClick={onFechar} disabled={salvando}>
            Cancelar
          </BotaoSecundario>
          <BotaoPrimario type="submit" disabled={!valido || salvando}>
            {salvando ? 'Salvando…' : 'Criar peça'}
          </BotaoPrimario>
        </div>
      </form>
    </Overlay>
  );
}

/* --------------------------- Helper local --------------------------- */

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
