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
} from './Clientes';

/**
 * Tela Comercial (M11 — pipeline de vendas / CRM).
 * Quadro kanban: colunas = status do lead; cards = leads.
 * O usuário cria leads, os move pelo funil trocando o status no card e
 * converte um lead GANHO em cliente. Trata loading / erro / vazio.
 *
 * Contrato (API):
 *  GET   /comercial/leads → Lead[]   (responsavel / cliente inclusos)
 *  POST  /comercial/leads { nome, empresa?, email?, telefone?, origem?, valorEstimado? }
 *  PATCH /comercial/leads/:id/status { status }
 *  POST  /comercial/leads/:id/converter → Lead (cria o cliente; volta GANHO + clienteId)
 */

type StatusLead =
  | 'NOVO'
  | 'CONTATADO'
  | 'QUALIFICADO'
  | 'PROPOSTA'
  | 'GANHO'
  | 'PERDIDO';

interface Lead {
  id: string;
  nome: string;
  empresa: string | null;
  email: string | null;
  telefone: string | null;
  origem: string | null;
  status: StatusLead;
  valorEstimado: string | null;
  observacao: string | null;
  codigoUnico: string;
  responsavelId: string | null;
  clienteId: string | null;
  responsavel?: { nome: string } | null;
  cliente?: { nomeFantasia: string } | null;
}

// Ordem das colunas do pipeline (esquerda → direita).
const ORDEM_STATUS: StatusLead[] = [
  'NOVO',
  'CONTATADO',
  'QUALIFICADO',
  'PROPOSTA',
  'GANHO',
  'PERDIDO',
];

// Rótulo amigável + cor de acento (ponto) por status.
const STATUS_META: Record<StatusLead, { rotulo: string; cor: string }> = {
  NOVO: { rotulo: 'Novo', cor: '#9aa0ad' },
  CONTATADO: { rotulo: 'Contatado', cor: '#4aa3f0' },
  QUALIFICADO: { rotulo: 'Qualificado', cor: '#ff9406' },
  PROPOSTA: { rotulo: 'Proposta', cor: '#ca3f17' },
  GANHO: { rotulo: 'Ganho', cor: '#2ecc71' },
  PERDIDO: { rotulo: 'Perdido', cor: '#94122c' },
};

// Origens disponíveis no modal de criação.
const ORIGENS = ['Indicação', 'Inbound', 'Scraping', 'Evento', 'Outro'];

