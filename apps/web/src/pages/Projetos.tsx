import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import {
  PaginaShell,
  EstadoCarregando,
  EstadoErro,
  PainelVazio,
  Th,
  Td,
} from '../components/primitivos';

/**
 * Tela de Projetos (M15).
 * Projetos são criados automaticamente pelo motor quando o cliente ativa.
 * Esta tela é somente leitura — exibe o status de cada projeto por cliente.
 *
 * Contrato (API):
 *  GET /projetos → Projeto[] (com cliente incluído)
 */

type TipoProjeto = 'MARKETING' | 'GESTAO' | 'FINANCEIRO';
type StatusProjeto = 'ATIVO' | 'PAUSADO' | 'ENCERRADO';

interface Projeto {
  id: string;
  tipo: TipoProjeto;
  nome: string;
  status: StatusProjeto;
  codigoUnico: string;
  criadoEm: string;
  cliente: { nomeFantasia: string };
}

const COR_TIPO: Record<TipoProjeto, string> = {
  MARKETING: '#7faadf',
  GESTAO: '#a8d9a0',
  FINANCEIRO: '#f0c070',
};

const COR_STATUS: Record<StatusProjeto, string> = {
  ATIVO: '#a8d9a0',
  PAUSADO: '#f0c070',
  ENCERRADO: '#c0c0c0',
};

function BadgeTipo({ tipo }: { tipo: TipoProjeto }) {
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 700,
        color: COR_TIPO[tipo],
        background: `${COR_TIPO[tipo]}22`,
        borderRadius: 6,
        padding: '2px 8px',
      }}
    >
      {tipo}
    </span>
  );
}

function BadgeStatus({ status }: { status: StatusProjeto }) {
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 700,
        color: COR_STATUS[status],
        background: `${COR_STATUS[status]}22`,
        borderRadius: 6,
        padding: '2px 8px',
      }}
    >
      {status}
    </span>
  );
}

const MOCK_PROJETOS: Projeto[] = [
  { id: 'p1', tipo: 'MARKETING', nome: 'Social Media + Tráfego — Tua Pizza', status: 'ATIVO', codigoUnico: 'PRJ-001', criadoEm: '2025-11-01T00:00:00Z', cliente: { nomeFantasia: 'Tua Pizza' } },
  { id: 'p2', tipo: 'MARKETING', nome: 'Social Media + Tráfego — Rikai Sushi', status: 'ATIVO', codigoUnico: 'PRJ-002', criadoEm: '2025-10-15T00:00:00Z', cliente: { nomeFantasia: 'Rikai Sushi' } },
  { id: 'p3', tipo: 'MARKETING', nome: 'Social Media — Bigger Pizzaria', status: 'ATIVO', codigoUnico: 'PRJ-003', criadoEm: '2026-01-20T00:00:00Z', cliente: { nomeFantasia: 'Bigger Pizzaria' } },
  { id: 'p4', tipo: 'MARKETING', nome: 'Social Media + Tráfego — Brasa Burger', status: 'ATIVO', codigoUnico: 'PRJ-004', criadoEm: '2025-12-01T00:00:00Z', cliente: { nomeFantasia: 'Brasa Burger' } },
  { id: 'p5', tipo: 'MARKETING', nome: 'Pacote Premium — Taco Loco', status: 'ATIVO', codigoUnico: 'PRJ-005', criadoEm: '2026-02-10T00:00:00Z', cliente: { nomeFantasia: 'Taco Loco' } },
  { id: 'p6', tipo: 'MARKETING', nome: 'Social Media — Kings Pizza', status: 'PAUSADO', codigoUnico: 'PRJ-006', criadoEm: '2025-08-05T00:00:00Z', cliente: { nomeFantasia: 'Kings Pizza' } },
  { id: 'p7', tipo: 'MARKETING', nome: 'Pacote Essencial — Brasils Pizzeria', status: 'ENCERRADO', codigoUnico: 'PRJ-007', criadoEm: '2025-06-01T00:00:00Z', cliente: { nomeFantasia: 'Brasils Pizzeria' } },
];

export function Projetos() {
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState('');

  useEffect(() => {
    api
      .get<Projeto[]>('/projetos')
      .then((r) => setProjetos(r.data.length ? r.data : MOCK_PROJETOS))
      .catch(() => { setProjetos(MOCK_PROJETOS); setErro('Não foi possível carregar os projetos.'); })
      .finally(() => setCarregando(false));
  }, []);

  const q = busca.toLowerCase();
  const filtrados = projetos.filter(
    (p) =>
      p.nome.toLowerCase().includes(q) ||
      p.cliente.nomeFantasia.toLowerCase().includes(q) ||
      p.tipo.toLowerCase().includes(q) ||
      p.codigoUnico.toLowerCase().includes(q),
  );

  return (
    <PaginaShell titulo="Projetos" subtitulo="Projetos ativos por cliente — criados automaticamente pelo motor">
      <div style={{ display: 'flex', gap: 12, marginBottom: 4, flexWrap: 'wrap' }}>
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por cliente, tipo ou código…"
          style={{
            flex: 1,
            minWidth: 220,
            background: 'var(--superficie-2)',
            border: '1px solid var(--borda)',
            borderRadius: 10,
            padding: '9px 14px',
            color: 'var(--texto)',
            fontSize: 13.5,
            outline: 'none',
          }}
        />
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 12.5,
            color: 'var(--texto-fraco)',
          }}
        >
          {filtrados.length} projeto{filtrados.length !== 1 ? 's' : ''}
        </div>
      </div>

      {carregando ? (
        <EstadoCarregando />
      ) : erro ? (
        <EstadoErro mensagem={erro} onTentar={() => window.location.reload()} />
      ) : filtrados.length === 0 ? (
        <PainelVazio
          titulo="Nenhum projeto"
          descricao="Projetos são criados automaticamente quando um cliente ativa seu plano."
        />
      ) : (
        <div
          style={{
            background: 'var(--superficie)',
            border: '1px solid var(--borda)',
            borderRadius: 14,
            overflow: 'hidden',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--borda)' }}>
                <Th>Projeto</Th>
                <Th>Cliente</Th>
                <Th>Tipo</Th>
                <Th>Status</Th>
                <Th>Código</Th>
                <Th>Criado em</Th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((p) => (
                <tr
                  key={p.id}
                  style={{ borderBottom: '1px solid var(--borda)', verticalAlign: 'middle' }}
                >
                  <Td>
                    <span style={{ fontWeight: 600, color: 'var(--texto)' }}>{p.nome}</span>
                  </Td>
                  <Td>
                    <span style={{ color: 'var(--texto-suave)' }}>{p.cliente.nomeFantasia}</span>
                  </Td>
                  <Td>
                    <BadgeTipo tipo={p.tipo} />
                  </Td>
                  <Td>
                    <BadgeStatus status={p.status} />
                  </Td>
                  <Td>
                    <span style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--texto-fraco)' }}>
                      {p.codigoUnico}
                    </span>
                  </Td>
                  <Td>
                    <span style={{ color: 'var(--texto-fraco)', fontSize: 12.5 }}>
                      {new Date(p.criadoEm).toLocaleDateString('pt-BR')}
                    </span>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PaginaShell>
  );
}
