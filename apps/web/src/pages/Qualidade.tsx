import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { MODO_DEMO } from '../lib/demo';
import {
  PaginaShell,
  EstadoCarregando,
  EstadoErro,
  PainelVazio,
} from '../components/primitivos';

/**
 * Dashboard de Qualidade & Rework (M18).
 * 3 seções:
 *  1. Indicadores gerais (taxa de rework, médias dimensionais)
 *  2. Histórico de rework (tabela com filtro por origem)
 *  3. Carga por designer (ranking de peças ativas)
 *
 * Contrato (API):
 *  GET /qualidade/dashboard
 *  GET /qualidade/rework?origem=EXTERNO|INTERNO&page=1&limit=20
 *  GET /qualidade/carga-designer
 */

// ─── tipos ───────────────────────────────────────────────────────────────────

interface Dashboard {
  totalAprovados: number;
  totalReworkExterno: number;
  totalReworkInterno: number;
  taxaReworkPct: number;
  mediaQualidadeGrafica: number | null;
  mediaQualidadeTexto: number | null;
  mediaFacilidadeAprovar: number | null;
}

interface ReworkItem {
  id: string;
  statusDe: string;
  statusPara: string;
  origem: 'EXTERNO' | 'INTERNO';
  comentario: string | null;
  criadoEm: string;
  conteudo: {
    codigoUnico: string;
    titulo: string;
    tipo: string;
    cliente: { nomeFantasia: string };
  };
}

interface ReworkResp {
  total: number;
  page: number;
  limit: number;
  itens: ReworkItem[];
}

interface Designer {
  responsavelId: string;
  nome: string;
  pecasAtivas: number;
}

// ─── helpers visuais ─────────────────────────────────────────────────────────

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: 'var(--superficie)',
        border: '1px solid var(--borda)',
        borderRadius: 14,
        padding: 22,
      }}
    >
      {children}
    </div>
  );
}

function SecaoTitulo({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontSize: 15,
        fontWeight: 700,
        color: 'var(--texto)',
        marginBottom: 16,
      }}
    >
      {children}
    </h2>
  );
}

function KpiCard({
  label,
  valor,
  cor,
  sufixo,
}: {
  label: string;
  valor: number | string | null;
  cor?: string;
  sufixo?: string;
}) {
  return (
    <div
      style={{
        background: 'var(--superficie)',
        border: '1px solid var(--borda)',
        borderRadius: 14,
        padding: '20px 22px',
        minWidth: 150,
      }}
    >
      <div
        style={{
          fontSize: 26,
          fontWeight: 800,
          color: cor ?? 'var(--texto)',
          lineHeight: 1,
        }}
      >
        {valor === null ? '—' : valor}
        {valor !== null && sufixo && (
          <span style={{ fontSize: 15, fontWeight: 600, marginLeft: 3 }}>{sufixo}</span>
        )}
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--texto-fraco)', marginTop: 6 }}>{label}</div>
    </div>
  );
}

function StarDisplay({ valor }: { valor: number | null }) {
  if (valor === null) return <span style={{ color: 'var(--texto-fraco)', fontSize: 12 }}>—</span>;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <span style={{ fontSize: 16, lineHeight: 1 }}>★</span>
      <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--amarelo-fagulha)' }}>
        {valor.toFixed(1)}
      </span>
    </span>
  );
}

function BadgeOrigem({ origem }: { origem: 'EXTERNO' | 'INTERNO' }) {
  const cor = origem === 'EXTERNO' ? '#e2738a' : '#7faadf';
  return (
    <span
      style={{
        fontSize: 11.5,
        fontWeight: 700,
        color: cor,
        background: `${cor}22`,
        borderRadius: 6,
        padding: '2px 8px',
        whiteSpace: 'nowrap',
      }}
    >
      {origem}
    </span>
  );
}

// ─── seção Dashboard ─────────────────────────────────────────────────────────

const MOCK_DASH: Dashboard = {
  totalAprovados: 47,
  totalReworkExterno: 8,
  totalReworkInterno: 5,
  taxaReworkPct: 21.7,
  mediaQualidadeGrafica: 4.2,
  mediaQualidadeTexto: 4.5,
  mediaFacilidadeAprovar: 4.7,
};

