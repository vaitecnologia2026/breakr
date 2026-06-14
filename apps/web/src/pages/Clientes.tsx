import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { ClienteStatus } from '@breakr/shared';
import { api } from '../lib/api';

/**
 * Tela de Clientes (Fase 0 — leitura + cadastro básico).
 * Lista a carteira em tabela estilizada na identidade Breakr e permite
 * cadastrar um novo cliente via modal. Trata loading / erro / vazio.
 *
 * Contrato:
 *  GET  /clientes → Cliente[]
 *  POST /clientes { nomeFantasia, cnpj?, tag?, planoId? }
 */

interface Cliente {
  id: string;
  nomeFantasia: string;
  tag: string | null;
  cnpj: string | null;
  status: ClienteStatus;
  codigoUnico: string;
  squadId: string | null;
  planoId: string | null;
  criadoEm: string;
}

// Cores por status do ciclo de vida do cliente (chip).
const CORES_STATUS: Record<ClienteStatus, { fundo: string; texto: string; ponto: string }> = {
  [ClienteStatus.NOVO]: { fundo: 'rgba(255, 148, 6, 0.14)', texto: '#ffb44d', ponto: '#ff9406' },
  [ClienteStatus.ONBOARD]: { fundo: 'rgba(202, 63, 23, 0.16)', texto: '#f0814f', ponto: '#ca3f17' },
  [ClienteStatus.ATIVO]: { fundo: 'rgba(46, 204, 113, 0.14)', texto: '#67e0a3', ponto: '#2ecc71' },
  [ClienteStatus.RENOVACAO]: { fundo: 'rgba(243, 244, 247, 0.1)', texto: '#cdd0d8', ponto: '#9aa0ad' },
  [ClienteStatus.INATIVO]: { fundo: 'rgba(148, 18, 44, 0.18)', texto: '#e2738a', ponto: '#94122c' },
};

