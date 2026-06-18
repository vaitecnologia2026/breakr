import { useEffect, useState, type ReactNode } from 'react';
import { api } from '../lib/api';
import { comDemo, mockSeDemo } from '../lib/demo';
import {
  PaginaShell,
  Th,
  Td,
  RodapeContagem,
  BotaoSecundario,
  MensagemErro,
  EstadoCarregando,
  EstadoErro,
  PainelVazio,
} from '../components/primitivos';

/**
 * Tela de Cobranças (Fase 1 — pipeline de entrada).
 * Lista as faturas da carteira com nota fiscal e cobrança no WhatsApp.
 * Cobranças nascem do contrato em vigor, então não há criação manual aqui —
 * apenas ações por fatura (confirmar pagamento, enviar/reenviar WhatsApp).
 * Trata loading / erro / vazio.
 *
 * Contrato (API):
 *  GET  /faturas → Fatura[]   (cliente.nomeFantasia incluso)
 *  POST /faturas/:id/pagar
 *  POST /faturas/:id/whatsapp
 */

type StatusFatura = 'PENDENTE' | 'PAGA' | 'VENCIDA' | 'CANCELADA' | 'ESTORNADA';

interface Fatura {
  id: string;
  valor: string;
  vencimento: string;
  status: StatusFatura;
  codigoUnico: string;
  notaFiscalUrl: string | null;
  enviadaWhatsapp: boolean;
  clienteId: string;
  contratoId: string;
  cliente?: { nomeFantasia: string };
}

// Rótulo amigável + cores do chip por status da fatura.
const CORES_STATUS: Record<
  StatusFatura,
  { rotulo: string; fundo: string; texto: string; ponto: string }
> = {
  PENDENTE: {
    rotulo: 'Pendente',
    fundo: 'rgba(255, 148, 6, 0.14)',
    texto: '#ffb44d',
    ponto: '#ff9406',
  },
  PAGA: {
    rotulo: 'Paga',
    fundo: 'rgba(46, 204, 113, 0.14)',
    texto: '#67e0a3',
    ponto: '#2ecc71',
  },
  VENCIDA: {
    rotulo: 'Vencida',
    fundo: 'rgba(148, 18, 44, 0.18)',
    texto: '#e2738a',
    ponto: '#94122c',
  },
  CANCELADA: {
    rotulo: 'Cancelada',
    fundo: 'rgba(243, 244, 247, 0.08)',
    texto: 'var(--texto-suave)',
    ponto: '#9aa0ad',
  },
  ESTORNADA: {
    rotulo: 'Estornada',
    fundo: 'rgba(243, 244, 247, 0.1)',
    texto: '#cdd0d8',
    ponto: '#9aa0ad',
  },
};

const MOCK_FATURAS: Fatura[] = [
  { id: 'f1', valor: '3200.00', vencimento: '2026-06-20T00:00:00Z', status: 'PENDENTE', codigoUnico: 'FAT-0031', notaFiscalUrl: null, enviadaWhatsapp: true, clienteId: 'c1', contratoId: 'ct1', cliente: { nomeFantasia: 'Tua Pizza' } },
  { id: 'f2', valor: '4500.00', vencimento: '2026-06-20T00:00:00Z', status: 'PENDENTE', codigoUnico: 'FAT-0032', notaFiscalUrl: null, enviadaWhatsapp: false, clienteId: 'c2', contratoId: 'ct2', cliente: { nomeFantasia: 'Rikai Sushi' } },
  { id: 'f3', valor: '2800.00', vencimento: '2026-06-25T00:00:00Z', status: 'PENDENTE', codigoUnico: 'FAT-0033', notaFiscalUrl: null, enviadaWhatsapp: true, clienteId: 'c3', contratoId: 'ct3', cliente: { nomeFantasia: 'Bigger Pizzaria' } },
  { id: 'f4', valor: '3200.00', vencimento: '2026-06-08T00:00:00Z', status: 'VENCIDA', codigoUnico: 'FAT-0030', notaFiscalUrl: null, enviadaWhatsapp: true, clienteId: 'c6', contratoId: 'ct6', cliente: { nomeFantasia: 'Kings Pizza' } },
  { id: 'f5', valor: '3200.00', vencimento: '2026-06-10T00:00:00Z', status: 'PAGA', codigoUnico: 'FAT-0028', notaFiscalUrl: 'https://nfe.io/nf/001', enviadaWhatsapp: true, clienteId: 'c4', contratoId: 'ct4', cliente: { nomeFantasia: 'Brasa Burger' } },
  { id: 'f6', valor: '2800.00', vencimento: '2026-06-12T00:00:00Z', status: 'PAGA', codigoUnico: 'FAT-0029', notaFiscalUrl: null, enviadaWhatsapp: true, clienteId: 'c5', contratoId: 'ct5', cliente: { nomeFantasia: 'Taco Loco' } },
];

