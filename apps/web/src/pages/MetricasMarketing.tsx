// Métricas de Marketing (Briefing Marketing — Seção 7) + evolução mês a mês
// (comparativos históricos, Seção 12 item 11). Somente leitura. Consome
// GET /metricas-marketing. Aditivo — não altera a página /metricas existente.
import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api';
import { PaginaHeader, Btn, CampoSelect, Carregando, ErroEstado, Vazio } from '../components/ui';
import { GuiaJornadaMarketing } from '../components/GuiaJornadaMarketing';

interface SquadLinha { nome: string; concluidos: number; noPrazo: number; foraPrazo: number; retrabalho: number; abertas: number; taxaNoPrazo: number | null }
interface MembroLinha { nome: string; concluidos: number; noPrazo: number; foraPrazo: number; retrabalho: number; abertas: number; taxaNoPrazo: number | null }
interface ClienteLinha { nome: string; concluidos: number; retrabalho: number; total: number; mediaRetrabalho: number }
interface Metricas {
  geral: { totalMateriais: number; concluidos: number; emAberto: number; totalRetrabalho: number; taxaNoPrazo: number | null };
  porSquad: SquadLinha[];
  porMembro: MembroLinha[];
  porCliente: ClienteLinha[];
  evolucaoMensal: { mes: string; concluidos: number }[];
  esforcoTipos?: {
    totalPecas: number;
    pecasComTipo: number;
    esforcoPrevistoMin: number;
    esforcoPrevistoHoras: number;
    diasConcluirTotal: number;
    diasConcluirMedia: number | null;
  };
}
interface OpcoesFiltro {
  squads: { id: string; nome: string }[];
  clientes: { id: string; nomeFantasia: string }[];
}

function Kpi({ titulo, valor }: { titulo: string; valor: string | number }) {
  return (
    <div style={{ padding: '12px 14px', border: '1px solid var(--borda)', borderRadius: 8, minWidth: 130 }}>
      <div style={{ fontSize: 12.5, color: 'var(--texto-suave)' }}>{titulo}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--texto)' }}>{valor}</div>
    </div>
  );
}

