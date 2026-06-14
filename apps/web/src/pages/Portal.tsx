import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { Logo } from '../components/Logo';
import { EstadoCarregando } from './Clientes';

/**
 * Portal público do cliente (estilo eCite).
 * O dono do restaurante abre /portal/:codigo e vê, somente leitura,
 * o status da sua conta: onboarding, contrato e cobranças.
 *
 * Página standalone — vive FORA do shell interno (sem sidebar, sem auth).
 * O endpoint é público; api.get funciona sem token.
 *
 * Contrato:
 *  GET /portal/:codigo → PortalData  (404 se o código não existir)
 */

interface PortalData {
  cliente: { nomeFantasia: string; status: string; codigoUnico: string };
  squad: { nome: string } | null;
  plano: { nome: string } | null;
  contrato: { status: string; vencimento: string | null } | null;
  onboarding: {
    progresso: number;
    concluido: boolean;
    etapas: { titulo: string; concluido: boolean; ordem: number }[];
  } | null;
  faturas: {
    codigoUnico: string;
    valor: string;
    vencimento: string;
    status: string;
    notaFiscalUrl: string | null;
  }[];
}

/* --------------------------- Helpers locais --------------------------- */

function formatarData(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatarBRL(valor: string): string {
  const n = Number(valor);
  if (Number.isNaN(n)) return valor;
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Aparência por status do cliente (badge do cabeçalho).
function corStatusCliente(status: string): { fundo: string; texto: string; ponto: string } {
  switch (status) {
    case 'ATIVO':
      return { fundo: 'rgba(46, 204, 113, 0.14)', texto: '#67e0a3', ponto: '#2ecc71' };
    case 'ONBOARD':
      return { fundo: 'rgba(202, 63, 23, 0.16)', texto: '#f0814f', ponto: '#ca3f17' };
    case 'NOVO':
      return { fundo: 'rgba(255, 148, 6, 0.14)', texto: '#ffb44d', ponto: '#ff9406' };
    case 'INATIVO':
      return { fundo: 'rgba(148, 18, 44, 0.18)', texto: '#e2738a', ponto: '#94122c' };
    default:
      return { fundo: 'rgba(243, 244, 247, 0.1)', texto: '#cdd0d8', ponto: '#9aa0ad' };
  }
}

// Rótulo amigável + cor por status do contrato.
function aparenciaContrato(status: string): { rotulo: string; cor: string } {
  switch (status) {
    case 'EM_VIGOR':
      return { rotulo: 'Em vigor', cor: '#2ecc71' };
    case 'RENOVACAO':
      return { rotulo: 'Em renovação', cor: '#ff9406' };
    case 'ENCERRADO':
      return { rotulo: 'Encerrado', cor: '#9aa0ad' };
    case 'PENDENTE':
      return { rotulo: 'Pendente', cor: '#ff9406' };
    case 'CANCELADO':
      return { rotulo: 'Cancelado', cor: '#e2738a' };
    default:
      return { rotulo: status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, ' '), cor: '#9aa0ad' };
  }
}

// Rótulo amigável + cor por status da fatura.
function aparenciaFatura(status: string): { rotulo: string; cor: string; fundo: string } {
  switch (status) {
    case 'PAGA':
      return { rotulo: 'Paga', cor: '#67e0a3', fundo: 'rgba(46, 204, 113, 0.14)' };
    case 'PENDENTE':
      return { rotulo: 'Pendente', cor: '#ffb44d', fundo: 'rgba(255, 148, 6, 0.14)' };
    case 'VENCIDA':
      return { rotulo: 'Vencida', cor: '#e2738a', fundo: 'rgba(148, 18, 44, 0.18)' };
    case 'CANCELADA':
      return { rotulo: 'Cancelada', cor: '#cdd0d8', fundo: 'rgba(243, 244, 247, 0.1)' };
    case 'ESTORNADA':
      return { rotulo: 'Estornada', cor: '#cdd0d8', fundo: 'rgba(243, 244, 247, 0.1)' };
    default:
      return { rotulo: status, cor: '#cdd0d8', fundo: 'rgba(243, 244, 247, 0.1)' };
  }
}

/* ------------------------------- Página ------------------------------- */

export function Portal() {
  const { codigo } = useParams<{ codigo: string }>();
  const [dados, setDados] = useState<PortalData | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [naoEncontrado, setNaoEncontrado] = useState(false);

  useEffect(() => {
    let ativo = true;
    async function carregar() {
      setCarregando(true);
      setNaoEncontrado(false);
      try {
        const { data } = await api.get<PortalData>(`/portal/${codigo}`);
        if (ativo) setDados(data);
      } catch {
        if (ativo) setNaoEncontrado(true);
      } finally {
        if (ativo) setCarregando(false);
      }
    }
    carregar();
    return () => {
      ativo = false;
    };
  }, [codigo]);

  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'var(--preto-fumaca)',
        padding: '40px 20px 56px',
      }}
    >
      <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
        {carregando ? (
          <EstadoCarregando />
        ) : naoEncontrado || !dados ? (
          <PortalNaoEncontrado />
        ) : (
          <>
            <Cabecalho dados={dados} />
            {dados.onboarding && <CardOnboarding onboarding={dados.onboarding} />}
            {dados.contrato && <CardContrato contrato={dados.contrato} />}
            <CardFaturas faturas={dados.faturas} />
            <Rodape />
          </>
        )}
      </div>
    </main>
  );
}