function SecaoDashboard() {
  const [dados, setDados] = useState<Dashboard | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Dashboard>('/qualidade/dashboard')
      .then((r) => setDados(r.data ?? (MODO_DEMO ? MOCK_DASH : null)))
      .catch(() => { setDados(MODO_DEMO ? MOCK_DASH : null); setErro(null); })
      .finally(() => setCarregando(false));
  }, []);

  if (carregando) return <EstadoCarregando />;
  if (erro) return <EstadoErro mensagem={erro} onTentar={() => window.location.reload()} />;
  if (!dados) return null;

  return (
    <section>
      <SecaoTitulo>Indicadores de qualidade</SecaoTitulo>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        <KpiCard label="Peças aprovadas" valor={dados.totalAprovados} cor="var(--verde)" />
        <KpiCard
          label="Taxa de rework"
          valor={dados.taxaReworkPct}
          sufixo="%"
          cor={dados.taxaReworkPct > 20 ? '#e2738a' : 'var(--texto)'}
        />
        <KpiCard label="Rework externo (cliente)" valor={dados.totalReworkExterno} cor="#e2738a" />
        <KpiCard label="Rework interno (equipe)" valor={dados.totalReworkInterno} cor="#7faadf" />
      </div>

      <div
        style={{
          marginTop: 20,
          background: 'var(--superficie)',
          border: '1px solid var(--borda)',
          borderRadius: 14,
          padding: '18px 22px',
          display: 'flex',
          gap: 32,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div style={{ fontSize: 12, color: 'var(--texto-fraco)', marginBottom: 6 }}>
            Qualidade gráfica
          </div>
          <StarDisplay valor={dados.mediaQualidadeGrafica} />
        </div>
        <div>
          <div style={{ fontSize: 12, color: 'var(--texto-fraco)', marginBottom: 6 }}>
            Qualidade do texto
          </div>
          <StarDisplay valor={dados.mediaQualidadeTexto} />
        </div>
        <div>
          <div style={{ fontSize: 12, color: 'var(--texto-fraco)', marginBottom: 6 }}>
            Facilidade de aprovar
          </div>
          <StarDisplay valor={dados.mediaFacilidadeAprovar} />
        </div>
      </div>
    </section>
  );
}

// ─── seção Rework ─────────────────────────────────────────────────────────────

const MOCK_REWORK: ReworkResp = {
  total: 5, page: 1, limit: 20,
  itens: [
    { id: 'rw1', statusDe: 'REVISAO_INTERNA', statusPara: 'PRODUCAO', origem: 'INTERNO', comentario: 'Texto precisa ser mais curto e objetivo.', criadoEm: '2026-06-15T10:00:00Z', conteudo: { codigoUnico: 'CNT-003', titulo: 'Carrossel: Cardapio de Verao', tipo: 'CARROSSEL', cliente: { nomeFantasia: 'Bigger Pizzaria' } } },
    { id: 'rw2', statusDe: 'AGUARDANDO_CLIENTE', statusPara: 'PRODUCAO', origem: 'EXTERNO', comentario: 'Cliente pediu para trocar a cor de fundo para vermelho.', criadoEm: '2026-06-14T14:30:00Z', conteudo: { codigoUnico: 'CNT-004', titulo: 'Story: Enquete de sabores', tipo: 'STORY', cliente: { nomeFantasia: 'Brasa Burger' } } },
    { id: 'rw3', statusDe: 'REVISAO_INTERNA', statusPara: 'BRIEFING', origem: 'INTERNO', comentario: 'Layout nao segue o brandbook. Refazer com as fontes corretas.', criadoEm: '2026-06-12T09:00:00Z', conteudo: { codigoUnico: 'CNT-007', titulo: 'Post: Promocao segunda-feira', tipo: 'POST', cliente: { nomeFantasia: 'Kings Pizza' } } },
  ],
};

function SecaoRework() {
  const [dados, setDados] = useState<ReworkResp | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [filtroOrigem, setFiltroOrigem] = useState<'TODOS' | 'EXTERNO' | 'INTERNO'>('TODOS');
  const [pagina, setPagina] = useState(1);

  useEffect(() => {
    setCarregando(true);
    setErro(null);
    const params = new URLSearchParams({ page: String(pagina), limit: '20' });
    if (filtroOrigem !== 'TODOS') params.set('origem', filtroOrigem);
    api
      .get<ReworkResp>(`/qualidade/rework?${params}`)
      .then((r) => setDados(r.data ?? (MODO_DEMO ? MOCK_REWORK : null)))
      .catch(() => setErro('Não foi possível carregar o histórico.'))
      .finally(() => setCarregando(false));
  }, [filtroOrigem, pagina]);

  const totalPaginas = dados ? Math.ceil(dados.total / dados.limit) : 1;

  return (
    <section>
      <SecaoTitulo>Histórico de rework</SecaoTitulo>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {(['TODOS', 'EXTERNO', 'INTERNO'] as const).map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => {
              setFiltroOrigem(o);
              setPagina(1);
            }}
            style={{
              border: '1px solid var(--borda-forte)',
              borderRadius: 8,
              padding: '5px 14px',
              fontSize: 12.5,
              fontWeight: filtroOrigem === o ? 700 : 400,
              background: filtroOrigem === o ? 'var(--laranja-fagulha)' : 'transparent',
              color: filtroOrigem === o ? '#fff' : 'var(--texto-suave)',
              cursor: 'pointer',
            }}
          >
            {o}
          </button>
        ))}
        {dados && (
          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--texto-fraco)', alignSelf: 'center' }}>
            {dados.total} ocorrência{dados.total !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {carregando ? (
        <EstadoCarregando />
      ) : erro ? (
        <EstadoErro mensagem={erro} onTentar={() => window.location.reload()} />
      ) : !dados || dados.itens.length === 0 ? (
        <PainelVazio titulo="Sem registros" descricao="Nenhum rework registrado ainda." />
      ) : (
        <Card>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--borda)' }}>
                {['Peça', 'Cliente', 'Origem', 'De → Para', 'Comentário', 'Data'].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: 'left',
                      padding: '0 12px 10px',
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'var(--texto-fraco)',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dados.itens.map((item) => (
                <tr
                  key={item.id}
                  style={{ borderBottom: '1px solid var(--borda)', verticalAlign: 'top' }}
                >
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--texto)' }}>{item.conteudo.titulo}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--texto-fraco)' }}>{item.conteudo.tipo}</div>
                  </td>
                  <td style={{ padding: '10px 12px', color: 'var(--texto-suave)' }}>
                    {item.conteudo.cliente.nomeFantasia}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <BadgeOrigem origem={item.origem} />
                  </td>
                  <td
                    style={{
                      padding: '10px 12px',
                      fontSize: 11.5,
                      color: 'var(--texto-fraco)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.statusDe} → {item.statusPara}
                  </td>
                  <td
                    style={{
                      padding: '10px 12px',
                      color: 'var(--texto-suave)',
                      maxWidth: 220,
                    }}
                  >
                    {item.comentario ?? '—'}
                  </td>
                  <td
                    style={{
                      padding: '10px 12px',
                      fontSize: 11.5,
                      color: 'var(--texto-fraco)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {new Date(item.criadoEm).toLocaleDateString('pt-BR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPaginas > 1 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                paddingTop: 16,
              }}
            >
              <button
                type="button"
                disabled={pagina === 1}
                onClick={() => setPagina((p) => p - 1)}
                style={{
                  border: '1px solid var(--borda-forte)',
                  background: 'transparent',
                  borderRadius: 8,
                  padding: '4px 12px',
                  fontSize: 13,
                  cursor: pagina === 1 ? 'not-allowed' : 'pointer',
                  opacity: pagina === 1 ? 0.4 : 1,
                  color: 'var(--texto-suave)',
                }}
              >
                ← Anterior
              </button>
              <span style={{ fontSize: 12.5, color: 'var(--texto-fraco)' }}>
                Página {pagina} de {totalPaginas}
              </span>
              <button
                type="button"
                disabled={pagina === totalPaginas}
                onClick={() => setPagina((p) => p + 1)}
                style={{
                  border: '1px solid var(--borda-forte)',
                  background: 'transparent',
                  borderRadius: 8,
                  padding: '4px 12px',
                  fontSize: 13,
                  cursor: pagina === totalPaginas ? 'not-allowed' : 'pointer',
                  opacity: pagina === totalPaginas ? 0.4 : 1,
                  color: 'var(--texto-suave)',
                }}
              >
                Próxima →
              </button>
            </div>
          )}
        </Card>
      )}
    </section>
  );
}