export function MetricasMarketing() {
  const [dados, setDados] = useState<Metricas | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);
  const [opcoes, setOpcoes] = useState<OpcoesFiltro>({ squads: [], clientes: [] });
  const [squadId, setSquadId] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [meses, setMeses] = useState('6');

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(false);
    try {
      const params: Record<string, string> = { meses };
      if (squadId) params.squadId = squadId;
      if (clienteId) params.clienteId = clienteId;
      const { data } = await api.get<Metricas>('/metricas-marketing', { params });
      setDados(data);
    } catch {
      setErro(true);
    } finally {
      setCarregando(false);
    }
  }, [squadId, clienteId, meses]);

  useEffect(() => {
    api.get<OpcoesFiltro>('/metricas-marketing/filtros')
      .then(({ data }) => setOpcoes(data))
      .catch(() => setOpcoes({ squads: [], clientes: [] }));
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  const maxMensal = dados ? Math.max(1, ...dados.evolucaoMensal.map((m) => m.concluidos)) : 1;

  return (
    <div>
      <PaginaHeader
        titulo="Métricas de Marketing"
        subtitulo="Desempenho da produção por squad, membro e cliente + evolução mês a mês (Seção 7 do briefing)."
        acoes={<Btn variante="secondary" onClick={() => carregar()}>Atualizar</Btn>}
      />

      <GuiaJornadaMarketing etapaAtual="acompanhamento" />

      <div className="brk-card brk-card-p" style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ minWidth: 180 }}>
          <CampoSelect rotulo="Squad" value={squadId} onChange={(e) => setSquadId(e.target.value)}>
            <option value="">Todos os squads</option>
            {opcoes.squads.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </CampoSelect>
        </div>
        <div style={{ minWidth: 180 }}>
          <CampoSelect rotulo="Cliente" value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
            <option value="">Todos os clientes</option>
            {opcoes.clientes.map((c) => <option key={c.id} value={c.id}>{c.nomeFantasia}</option>)}
          </CampoSelect>
        </div>
        <div style={{ minWidth: 140 }}>
          <CampoSelect rotulo="Período" value={meses} onChange={(e) => setMeses(e.target.value)}>
            <option value="3">Últimos 3 meses</option>
            <option value="6">Últimos 6 meses</option>
            <option value="12">Últimos 12 meses</option>
          </CampoSelect>
        </div>
      </div>

      {carregando && <Carregando />}
      {!carregando && erro && <ErroEstado mensagem="Não foi possível carregar as métricas." onTentar={carregar} />}

      {!carregando && !erro && dados && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginTop: 16 }}>
          {/* KPIs gerais */}
          <section className="brk-card brk-card-p">
            <h3 style={{ marginTop: 0 }}>Visão geral</h3>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Kpi titulo="Materiais" valor={dados.geral.totalMateriais} />
              <Kpi titulo="Concluídos" valor={dados.geral.concluidos} />
              <Kpi titulo="Em aberto" valor={dados.geral.emAberto} />
              <Kpi titulo="No prazo" valor={dados.geral.taxaNoPrazo === null ? '—' : `${dados.geral.taxaNoPrazo}%`} />
              <Kpi titulo="Retrabalho" valor={dados.geral.totalRetrabalho} />
              <Kpi titulo="Esforço previsto (peças)" valor={`${dados.esforcoTipos?.esforcoPrevistoHoras ?? 0}h`} />
              <Kpi titulo="Dias previstos (soma)" valor={dados.esforcoTipos?.diasConcluirTotal ?? 0} />
            </div>
            {dados.esforcoTipos && dados.esforcoTipos.pecasComTipo > 0 && (
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--texto-fraco)' }}>
                Esforço/dias previstos contabilizados a partir do tipo de tarefa de {dados.esforcoTipos.pecasComTipo} peça(s) (média {dados.esforcoTipos.diasConcluirMedia ?? '—'} dia(s)).
              </div>
            )}
          </section>

          {/* Evolução mensal */}
          <section className="brk-card brk-card-p">
            <h3 style={{ marginTop: 0 }}>Evolução mês a mês (concluídos)</h3>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 140, marginTop: 8 }}>
              {dados.evolucaoMensal.map((m) => (
                <div key={m.mes} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 11, color: 'var(--texto-suave)' }}>{m.concluidos}</span>
                  <div style={{ width: '70%', height: `${(m.concluidos / maxMensal) * 100}%`, minHeight: 2, background: 'var(--amarelo-fagulha)', borderRadius: 4 }} />
                  <span style={{ fontSize: 10.5, color: 'var(--texto-fraco)' }}>{m.mes.slice(5)}/{m.mes.slice(2, 4)}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Por squad */}
          <section className="brk-card brk-card-p">
            <h3 style={{ marginTop: 0 }}>Por squad</h3>
            <TabelaMetrica
              vazio="Sem dados por squad."
              colunas={['Squad', 'Concluídos', 'No prazo', 'Retrabalho', 'Abertas']}
              linhas={dados.porSquad.map((s) => [s.nome, s.concluidos, s.taxaNoPrazo === null ? '—' : `${s.taxaNoPrazo}%`, s.retrabalho, s.abertas])}
            />
          </section>

          {/* Por membro */}
          <section className="brk-card brk-card-p">
            <h3 style={{ marginTop: 0 }}>Por membro</h3>
            <TabelaMetrica
              vazio="Sem dados por membro."
              colunas={['Membro', 'Concluídos', 'No prazo', 'Retrabalho', 'Abertas']}
              linhas={dados.porMembro.map((m) => [m.nome, m.concluidos, m.taxaNoPrazo === null ? '—' : `${m.taxaNoPrazo}%`, m.retrabalho, m.abertas])}
            />
          </section>

          {/* Por cliente */}
          <section className="brk-card brk-card-p">
            <h3 style={{ marginTop: 0 }}>Por cliente</h3>
            <TabelaMetrica
              vazio="Sem dados por cliente."
              colunas={['Cliente', 'Concluídos', 'Retrabalho', 'Média retrab.']}
              linhas={dados.porCliente.map((c) => [c.nome, c.concluidos, c.retrabalho, c.mediaRetrabalho])}
            />
          </section>
        </div>
      )}
    </div>
  );
}

function TabelaMetrica({ colunas, linhas, vazio }: { colunas: string[]; linhas: (string | number)[][]; vazio: string }) {
  if (linhas.length === 0) return <Vazio titulo={vazio} />;
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left', color: 'var(--texto-suave)', fontSize: 13 }}>
            {colunas.map((c) => <th key={c} style={{ padding: '6px 8px' }}>{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {linhas.map((linha, i) => (
            <tr key={i} style={{ borderTop: '1px solid var(--borda)' }}>
              {linha.map((v, j) => (
                <td key={j} style={{ padding: '8px', color: j === 0 ? 'var(--texto)' : 'var(--texto-suave)' }}>{v}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