/* ------------------------------ Cabeçalho ----------------------------- */

function Cabecalho({ dados }: { dados: PortalData }) {
  const { cliente, squad, plano } = dados;
  const cor = corStatusCliente(cliente.status);

  const linhaPlanoSquad = [plano && `Plano ${plano.nome}`, squad && `Squad ${squad.nome}`]
    .filter(Boolean)
    .join(' · ');

  return (
    <header style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Logo tamanho={28} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: 26, fontWeight: 800 }}>Olá, {cliente.nomeFantasia}</h1>
          <Badge cor={cor.texto} fundo={cor.fundo} ponto={cor.ponto}>
            {cliente.status}
          </Badge>
        </div>
        <p style={{ fontSize: 14.5, color: 'var(--texto-suave)' }}>
          Acompanhe sua operação com a Breakr.
        </p>
        {linhaPlanoSquad && (
          <p style={{ fontSize: 13, color: 'var(--texto-fraco)' }}>{linhaPlanoSquad}</p>
        )}
      </div>
    </header>
  );
}

/* ---------------------------- Card onboarding ------------------------- */

function CardOnboarding({ onboarding }: { onboarding: NonNullable<PortalData['onboarding']> }) {
  const progresso = Math.max(0, Math.min(100, onboarding.progresso));
  const etapas = [...onboarding.etapas].sort((a, b) => a.ordem - b.ordem);

  return (
    <Card>
      <TituloCard>Seu onboarding</TituloCard>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 4 }}>
        <div
          role="progressbar"
          aria-valuenow={progresso}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Progresso do onboarding"
          style={{
            flex: 1,
            height: 10,
            borderRadius: 999,
            background: 'var(--superficie-3)',
            overflow: 'hidden',
          }}
        >
          <div
            className="brk-gradient-bg"
            style={{
              width: `${progresso}%`,
              height: '100%',
              borderRadius: 999,
              transition: 'width 0.4s ease',
            }}
          />
        </div>
        <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--cinza-vapor)', minWidth: 42, textAlign: 'right' }}>
          {progresso}%
        </span>
      </div>

      {onboarding.concluido && (
        <p style={{ fontSize: 13.5, fontWeight: 600, color: '#67e0a3', marginTop: 12 }}>
          Onboarding concluído!
        </p>
      )}

      <ul style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 16 }}>
        {etapas.map((etapa, i) => (
          <li
            key={`${etapa.ordem}-${i}`}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' }}
          >
            <IconeCheck concluido={etapa.concluido} />
            <span
              style={{
                fontSize: 14,
                color: etapa.concluido ? 'var(--texto-fraco)' : 'var(--cinza-vapor)',
                textDecoration: etapa.concluido ? 'line-through' : 'none',
              }}
            >
              {etapa.titulo}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/* ----------------------------- Card contrato -------------------------- */

function CardContrato({ contrato }: { contrato: NonNullable<PortalData['contrato']> }) {
  const { rotulo, cor } = aparenciaContrato(contrato.status);

  return (
    <Card>
      <TituloCard>Contrato</TituloCard>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4, flexWrap: 'wrap' }}>
        <Badge cor={cor} fundo="transparent" ponto={cor} contorno>
          {rotulo}
        </Badge>
        <span style={{ fontSize: 14, color: 'var(--texto-suave)' }}>
          Vence em {formatarData(contrato.vencimento)}
        </span>
      </div>
    </Card>
  );
}

/* ----------------------------- Card faturas --------------------------- */

function CardFaturas({ faturas }: { faturas: PortalData['faturas'] }) {
  return (
    <Card>
      <TituloCard>Cobranças</TituloCard>

      {faturas.length === 0 ? (
        <p style={{ fontSize: 14, color: 'var(--texto-fraco)', marginTop: 8 }}>
          Nenhuma cobrança ainda.
        </p>
      ) : (
        <ul style={{ display: 'flex', flexDirection: 'column', marginTop: 8 }}>
          {faturas.map((fatura, i) => {
            const ap = aparenciaFatura(fatura.status);
            return (
              <li
                key={fatura.codigoUnico}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 16,
                  padding: '14px 0',
                  borderTop: i === 0 ? 'none' : '1px solid var(--borda)',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--cinza-vapor)' }}>
                    {formatarBRL(fatura.valor)}
                  </span>
                  <span style={{ fontSize: 12.5, color: 'var(--texto-fraco)' }}>
                    Vence em {formatarData(fatura.vencimento)}
                  </span>
                  <code style={{ fontSize: 11.5, color: 'var(--texto-fraco)' }}>
                    {fatura.codigoUnico}
                  </code>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  {fatura.notaFiscalUrl && (
                    <a
                      href={fatura.notaFiscalUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 12.5,
                        fontWeight: 600,
                        color: 'var(--amarelo-fagulha)',
                      }}
                    >
                      <IconeDocumento />
                      Nota fiscal
                    </a>
                  )}
                  <Badge cor={ap.cor} fundo={ap.fundo} ponto={ap.cor}>
                    {ap.rotulo}
                  </Badge>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

/* ------------------------------- Rodapé ------------------------------- */

function Rodape() {
  return (
    <footer style={{ paddingTop: 8, textAlign: 'center' }}>
      <span style={{ fontSize: 12, color: 'var(--texto-fraco)' }}>
        Breakr · sistema operacional da sua operação
      </span>
    </footer>
  );
}

/* ---------------------------- Estado 404 ------------------------------ */

function PortalNaoEncontrado() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
        textAlign: 'center',
        padding: '72px 24px',
        background: 'var(--superficie)',
        border: '1px dashed var(--borda-forte)',
        borderRadius: 16,
        marginTop: 24,
      }}
    >
      <Logo tamanho={26} />
      <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--cinza-vapor)', marginTop: 8 }}>
        Não encontramos este portal.
      </span>
      <span style={{ fontSize: 13.5, color: 'var(--texto-fraco)', maxWidth: 380 }}>
        Verifique se o link está completo e correto. Se a dúvida persistir, fale com a sua equipe na Breakr.
      </span>
    </div>
  );
}

/* ==================================================================== */
/* Primitivos locais de UI (página standalone, sem design system).      */
/* ==================================================================== */

function Card({ children }: { children: React.ReactNode }) {
  return (
    <section
      style={{
        background: 'var(--superficie)',
        border: '1px solid var(--borda)',
        borderRadius: 16,
        padding: 24,
        boxShadow: 'var(--sombra-card)',
      }}
    >
      {children}
    </section>
  );
}

function TituloCard({ children }: { children: React.ReactNode }) {
  return <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--cinza-vapor)' }}>{children}</h2>;
}

function Badge({
  children,
  cor,
  fundo,
  ponto,
  contorno,
}: {
  children: React.ReactNode;
  cor: string;
  fundo: string;
  ponto: string;
  contorno?: boolean;
}) {
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
        background: fundo,
        color: cor,
        border: contorno ? `1px solid ${cor}` : 'none',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 6,
          height: 6,
          borderRadius: 999,
          background: ponto,
          boxShadow: `0 0 6px ${ponto}`,
        }}
      />
      {children}
    </span>
  );
}

// Check preenchido (verde) quando concluído; círculo vazio caso contrário.
function IconeCheck({ concluido }: { concluido: boolean }) {
  if (concluido) {
    return (
      <svg
        width={20}
        height={20}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        style={{ flexShrink: 0 }}
      >
        <circle cx="12" cy="12" r="10" fill="rgba(46, 204, 113, 0.16)" />
        <path
          d="M8 12.5l2.5 2.5L16 9"
          stroke="#2ecc71"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <circle cx="12" cy="12" r="9" stroke="var(--borda-forte)" strokeWidth="2" />
    </svg>
  );
}

function IconeDocumento() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M14 3v5h5M9 13h6M9 17h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
