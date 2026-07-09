import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import {
  PaginaShell,
  BotaoPrimario,
  EstadoCarregando,
  EstadoErro,
  PainelVazio,
} from '../components/primitivos';
import { Card } from '../components/ui';
import { comDemo, mockSeDemo } from '../lib/demo';

/**
 * Avaliações de desempenho — cada um vê as suas; liderança cria e acompanha.
 */

interface Avaliacao {
  id: string;
  periodo: string;
  nota: number | null;
  comentario: string;
  criadoEm: string;
  colaborador?: { nome: string };
  avaliador?: { nome: string } | null;
}
interface UsuarioOpt { id: string; nome: string }

const rotulo: React.CSSProperties = { fontSize: 12.5, fontWeight: 600, color: 'var(--texto-suave)', marginBottom: 4, display: 'block' };

const MOCK_AVALIACOES: Avaliacao[] = [
  { id: 'av1', periodo: '2026-Q2', nota: 9, comentario: 'Excelente atuação no onboarding dos novos clientes. Proatividade acima da média. Ponto de melhoria: documentação dos processos.', criadoEm: '2026-06-01T00:00:00Z', colaborador: { nome: 'Marina Alves' }, avaliador: { nome: 'Admin' } },
  { id: 'av2', periodo: '2026-Q2', nota: 8, comentario: 'Bom desempenho nas campanhas de tráfego. ROAS médio acima da meta. Oportunidade de melhoria na comunicação com o cliente.', criadoEm: '2026-06-01T00:00:00Z', colaborador: { nome: 'Pedro Rocha' }, avaliador: { nome: 'Admin' } },
  { id: 'av3', periodo: '2026-Q2', nota: 10, comentario: 'Performance excepcional. Fechou 4 clientes no mês, superou a meta em 33%. Referência para o time.', criadoEm: '2026-06-01T00:00:00Z', colaborador: { nome: 'Rafael Lima' }, avaliador: { nome: 'Admin' } },
];

export function Desempenho() {
  const { usuario } = useAuth();
  const ehLideranca = ['SUPERADMIN', 'ADMIN'].includes(usuario?.cargo ?? '');

  const [meus, setMeus] = useState<Avaliacao[]>([]);
  const [todos, setTodos] = useState<Avaliacao[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioOpt[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);

  const [colaboradorId, setColaboradorId] = useState('');
  const [periodo, setPeriodo] = useState('2026-Q3');
  const [nota, setNota] = useState('');
  const [comentario, setComentario] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    setCarregando(true); setErro(false);
    try {
      const { data } = await api.get<Avaliacao[]>('/desempenho/meus');
      setMeus(comDemo(data, MOCK_AVALIACOES));
      if (ehLideranca) {
        const [t, u] = await Promise.all([
          api.get<Avaliacao[]>('/desempenho'),
          api.get<UsuarioOpt[]>('/usuarios').catch(() => ({ data: [] as UsuarioOpt[] })),
        ]);
        setTodos(comDemo(t.data, MOCK_AVALIACOES));
        setUsuarios(u.data);
      }
    } catch { setMeus(mockSeDemo(MOCK_AVALIACOES)); setErro(false); }
    finally { setCarregando(false); }
  }
  useEffect(() => { carregar(); /* eslint-disable-next-line */ }, [ehLideranca]);

  async function criar() {
    if (!colaboradorId || comentario.trim().length < 2 || salvando) return;
    setSalvando(true);
    try {
      await api.post('/desempenho', {
        colaboradorId, periodo,
        nota: nota.trim() ? Number(nota) : undefined,
        comentario: comentario.trim(),
      });
      setComentario(''); setNota('');
      carregar();
    } finally { setSalvando(false); }
  }
  async function remover(id: string) {
    await api.delete(`/desempenho/${id}`);
    carregar();
  }

  if (carregando) return <EstadoCarregando />;
  if (erro) return <EstadoErro mensagem="Falha ao carregar avaliações." onTentar={carregar} />;

  function cartao(a: Avaliacao, mine: boolean) {
    return (
      <li key={a.id} style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--superficie-2)', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>
            {!mine && a.colaborador ? `${a.colaborador.nome} · ` : ''}{a.periodo}
          </span>
          {a.nota !== null && <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--cinza-vapor)' }}>{a.nota}/10</span>}
        </div>
        <span style={{ fontSize: 13, color: 'var(--texto-suave)', whiteSpace: 'pre-line' }}>{a.comentario}</span>
        <span style={{ fontSize: 11.5, color: 'var(--texto-fraco)' }}>
          {a.avaliador?.nome ? `por ${a.avaliador.nome} · ` : ''}{new Date(a.criadoEm).toLocaleDateString('pt-BR')}
          {ehLideranca && !mine && (
            <button type="button" onClick={() => remover(a.id)} style={{ marginLeft: 8, background: 'none', border: 'none', color: 'var(--texto-fraco)', cursor: 'pointer', fontSize: 11.5 }}>remover</button>
          )}
        </span>
      </li>
    );
  }

  return (
    <PaginaShell titulo="Desempenho" subtitulo="Avaliações de desempenho do time.">
      <Card>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Minhas avaliações</h3>
        {meus.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--texto-fraco)' }}>Nenhuma avaliação ainda.</p>
        ) : (
          <ul style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{meus.map((a) => cartao(a, true))}</ul>
        )}
      </Card>

      {ehLideranca && (
        <>
          <Card>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Nova avaliação</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))', gap: 10 }}>
              <div>
                <label style={rotulo}>Colaborador</label>
                <select className="brk-input" style={{ width: '100%' }} value={colaboradorId} onChange={(e) => setColaboradorId(e.target.value)}>
                  <option value="">Selecione…</option>
                  {usuarios.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
                </select>
              </div>
              <div><label style={rotulo}>Período</label><input className="brk-input" style={{ width: '100%' }} value={periodo} onChange={(e) => setPeriodo(e.target.value)} placeholder="2026-Q3" /></div>
              <div><label style={rotulo}>Nota (0–10)</label><input className="brk-input" style={{ width: '100%' }} value={nota} onChange={(e) => setNota(e.target.value)} placeholder="8" /></div>
            </div>
            <div style={{ marginTop: 10 }}>
              <label style={rotulo}>Comentário</label>
              <textarea className="brk-input" style={{ width: '100%', minHeight: 80, resize: 'vertical' }} value={comentario} onChange={(e) => setComentario(e.target.value)} />
            </div>
            <div style={{ marginTop: 10 }}>
              <BotaoPrimario onClick={criar} disabled={salvando || !colaboradorId || comentario.trim().length < 2}>
                {salvando ? 'Salvando…' : 'Registrar avaliação'}
              </BotaoPrimario>
            </div>
          </Card>

          <Card>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Todas as avaliações</h3>
            {todos.length === 0 ? (
              <PainelVazio titulo="Nenhuma avaliação" descricao="As avaliações registradas aparecerão aqui." />
            ) : (
              <ul style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{todos.map((a) => cartao(a, false))}</ul>
            )}
          </Card>
        </>
      )}
    </PaginaShell>
  );
}
