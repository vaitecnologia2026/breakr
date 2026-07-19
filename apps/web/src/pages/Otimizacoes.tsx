// Otimizações (Marketing › Tráfego Pago). Reaproveita as APIs existentes do
// tráfego: cronograma de otimização (/trafego/cronograma) e produtividade por
// gestor (/trafego/campanhas/otimizacoes-gestor). Nenhum backend novo.
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { PaginaHeader, Btn, Carregando, Alerta } from '../components/ui';

interface RegraCronograma {
  id: string;
  diaSemana: number;
  objetivo: string;
  ativo?: boolean;
}
interface OtimizacaoGestor {
  nome: string;
  total: number;
  tempoMedioMin: number | null;
}

const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export function Otimizacoes() {
  const [cronograma, setCronograma] = useState<RegraCronograma[]>([]);
  const [gestores, setGestores] = useState<OtimizacaoGestor[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [dia, setDia] = useState('1');
  const [objetivo, setObjetivo] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [feedback, setFeedback] = useState<{ tipo: 'sucesso' | 'erro'; msg: string } | null>(null);

  async function carregar() {
    setCarregando(true);
    setErro(null);
    try {
      const [cron, ges] = await Promise.all([
        api.get<RegraCronograma[]>('/trafego/cronograma'),
        api.get<OtimizacaoGestor[]>('/trafego/campanhas/otimizacoes-gestor'),
      ]);
      setCronograma(cron.data);
      setGestores(ges.data);
    } catch {
      setErro('Não foi possível carregar as otimizações.');
    } finally {
      setCarregando(false);
    }
  }
  useEffect(() => {
    carregar();
  }, []);

  async function criarRegra() {
    if (!objetivo.trim() || salvando) return;
    setSalvando(true);
    setFeedback(null);
    try {
      await api.post('/trafego/cronograma', { diaSemana: Number(dia), objetivo: objetivo.trim() });
      setObjetivo('');
      setFeedback({ tipo: 'sucesso', msg: 'Regra de otimização adicionada.' });
      await carregar();
    } catch {
      setFeedback({ tipo: 'erro', msg: 'Erro ao adicionar a regra (acesso restrito ao tráfego).' });
    } finally {
      setSalvando(false);
    }
  }

  async function removerRegra(id: string) {
    try {
      await api.delete(`/trafego/cronograma/${id}`);
      await carregar();
    } catch {
      setFeedback({ tipo: 'erro', msg: 'Erro ao remover a regra.' });
    }
  }

  if (carregando) return <Carregando />;

  return (
    <>
      <PaginaHeader
        titulo="Otimizações"
        subtitulo="Cronograma de otimização por dia/objetivo e produtividade por gestor de tráfego"
      />

      {erro && <Alerta tipo="erro">{erro}</Alerta>}
      {feedback && <Alerta tipo={feedback.tipo}>{feedback.msg}</Alerta>}

      <section className="brk-card brk-card-p" style={{ marginBottom: 18 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Nova regra de cronograma</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <select className="brk-input" value={dia} onChange={(e) => setDia(e.target.value)} style={{ flex: '0 1 160px' }}>
            {DIAS.map((d, i) => (
              <option key={i} value={i}>{d}</option>
            ))}
          </select>
          <input className="brk-input" placeholder="Objetivo (ex.: OUTCOME_SALES)" value={objetivo}
            onChange={(e) => setObjetivo(e.target.value)} style={{ flex: '1 1 220px' }} />
          <Btn onClick={criarRegra} disabled={!objetivo.trim() || salvando}>
            {salvando ? 'Salvando…' : 'Adicionar'}
          </Btn>
        </div>
      </section>

      <h2 style={{ fontSize: 14, fontWeight: 700, margin: '4px 0 10px' }}>Cronograma de otimização</h2>
      {cronograma.length === 0 ? (
        <div className="brk-card brk-card-p" style={{ marginBottom: 18 }}>
          <p style={{ fontSize: 13, color: 'var(--texto-fraco)' }}>Nenhuma regra cadastrada.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
          {cronograma.map((r) => (
            <div key={r.id} className="brk-card brk-card-p">
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13.5 }}>
                  <b>{DIAS[r.diaSemana] ?? '—'}</b> · {r.objetivo}
                </span>
                <Btn onClick={() => removerRegra(r.id)}>Remover</Btn>
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 style={{ fontSize: 14, fontWeight: 700, margin: '4px 0 10px' }}>Otimizações por gestor</h2>
      {gestores.length === 0 ? (
        <div className="brk-card brk-card-p">
          <p style={{ fontSize: 13, color: 'var(--texto-fraco)' }}>Nenhuma otimização registrada.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {gestores.map((g) => (
            <div key={g.nome} className="brk-card brk-card-p">
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13.5, fontWeight: 700 }}>{g.nome}</span>
                <span style={{ fontSize: 12.5, color: 'var(--texto-fraco)' }}>
                  {g.total} otimização(ões){g.tempoMedioMin != null ? ` · ${g.tempoMedioMin} min médios` : ''}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