export function Cobrancas() {
  const [faturas, setFaturas] = useState<Fatura[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [erroAcao, setErroAcao] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<StatusFatura | ''>('');
  const [filtroCliente, setFiltroCliente] = useState('');

  async function carregar() {
    setCarregando(true);
    setErro(null);
    try {
      const { data } = await api.get<Fatura[]>('/faturas');
      setFaturas(comDemo(data, MOCK_FATURAS));
    } catch {
      setFaturas(mockSeDemo(MOCK_FATURAS));
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
    new Map(faturas.map((f) => [f.clienteId, f.cliente?.nomeFantasia ?? f.clienteId])).entries(),
  ).sort((a, b) => a[1].localeCompare(b[1]));

  // Cobranças pendentes vencendo nos próximos 7 dias (visão do financeiro).
  const limite7d = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const vencendo = faturas
    .filter((f) => f.status === 'PENDENTE' && new Date(f.vencimento).getTime() <= limite7d)
    .sort((a, b) => new Date(a.vencimento).getTime() - new Date(b.vencimento).getTime());

  const q = busca.toLowerCase().trim();
  const filtradas = faturas.filter((f) => {
    if (filtroStatus && f.status !== filtroStatus) return false;
    if (filtroCliente && f.clienteId !== filtroCliente) return false;
    if (q) {
      return (
        (f.cliente?.nomeFantasia ?? '').toLowerCase().includes(q) ||
        f.codigoUnico.toLowerCase().includes(q) ||
        CORES_STATUS[f.status].rotulo.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <PaginaShell
      titulo="Cobranças"
      subtitulo="Faturas, nota fiscal e cobrança no WhatsApp"
    >
      {!carregando && !erro && vencendo.length > 0 && (
        <div
          style={{
            padding: '14px 16px',
            borderRadius: 12,
            background: 'var(--superficie-2)',
            borderLeft: '3px solid var(--amarelo)',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--amarelo)' }}>
            {vencendo.length} cobrança(s) vencendo nos próximos 7 dias
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {vencendo.slice(0, 8).map((f) => (
              <div key={f.id} style={{ fontSize: 12.5, color: 'var(--texto-suave)', display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <span>{f.cliente?.nomeFantasia ?? 'Cliente'} · {formatarBRL(f.valor)}</span>
                <span style={{ color: 'var(--texto-fraco)' }}>vence {formatarData(f.vencimento)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

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
            placeholder="Buscar por cliente, status ou código…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            disabled={carregando}
          />
        </div>
        <select
          className="brk-select-filtro"
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value as StatusFatura | '')}
          disabled={carregando}
        >
          <option value="">Todos os status</option>
          {(Object.keys(CORES_STATUS) as StatusFatura[]).map((s) => (
            <option key={s} value={s}>{CORES_STATUS[s].rotulo}</option>
          ))}
        </select>
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
        {(filtroStatus || filtroCliente || busca) && (
          <button
            className="brk-btn-limpar-filtro"
            onClick={() => { setFiltroStatus(''); setFiltroCliente(''); setBusca(''); }}
          >
            Limpar filtros
          </button>
        )}
      </div>

      {carregando ? (
        <EstadoCarregando />
      ) : erro ? (
        <EstadoErro mensagem={erro} onTentar={carregar} />
      ) : faturas.length === 0 ? (
        <PainelVazio
          titulo="Nenhuma cobrança ainda"
          descricao="Coloque um contrato em vigor para gerar a primeira cobrança."
        />
      ) : filtradas.length === 0 ? (
        <PainelVazio
          titulo="Nenhum resultado"
          descricao={`Nenhuma cobrança corresponde a "${busca}".`}
        />
      ) : (
        <>
          {erroAcao && <MensagemErro texto={erroAcao} />}
          <TabelaCobrancas
            faturas={filtradas}
            aoAtualizar={carregar}
            aoErroAcao={setErroAcao}
          />
        </>
      )}
    </PaginaShell>
  );
}

/* ----------------------------- Tabela ----------------------------- */

function TabelaCobrancas({
  faturas,
  aoAtualizar,
  aoErroAcao,
}: {
  faturas: Fatura[];
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
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 940 }}>
          <thead>
            <tr>
              <Th>Cliente</Th>
              <Th>Código</Th>
              <Th>Valor</Th>
              <Th>Vencimento</Th>
              <Th>Status</Th>
              <Th>NF</Th>
              <Th>Ações</Th>
            </tr>
          </thead>
          <tbody>
            {faturas.map((f) => (
              <LinhaFatura
                key={f.id}
                fatura={f}
                aoAtualizar={aoAtualizar}
                aoErroAcao={aoErroAcao}
              />
            ))}
          </tbody>
        </table>
      </div>
      <RodapeContagem total={faturas.length} rotulo="cobrança" />
    </div>
  );
}

function LinhaFatura({
  fatura,
  aoAtualizar,
  aoErroAcao,
}: {
  fatura: Fatura;
  aoAtualizar: () => void;
  aoErroAcao: (msg: string | null) => void;
}) {
  // Uma ação em voo por vez na linha; trava ambos os botões e mostra spinner textual.
  const [acaoEmVoo, setAcaoEmVoo] = useState<null | 'pagar' | 'whatsapp'>(null);

  async function executar(rota: 'pagar' | 'whatsapp') {
    if (acaoEmVoo) return;
    setAcaoEmVoo(rota);
    aoErroAcao(null);
    try {
      await api.post(`/faturas/${fatura.id}/${rota}`);
      aoAtualizar();
    } catch {
      aoErroAcao('Não foi possível concluir a ação. Tente novamente.');
      setAcaoEmVoo(null);
    }
    // Sucesso recarrega a lista por aoAtualizar (desmonta a linha).
  }

  const podePagar = fatura.status === 'PENDENTE';

  return (
    <tr className="brk-row" style={{ borderTop: '1px solid var(--borda)' }}>
      <Td>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Avatar nome={fatura.cliente?.nomeFantasia ?? '?'} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600, color: 'var(--cinza-vapor)' }}>
              {fatura.cliente?.nomeFantasia ?? 'Cliente'}
            </div>
          </div>
        </div>
      </Td>
      <Td>
        <CodigoChip codigo={fatura.codigoUnico} />
      </Td>
      <Td>
        <span style={{ color: 'var(--texto-suave)', fontVariantNumeric: 'tabular-nums' }}>
          {formatarBRL(fatura.valor)}
        </span>
      </Td>
      <Td>
        <span style={{ color: 'var(--texto-fraco)' }}>{formatarData(fatura.vencimento)}</span>
      </Td>
      <Td>
        <BadgeStatusFatura status={fatura.status} />
      </Td>
      <Td>
        {fatura.notaFiscalUrl ? (
          <a
            href={fatura.notaFiscalUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--amarelo-fagulha)',
              textDecoration: 'none',
            }}
          >
            <IconeNF />
            Ver NF
          </a>
        ) : (
          <span style={{ color: 'var(--texto-fraco)' }}>—</span>
        )}
      </Td>
      <Td>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {podePagar && (
            <BotaoSecundario onClick={() => executar('pagar')} disabled={acaoEmVoo !== null}>
              {acaoEmVoo === 'pagar' ? 'Processando…' : 'Confirmar pagamento'}
            </BotaoSecundario>
          )}

          {fatura.enviadaWhatsapp ? (
            <SelosEnviada />
          ) : (
            <BotaoSecundario
              onClick={() => executar('whatsapp')}
              disabled={acaoEmVoo !== null}
            >
              {acaoEmVoo === 'whatsapp' ? 'Enviando…' : 'Enviar no WhatsApp'}
            </BotaoSecundario>
          )}

          {/* Sem ação de pagar e sem WhatsApp pendente: mantém a célula limpa. */}
          {!podePagar && fatura.enviadaWhatsapp && (
            <span style={{ color: 'var(--texto-fraco)', fontSize: 12.5 }}>—</span>
          )}
        </div>
      </Td>
    </tr>
  );
}

function BadgeStatusFatura({ status }: { status: StatusFatura }) {
  const cor = CORES_STATUS[status] ?? CORES_STATUS.PENDENTE;
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

// Selo "enviada" no lugar do botão de WhatsApp — checkmark SVG + ponto verde, sem emoji.
function SelosEnviada() {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 12.5,
        fontWeight: 600,
        color: '#67e0a3',
      }}
    >
      <IconeCheck />
      Enviada
    </span>
  );
}

/* ------------------------- Helpers locais ------------------------- */

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

// Ícone de traço para o link da nota fiscal (documento).
function IconeNF(): ReactNode {
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
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M9 13h6M9 17h6" />
    </svg>
  );
}

// Checkmark de traço para o selo "enviada".
function IconeCheck(): ReactNode {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

// Formata "1234.56" → "R$ 1.234,56". Valor inválido cai para "—".
function formatarBRL(valor: string): string {
  const n = Number(valor);
  if (Number.isNaN(n)) return '—';
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Copiada (não importada) de Clientes.tsx.
function formatarData(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}
