// Gestão de Processos Jurídicos (Administração › Jurídico). Conectada ao backend
// próprio /processos-juridicos (contencioso). Degrada com elegância se a API
// ainda não estiver no ar (ex.: antes do redeploy) ou sem permissão (jurídico).
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { PaginaHeader, Btn, Carregando, Alerta } from '../components/ui';

interface Processo {
  id: string;
  numero: string;
  parte: string;
  vara?: string | null;
  fase?: string | null;
  status: 'ATIVO' | 'SUSPENSO' | 'ARQUIVADO' | 'ENCERRADO';
  valorCausa?: string | number | null;
  proximoPrazo?: string | null;
  observacao?: string | null;
}

const STATUS: { value: Processo['status']; rotulo: string; cor: string }[] = [
  { value: 'ATIVO', rotulo: 'Ativo', cor: '#10b981' },
  { value: 'SUSPENSO', rotulo: 'Suspenso', cor: '#f5a623' },
  { value: 'ARQUIVADO', rotulo: 'Arquivado', cor: '#94a3b8' },
  { value: 'ENCERRADO', rotulo: 'Encerrado', cor: '#64748b' },
];

const COLUNAS = ['Processo', 'Cliente / Parte', 'Vara / Comarca', 'Fase', 'Status', ''];
const rotuloStatus = (s: string) => STATUS.find((x) => x.value === s)?.rotulo ?? s;
const corStatus = (s: string) => STATUS.find((x) => x.value === s)?.cor ?? 'var(--texto-fraco)';

export function ProcessosJuridicos() {
  const [processos, setProcessos] = useState<Processo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [numero, setNumero] = useState('');
  const [parte, setParte] = useState('');
  const [vara, setVara] = useState('');
  const [fase, setFase] = useState('');
  const [status, setStatus] = useState<Processo['status']>('ATIVO');
  const [salvando, setSalvando] = useState(false);
  const [feedback, setFeedback] = useState<{ tipo: 'sucesso' | 'erro'; msg: string } | null>(null);

  async function carregar() {
    setCarregando(true);
    setErro(null);
    try {
      const { data } = await api.get<Processo[]>('/processos-juridicos');
      setProcessos(data);
    } catch {
      setProcessos([]);
      setErro(
        'Não foi possível carregar os processos. A API jurídica pode ainda não estar no ar ' +
          '(aguardando redeploy) ou o acesso é restrito ao jurídico.',
      );
    } finally {
      setCarregando(false);
    }
  }
  useEffect(() => {
    carregar();
  }, []);

  async function criar() {
    if (!numero.trim() || !parte.trim() || salvando) return;
    setSalvando(true);
    setFeedback(null);
    try {
      await api.post('/processos-juridicos', {
        numero: numero.trim(),
        parte: parte.trim(),
        vara: vara.trim() || undefined,
        fase: fase.trim() || undefined,
        status,
      });
      setNumero('');
      setParte('');
      setVara('');
      setFase('');
      setStatus('ATIVO');
      setFeedback({ tipo: 'sucesso', msg: 'Processo cadastrado.' });
      await carregar();
    } catch {
      setFeedback({ tipo: 'erro', msg: 'Erro ao cadastrar o processo (acesso restrito ao jurídico).' });
    } finally {
      setSalvando(false);
    }
  }

  async function remover(id: string) {
    try {
      await api.delete(`/processos-juridicos/${id}`);
      await carregar();
    } catch {
      setFeedback({ tipo: 'erro', msg: 'Erro ao remover o processo.' });
    }
  }

  if (carregando) return <Carregando />;

  return (
    <>
      <PaginaHeader
        titulo="Gestão de Processos Jurídicos"
        subtitulo="Contencioso jurídico — acompanhamento de processos, fases e prazos"
      />

      {erro && <Alerta tipo="info">{erro}</Alerta>}
      {feedback && <Alerta tipo={feedback.tipo}>{feedback.msg}</Alerta>}

      <section className="brk-card brk-card-p" style={{ marginBottom: 18 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Novo processo</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <input className="brk-input" placeholder="Nº do processo" value={numero}
            onChange={(e) => setNumero(e.target.value)} style={{ flex: '1 1 180px' }} />
          <input className="brk-input" placeholder="Cliente / parte" value={parte}
            onChange={(e) => setParte(e.target.value)} style={{ flex: '1 1 180px' }} />
          <input className="brk-input" placeholder="Vara / comarca" value={vara}
            onChange={(e) => setVara(e.target.value)} style={{ flex: '1 1 160px' }} />
          <input className="brk-input" placeholder="Fase" value={fase}
            onChange={(e) => setFase(e.target.value)} style={{ flex: '1 1 140px' }} />
          <select className="brk-input" value={status}
            onChange={(e) => setStatus(e.target.value as Processo['status'])} style={{ flex: '0 1 150px' }}>
            {STATUS.map((s) => (
              <option key={s.value} value={s.value}>{s.rotulo}</option>
            ))}
          </select>
          <Btn onClick={criar} disabled={!numero.trim() || !parte.trim() || salvando}>
            {salvando ? 'Salvando…' : 'Cadastrar'}
          </Btn>
        </div>
      </section>

      <div className="brk-card brk-card-p" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              {COLUNAS.map((c, i) => (
                <th key={i} style={{ textAlign: 'left', padding: '8px 10px', color: 'var(--texto-fraco)', borderBottom: '1px solid var(--borda)', fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '.04em' }}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {processos.length === 0 ? (
              <tr>
                <td colSpan={COLUNAS.length} style={{ padding: '16px 10px', color: 'var(--texto-fraco)' }}>
                  Nenhum processo cadastrado.
                </td>
              </tr>
            ) : (
              processos.map((p) => (
                <tr key={p.id}>
                  <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--borda)', fontWeight: 700 }}>{p.numero}</td>
                  <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--borda)' }}>{p.parte}</td>
                  <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--borda)', color: 'var(--texto-fraco)' }}>{p.vara || '—'}</td>
                  <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--borda)', color: 'var(--texto-fraco)' }}>{p.fase || '—'}</td>
                  <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--borda)' }}>
                    <span style={{ color: corStatus(p.status), fontWeight: 700, fontSize: 12.5 }}>{rotuloStatus(p.status)}</span>
                  </td>
                  <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--borda)', textAlign: 'right' }}>
                    <Btn onClick={() => remover(p.id)}>Remover</Btn>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