// ─── seção Carga por designer ─────────────────────────────────────────────────

function SecaoCargaDesigner() {
  const [dados, setDados] = useState<Designer[] | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Designer[]>('/qualidade/carga-designer')
      .then((r) => setDados(r.data))
      .catch(() => setErro('Não foi possível carregar a carga.'))
      .finally(() => setCarregando(false));
  }, []);

  const maximo = dados && dados.length > 0 ? dados[0].pecasAtivas : 1;

  return (
    <section>
      <SecaoTitulo>Carga por designer</SecaoTitulo>

      {carregando ? (
        <EstadoCarregando />
      ) : erro ? (
        <EstadoErro mensagem={erro} onTentar={() => window.location.reload()} />
      ) : !dados || dados.length === 0 ? (
        <PainelVazio titulo="Sem carga" descricao="Nenhuma peça ativa no momento." />
      ) : (
        <Card>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {dados.map((d) => (
              <div key={d.responsavelId}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: 5,
                  }}
                >
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--texto)' }}>
                    {d.nome}
                  </span>
                  <span style={{ fontSize: 13, color: 'var(--texto-fraco)' }}>
                    {d.pecasAtivas} peça{d.pecasAtivas !== 1 ? 's' : ''}
                  </span>
                </div>
                <div
                  style={{
                    height: 6,
                    borderRadius: 99,
                    background: 'var(--borda)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${(d.pecasAtivas / maximo) * 100}%`,
                      borderRadius: 99,
                      background: 'var(--laranja-fagulha)',
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </section>
  );
}

// ─── seção Rework por designer/squad + Otimizações por gestor ──────────────────

interface ReworkLinha { nome: string; interno: number; externo: number }
interface ReworkDetalhado { porResponsavel: ReworkLinha[]; porSquad: ReworkLinha[] }
interface OtimGestor { nome: string; total: number; tempoMedioMin: number | null }

function ListaRework({ titulo, linhas }: { titulo: string; linhas: ReworkLinha[] }) {
  return (
    <Card>
      <SecaoTitulo>{titulo}</SecaoTitulo>
      {linhas.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--texto-fraco)' }}>Sem rework registrado.</p>
      ) : (
        <ul style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
          {linhas.map((l) => (
            <li key={l.nome} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5 }}>
              <span style={{ color: 'var(--cinza-vapor)' }}>{l.nome}</span>
              <span style={{ color: 'var(--texto-suave)' }}>
                <span style={{ color: '#7faadf' }}>{l.interno} int.</span> · <span style={{ color: '#e2738a' }}>{l.externo} ext.</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function SecaoProdutividade() {
  const [rework, setRework] = useState<ReworkDetalhado | null>(null);
  const [otim, setOtim] = useState<OtimGestor[]>([]);

  useEffect(() => {
    api.get<ReworkDetalhado>('/qualidade/rework-detalhado').then(({ data }) => setRework(data)).catch(() => setRework(null));
    api.get<OtimGestor[]>('/trafego/campanhas/otimizacoes-gestor').then(({ data }) => setOtim(data)).catch(() => setOtim([]));
  }, []);

  return (
    <section>
      <SecaoTitulo>Produtividade da equipe</SecaoTitulo>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginTop: 12 }}>
        <ListaRework titulo="Refações por designer" linhas={rework?.porResponsavel ?? []} />
        <ListaRework titulo="Refações por squad" linhas={rework?.porSquad ?? []} />
        <Card>
          <SecaoTitulo>Otimizações por gestor</SecaoTitulo>
          {otim.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--texto-fraco)' }}>Nenhuma otimização registrada.</p>
          ) : (
            <ul style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
              {otim.map((o) => (
                <li key={o.nome} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5 }}>
                  <span style={{ color: 'var(--cinza-vapor)' }}>{o.nome}</span>
                  <span style={{ color: 'var(--texto-suave)' }}>
                    <strong style={{ color: 'var(--texto)' }}>{o.total}</strong>
                    {o.tempoMedioMin != null && <span style={{ color: 'var(--texto-fraco)' }}> · {o.tempoMedioMin}min méd.</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </section>
  );
}

// ─── página principal ─────────────────────────────────────────────────────────

export default function Qualidade() {
  return (
    <PaginaShell titulo="Qualidade & Rework" subtitulo="Monitoramento de avaliações e histórico de rework">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
        <SecaoDashboard />
        <SecaoProdutividade />
        <SecaoRework />
        <SecaoCargaDesigner />
      </div>
    </PaginaShell>
  );
}
