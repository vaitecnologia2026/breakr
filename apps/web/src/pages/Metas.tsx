import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import {
  PaginaShell,
  BotaoPrimario,
  BotaoSecundario,
  EstadoCarregando,
  EstadoErro,
  PainelVazio,
} from '../components/primitivos';
import { Card } from '../components/ui';

/**
 * Metas trimestrais (OKRs) — liderança define; todos acompanham.
 *  GET    /metas
 *  POST   /metas { titulo, descricao?, periodo }
 *  PATCH  /metas/:id { progresso?, status?, ... }
 *  DELETE /metas/:id
 */

interface Meta {
  id: string;
  titulo: string;
  descricao: string | null;
  periodo: string;
  progresso: number;
  status: string;
}

const rotulo: React.CSSProperties = { fontSize: 12.5, fontWeight: 600, color: 'var(--texto-suave)', marginBottom: 4, display: 'block' };

export function Metas() {
  const { usuario } = useAuth();
  const ehLideranca = ['SUPERADMIN', 'ADMIN'].includes(usuario?.cargo ?? '');

  const [metas, setMetas] = useState<Meta[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);

  const [titulo, setTitulo] = useState('');
  const [periodo, setPeriodo] = useState('2026-Q3');
  const [descricao, setDescricao] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    setCarregando(true);
    setErro(false);
    try {
      const { data } = await api.get<Meta[]>('/metas');
      setMetas(data);
    } catch {
      setErro(true);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function adicionar() {
    if (!titulo.trim() || !/^\d{4}-Q[1-4]$/.test(periodo) || salvando) return;
    setSalvando(true);
    try {
      await api.post('/metas', { titulo: titulo.trim(), periodo, descricao: descricao.trim() || undefined });
      setTitulo('');
      setDescricao('');
      carregar();
    } finally {
      setSalvando(false);
    }
  }

  async function setProgresso(m: Meta, progresso: number) {
    const status = progresso >= 100 ? 'CONCLUIDA' : m.status;
    await api.patch(`/metas/${m.id}`, { progresso, status });
    carregar();
  }

  async function remover(id: string) {
    await api.delete(`/metas/${id}`);
    carregar();
  }

  if (carregando) return <EstadoCarregando />;
  if (erro) return <EstadoErro mensagem="Falha ao carregar as metas." onTentar={carregar} />;

  // Agrupa por período (mais recente primeiro).
  const periodos = Array.from(new Set(metas.map((m) => m.periodo))).sort().reverse();

  return (
    <PaginaShell titulo="Metas (OKRs)" subtitulo="Objetivos do trimestre (Q3, Q4…).">
      {ehLideranca && (
        <Card>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Nova meta</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
            <div><label style={rotulo}>Título</label><input className="brk-input" style={{ width: '100%' }} value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Dobrar a carteira" /></div>
            <div>
              <label style={rotulo}>Período</label>
              <select className="brk-input" style={{ width: '100%' }} value={periodo} onChange={(e) => setPeriodo(e.target.value)}>
                {['2026-Q3', '2026-Q4', '2027-Q1', '2027-Q2'].map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div><label style={rotulo}>Descrição</label><input className="brk-input" style={{ width: '100%' }} value={descricao} onChange={(e) => setDescricao(e.target.value)} /></div>
          </div>
          <div style={{ marginTop: 10 }}>
            <BotaoPrimario onClick={adicionar} disabled={salvando || !titulo.trim()}>
              {salvando ? 'Adicionando…' : 'Adicionar meta'}
            </BotaoPrimario>
          </div>
        </Card>
      )}

      {metas.length === 0 ? (
        <PainelVazio titulo="Nenhuma meta definida" descricao="As metas do trimestre aparecerão aqui." />
      ) : (
        periodos.map((p) => (
          <Card key={p}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>{p}</h3>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {metas.filter((m) => m.periodo === p).map((m) => (
                <li key={m.id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{m.titulo}</span>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: m.status === 'CONCLUIDA' ? '#67e0a3' : m.status === 'ATRASADA' ? 'var(--vermelho)' : 'var(--cinza-vapor)' }}>
                      {m.progresso}%
                    </span>
                  </div>
                  {m.descricao && <span style={{ fontSize: 12.5, color: 'var(--texto-fraco)' }}>{m.descricao}</span>}
                  <div style={{ height: 8, borderRadius: 999, background: 'var(--superficie-3)', overflow: 'hidden' }}>
                    <div className="brk-gradient-bg" style={{ width: `${Math.max(0, Math.min(100, m.progresso))}%`, height: '100%' }} />
                  </div>
                  {ehLideranca && (
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                      <input
                        type="range" min={0} max={100} value={m.progresso}
                        onChange={(e) => setProgresso(m, Number(e.target.value))}
                        style={{ flex: 1, minWidth: 120 }}
                      />
                      <BotaoSecundario onClick={() => remover(m.id)}>Remover</BotaoSecundario>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        ))
      )}
    </PaginaShell>
  );
}