export function Clientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);

  async function carregar() {
    setCarregando(true);
    setErro(null);
    try {
      const { data } = await api.get<Cliente[]>('/clientes');
      setClientes(data);
    } catch {
      setErro('Não foi possível carregar os clientes. Tente novamente.');
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  return (
    <PaginaShell
      titulo="Clientes"
      subtitulo="Carteira de clientes do Breakr OS"
      acao={
        <BotaoPrimario onClick={() => setModalAberto(true)}>
          + Novo cliente
        </BotaoPrimario>
      }
    >
      {carregando ? (
        <EstadoCarregando />
      ) : erro ? (
        <EstadoErro mensagem={erro} onTentar={carregar} />
      ) : clientes.length === 0 ? (
        <EstadoVazio onNovo={() => setModalAberto(true)} />
      ) : (
        <TabelaClientes clientes={clientes} />
      )}

      {modalAberto && (
        <ModalNovoCliente
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

function TabelaClientes({ clientes }: { clientes: Cliente[] }) {
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
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
          <thead>
            <tr>
              <Th>Cliente</Th>
              <Th>Código</Th>
              <Th>CNPJ</Th>
              <Th>Status</Th>
              <Th>Squad</Th>
              <Th>Criado em</Th>
            </tr>
          </thead>
          <tbody>
            {clientes.map((c) => (
              <tr
                key={c.id}
                className="brk-row"
                style={{ borderTop: '1px solid var(--borda)' }}
              >
                <Td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <AvatarCliente nome={c.nomeFantasia} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: 'var(--cinza-vapor)' }}>
                        {c.nomeFantasia}
                      </div>
                      {c.tag && (
                        <div style={{ fontSize: 12, color: 'var(--texto-fraco)' }}>
                          {c.tag}
                        </div>
                      )}
                    </div>
                  </div>
                </Td>
                <Td>
                  <code
                    style={{
                      fontSize: 12.5,
                      color: 'var(--texto-suave)',
                      background: 'var(--superficie-3)',
                      padding: '2px 8px',
                      borderRadius: 6,
                    }}
                  >
                    {c.codigoUnico}
                  </code>
                </Td>
                <Td>
                  <span style={{ color: c.cnpj ? 'var(--texto-suave)' : 'var(--texto-fraco)' }}>
                    {c.cnpj ?? '—'}
                  </span>
                </Td>
                <Td>
                  <BadgeStatus status={c.status} />
                </Td>
                <Td>
                  {c.squadId ? (
                    <span style={{ color: 'var(--texto-suave)' }}>Atribuído</span>
                  ) : (
                    <span style={{ color: 'var(--texto-fraco)' }}>Sem squad</span>
                  )}
                </Td>
                <Td>
                  <span style={{ color: 'var(--texto-fraco)' }}>
                    {formatarData(c.criadoEm)}
                  </span>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <RodapeContagem total={clientes.length} rotulo="cliente" />
    </div>
  );
}

function BadgeStatus({ status }: { status: ClienteStatus }) {
  const cor = CORES_STATUS[status] ?? CORES_STATUS[ClienteStatus.NOVO];
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
      {status}
    </span>
  );
}

function AvatarCliente({ nome }: { nome: string }) {
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

/* --------------------------- Modal novo --------------------------- */

function ModalNovoCliente({
  onFechar,
  onCriado,
}: {
  onFechar: () => void;
  onCriado: () => void;
}) {
  const [nomeFantasia, setNomeFantasia] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [tag, setTag] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const valido = nomeFantasia.trim().length >= 2;

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!valido || salvando) return;
    setSalvando(true);
    setErro(null);
    try {
      await api.post('/clientes', {
        nomeFantasia: nomeFantasia.trim(),
        cnpj: cnpj.trim() || undefined,
        tag: tag.trim() || undefined,
      });
      onCriado();
    } catch {
      setErro('Falha ao cadastrar o cliente. Verifique os dados e tente de novo.');
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
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Novo cliente</h2>
          <p style={{ fontSize: 13, color: 'var(--texto-fraco)', marginTop: 2 }}>
            O código único e o status inicial são gerados automaticamente.
          </p>
        </div>

        <Campo
          rotulo="Nome fantasia"
          obrigatorio
          valor={nomeFantasia}
          aoMudar={setNomeFantasia}
          placeholder="Ex.: Estúdio Aurora"
          autoFocus
        />
        <Campo
          rotulo="CNPJ"
          valor={cnpj}
          aoMudar={setCnpj}
          placeholder="00.000.000/0000-00 (opcional)"
        />
        <Campo
          rotulo="Tag"
          valor={tag}
          aoMudar={setTag}
          placeholder="Ex.: Premium, Inbound (opcional)"
        />

        {erro && <MensagemErro texto={erro} />}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
          <BotaoSecundario onClick={onFechar} disabled={salvando}>
            Cancelar
          </BotaoSecundario>
          <BotaoPrimario type="submit" disabled={!valido || salvando}>
            {salvando ? 'Salvando…' : 'Cadastrar'}
          </BotaoPrimario>
        </div>
      </form>
    </Overlay>
  );
}

/* ----------------------------- Estados ----------------------------- */

function EstadoVazio({ onNovo }: { onNovo: () => void }) {
  return (
    <PainelVazio
      titulo="Nenhum cliente ainda"
      descricao="Cadastre o primeiro cliente da carteira para começar a operar."
      acao={<BotaoPrimario onClick={onNovo}>+ Novo cliente</BotaoPrimario>}
    />
  );
}

function formatarData(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

/* ====================================================================
   Primitivos de UI reaproveitados pelas telas da Fase 0.
   Mantidos locais para não acoplar a um design system ainda inexistente.
   ==================================================================== */

export function PaginaShell({
  titulo,
  subtitulo,
  acao,
  children,
}: {
  titulo: string;
  subtitulo: string;
  acao?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800 }}>{titulo}</h1>
          <p style={{ fontSize: 13.5, color: 'var(--texto-fraco)', marginTop: 2 }}>
            {subtitulo}
          </p>
        </div>
        {acao}
      </div>
      {children}
    </section>
  );
}

export function Th({ children }: { children: ReactNode }) {
  return (
    <th
      style={{
        textAlign: 'left',
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: 'var(--texto-fraco)',
        padding: '14px 18px',
        background: 'var(--superficie-2)',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </th>
  );
}

export function Td({ children }: { children: ReactNode }) {
  return (
    <td style={{ padding: '14px 18px', fontSize: 14, verticalAlign: 'middle' }}>
      {children}
    </td>
  );
}

export function RodapeContagem({ total, rotulo }: { total: number; rotulo: string }) {
  return (
    <div
      style={{
        padding: '12px 18px',
        borderTop: '1px solid var(--borda)',
        fontSize: 12.5,
        color: 'var(--texto-fraco)',
        background: 'var(--superficie-2)',
      }}
    >
      {total} {rotulo}
      {total === 1 ? '' : 's'}
    </div>
  );
}

export function BotaoPrimario({
  children,
  onClick,
  type = 'button',
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="brk-gradient-bg"
      style={{
        border: 'none',
        color: '#fff',
        fontWeight: 700,
        fontSize: 13.5,
        padding: '10px 16px',
        borderRadius: 10,
        opacity: disabled ? 0.55 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        boxShadow: '0 8px 20px -10px rgba(202, 63, 23, 0.8)',
        transition: 'transform 0.12s ease, opacity 0.15s ease',
      }}
      onMouseDown={(e) => {
        if (!disabled) e.currentTarget.style.transform = 'scale(0.97)';
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      {children}
    </button>
  );
}

export function BotaoSecundario({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        border: '1px solid var(--borda-forte)',
        background: 'transparent',
        color: 'var(--texto-suave)',
        fontWeight: 600,
        fontSize: 13.5,
        padding: '10px 16px',
        borderRadius: 10,
        opacity: disabled ? 0.55 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'border-color 0.15s ease, color 0.15s ease',
      }}
      onMouseEnter={(e) => {
        if (disabled) return;
        e.currentTarget.style.borderColor = 'var(--laranja-brasa)';
        e.currentTarget.style.color = 'var(--cinza-vapor)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--borda-forte)';
        e.currentTarget.style.color = 'var(--texto-suave)';
      }}
    >
      {children}
    </button>
  );
}

export function Campo({
  rotulo,
  valor,
  aoMudar,
  placeholder,
  obrigatorio,
  autoFocus,
}: {
  rotulo: string;
  valor: string;
  aoMudar: (v: string) => void;
  placeholder?: string;
  obrigatorio?: boolean;
  autoFocus?: boolean;
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--texto-suave)' }}>
        {rotulo}
        {obrigatorio && <span style={{ color: 'var(--amarelo-fagulha)' }}> *</span>}
      </span>
      <input
        value={valor}
        onChange={(e) => aoMudar(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        style={{
          background: 'var(--superficie-2)',
          border: '1px solid var(--borda-forte)',
          borderRadius: 10,
          padding: '11px 13px',
          color: 'var(--texto)',
          fontSize: 14,
          outline: 'none',
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

export function Overlay({
  children,
  onFechar,
}: {
  children: ReactNode;
  onFechar: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onFechar}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 40,
        display: 'grid',
        placeItems: 'center',
        padding: 20,
        background: 'rgba(6, 5, 2, 0.66)',
        backdropFilter: 'blur(4px)',
        animation: 'brk-fade 0.16s ease',
      }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ animation: 'brk-rise 0.18s ease' }}>
        {children}
      </div>
      <style>{`
        @keyframes brk-fade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes brk-rise { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>
    </div>
  );
}

export function MensagemErro({ texto }: { texto: string }) {
  return (
    <div
      role="alert"
      style={{
        fontSize: 13,
        color: '#e2738a',
        background: 'rgba(148, 18, 44, 0.14)',
        border: '1px solid rgba(148, 18, 44, 0.4)',
        borderRadius: 10,
        padding: '10px 12px',
      }}
    >
      {texto}
    </div>
  );
}

export function EstadoCarregando() {
  return (
    <div
      style={{
        display: 'grid',
        placeItems: 'center',
        padding: '70px 20px',
        background: 'var(--superficie)',
        border: '1px solid var(--borda)',
        borderRadius: 16,
        gap: 14,
        color: 'var(--texto-fraco)',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 30,
          height: 30,
          borderRadius: 999,
          border: '3px solid var(--superficie-3)',
          borderTopColor: 'var(--amarelo-fagulha)',
          animation: 'brk-spin 0.8s linear infinite',
        }}
      />
      <span style={{ fontSize: 13.5 }}>Carregando…</span>
      <style>{`@keyframes brk-spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}

export function EstadoErro({
  mensagem,
  onTentar,
}: {
  mensagem: string;
  onTentar: () => void;
}) {
  return (
    <PainelVazio
      titulo="Algo deu errado"
      descricao={mensagem}
      acao={<BotaoSecundario onClick={onTentar}>Tentar de novo</BotaoSecundario>}
    />
  );
}

export function PainelVazio({
  titulo,
  descricao,
  acao,
}: {
  titulo: string;
  descricao: string;
  acao?: ReactNode;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        textAlign: 'center',
        padding: '60px 24px',
        background: 'var(--superficie)',
        border: '1px dashed var(--borda-forte)',
        borderRadius: 16,
      }}
    >
      <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--cinza-vapor)' }}>
        {titulo}
      </span>
      <span style={{ fontSize: 13.5, color: 'var(--texto-fraco)', maxWidth: 380 }}>
        {descricao}
      </span>
      {acao && <div style={{ marginTop: 6 }}>{acao}</div>}
    </div>
  );
}