// Formata um valor monetário (string da API) em BRL; vazio se não numérico.
function formatarValor(valor: string | null): string | null {
  if (valor == null || valor === '') return null;
  const n = Number(valor);
  if (Number.isNaN(n)) return null;
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function Comercial() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  // Erro transitório de uma ação de card (mover / converter), mostrado acima do quadro.
  const [erroAcao, setErroAcao] = useState<string | null>(null);

  async function carregar() {
    setCarregando(true);
    setErro(null);
    try {
      const { data } = await api.get<Lead[]>('/comercial/leads');
      setLeads(data);
    } catch {
      setErro('Não foi possível carregar os leads. Tente novamente.');
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  return (
    <PaginaShell
      titulo="Comercial"
      subtitulo="Pipeline de leads — da prospecção ao ganho"
      acao={<BotaoPrimario onClick={() => setModalAberto(true)}>+ Novo lead</BotaoPrimario>}
    >
      {carregando ? (
        <EstadoCarregando />
      ) : erro ? (
        <EstadoErro mensagem={erro} onTentar={carregar} />
      ) : leads.length === 0 ? (
        <PainelVazio
          titulo="Nenhum lead ainda"
          descricao="Cadastre o primeiro lead para começar a mover o pipeline."
          acao={<BotaoPrimario onClick={() => setModalAberto(true)}>+ Novo lead</BotaoPrimario>}
        />
      ) : (
        <>
          {erroAcao && <MensagemErro texto={erroAcao} />}
          <Kanban leads={leads} aoAtualizar={carregar} aoErroAcao={setErroAcao} />
        </>
      )}

      {modalAberto && (
        <ModalNovoLead
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
  leads,
  aoAtualizar,
  aoErroAcao,
}: {
  leads: Lead[];
  aoAtualizar: () => void;
  aoErroAcao: (msg: string | null) => void;
}) {
  // Agrupa os leads por status preservando a ordem das colunas do pipeline.
  const porStatus: Record<StatusLead, Lead[]> = {
    NOVO: [],
    CONTATADO: [],
    QUALIFICADO: [],
    PROPOSTA: [],
    GANHO: [],
    PERDIDO: [],
  };
  for (const l of leads) {
    (porStatus[l.status] ?? porStatus.NOVO).push(l);
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
  status: StatusLead;
  itens: Lead[];
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
            Sem leads aqui.
          </span>
        ) : (
          itens.map((l) => (
            <CardLead key={l.id} lead={l} aoAtualizar={aoAtualizar} aoErroAcao={aoErroAcao} />
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

function CardLead({
  lead,
  aoAtualizar,
  aoErroAcao,
}: {
  lead: Lead;
  aoAtualizar: () => void;
  aoErroAcao: (msg: string | null) => void;
}) {
  // Trava as ações enquanto um PATCH/POST deste lead está em voo.
  const [ocupado, setOcupado] = useState(false);
  const valorFmt = formatarValor(lead.valorEstimado);
  const podeConverter = lead.status === 'GANHO' && lead.clienteId == null;

  async function mover(novo: StatusLead) {
    if (ocupado || novo === lead.status) return;
    setOcupado(true);
    aoErroAcao(null);
    try {
      await api.patch(`/comercial/leads/${lead.id}/status`, { status: novo });
      aoAtualizar();
      // Sucesso recarrega a lista por aoAtualizar (desmonta este card).
    } catch {
      aoErroAcao('Não foi possível mover o lead. Tente novamente.');
      setOcupado(false);
    }
  }

  async function converter() {
    if (ocupado) return;
    setOcupado(true);
    aoErroAcao(null);
    try {
      await api.post(`/comercial/leads/${lead.id}/converter`);
      aoAtualizar();
    } catch {
      aoErroAcao('Não foi possível converter o lead em cliente. Tente novamente.');
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
        {lead.nome}
      </span>

      {lead.empresa && (
        <div style={{ fontSize: 12, color: 'var(--texto-fraco)' }}>{lead.empresa}</div>
      )}

      {valorFmt && (
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--amarelo-fagulha)' }}>
          {valorFmt}
        </div>
      )}

      {lead.origem && <PilulaOrigem origem={lead.origem} />}

      {lead.responsavel?.nome && (
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
            {lead.responsavel.nome}
          </span>
        </div>
      )}

      {lead.clienteId != null && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12,
            color: '#67e0a3',
          }}
        >
          <IconeCheck />
          <span
            style={{
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            Virou cliente: {lead.cliente?.nomeFantasia ?? 'cadastrado'}
          </span>
        </div>
      )}

      <SeletorMover
        valor={lead.status}
        desabilitado={ocupado}
        rotuloAcessivel={`Mover lead ${lead.nome}`}
        aoMudar={mover}
      />

      {podeConverter && (
        <BotaoSecundario onClick={converter} disabled={ocupado}>
          Converter em cliente
        </BotaoSecundario>
      )}
    </div>
  );
}

function PilulaOrigem({ origem }: { origem: string }) {
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
      {origem}
    </span>
  );
}

// Seletor compacto "mover" — troca o status do lead direto no card.
function SeletorMover({
  valor,
  desabilitado,
  rotuloAcessivel,
  aoMudar,
}: {
  valor: StatusLead;
  desabilitado: boolean;
  rotuloAcessivel: string;
  aoMudar: (novo: StatusLead) => void;
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 2 }}>
      <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--texto-fraco)' }}>Mover</span>
      <select
        aria-label={rotuloAcessivel}
        value={valor}
        disabled={desabilitado}
        onChange={(e: ChangeEvent<HTMLSelectElement>) => aoMudar(e.target.value as StatusLead)}
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

// Ícone de traço (check) para o lead já convertido — sem emoji.
function IconeCheck(): ReactNode {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

/* --------------------------- Modal novo ---------------------------- */

function ModalNovoLead({
  onFechar,
  onCriado,
}: {
  onFechar: () => void;
  onCriado: () => void;
}) {
  const [nome, setNome] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [origem, setOrigem] = useState(ORIGENS[0]);
  const [valorEstimado, setValorEstimado] = useState('');

  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const valido = nome.trim().length >= 2;

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!valido || salvando) return;
    setSalvando(true);
    setErro(null);
    try {
      await api.post('/comercial/leads', {
        nome: nome.trim(),
        empresa: empresa.trim() || undefined,
        email: email.trim() || undefined,
        telefone: telefone.trim() || undefined,
        origem: origem || undefined,
        valorEstimado: valorEstimado.trim() || undefined,
      });
      onCriado();
    } catch {
      setErro('Falha ao cadastrar o lead. Verifique os dados e tente de novo.');
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
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Novo lead</h2>
          <p style={{ fontSize: 13, color: 'var(--texto-fraco)', marginTop: 2 }}>
            O lead entra no pipeline em Novo e recebe um código único automático.
          </p>
        </div>

        <Campo
          rotulo="Nome"
          obrigatorio
          valor={nome}
          aoMudar={setNome}
          placeholder="Ex.: Maria Souza"
          autoFocus
        />
        <Campo
          rotulo="Empresa"
          valor={empresa}
          aoMudar={setEmpresa}
          placeholder="Ex.: Restaurante Aurora (opcional)"
        />
        <Campo
          rotulo="E-mail"
          valor={email}
          aoMudar={setEmail}
          placeholder="contato@empresa.com (opcional)"
        />
        <Campo
          rotulo="Telefone"
          valor={telefone}
          aoMudar={setTelefone}
          placeholder="(00) 00000-0000 (opcional)"
        />

        <CampoSelect rotulo="Origem" valor={origem} aoMudar={setOrigem}>
          {ORIGENS.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </CampoSelect>

        <Campo
          rotulo="Valor estimado (R$)"
          valor={valorEstimado}
          aoMudar={setValorEstimado}
          placeholder="Ex.: 1500 (opcional)"
        />

        {erro && <MensagemErro texto={erro} />}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
          <BotaoSecundario onClick={onFechar} disabled={salvando}>
            Cancelar
          </BotaoSecundario>
          <BotaoPrimario type="submit" disabled={!valido || salvando}>
            {salvando ? 'Salvando…' : 'Criar lead'}
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
