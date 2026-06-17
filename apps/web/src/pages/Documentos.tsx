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
 * Documentos do colaborador (holerite, folha, contrato, manual) — por link +
 * assinatura. Cada um vê os seus e assina; RH cadastra e acompanha.
 */

interface Documento {
  id: string;
  tipo: string;
  titulo: string;
  url: string;
  competencia: string | null;
  assinadoEm: string | null;
  colaborador?: { nome: string };
}
interface UsuarioOpt { id: string; nome: string }

const TIPOS = ['HOLERITE', 'FOLHA', 'CONTRATO', 'MANUAL', 'OUTRO'];
const rotulo: React.CSSProperties = { fontSize: 12.5, fontWeight: 600, color: 'var(--texto-suave)', marginBottom: 4, display: 'block' };

export function Documentos() {
  const { usuario } = useAuth();
  const ehRh = ['SUPERADMIN', 'ADMIN', 'FINANCEIRO'].includes(usuario?.cargo ?? '');

  const [meus, setMeus] = useState<Documento[]>([]);
  const [todos, setTodos] = useState<Documento[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioOpt[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);

  const [colaboradorId, setColaboradorId] = useState('');
  const [tipo, setTipo] = useState('HOLERITE');
  const [titulo, setTitulo] = useState('');
  const [url, setUrl] = useState('');
  const [competencia, setCompetencia] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    setCarregando(true); setErro(false);
    try {
      const { data } = await api.get<Documento[]>('/documentos/meus');
      setMeus(data);
      if (ehRh) {
        const [t, u] = await Promise.all([
          api.get<Documento[]>('/documentos'),
          api.get<UsuarioOpt[]>('/usuarios').catch(() => ({ data: [] as UsuarioOpt[] })),
        ]);
        setTodos(t.data);
        setUsuarios(u.data);
      }
    } catch { setErro(true); }
    finally { setCarregando(false); }
  }
  useEffect(() => { carregar(); /* eslint-disable-next-line */ }, [ehRh]);

  async function assinar(id: string) {
    await api.patch(`/documentos/${id}/assinar`);
    carregar();
  }
  async function enviar() {
    if (!colaboradorId || !titulo.trim() || !url.trim() || salvando) return;
    setSalvando(true);
    try {
      await api.post('/documentos', { colaboradorId, tipo, titulo: titulo.trim(), url: url.trim(), competencia: competencia.trim() || undefined });
      setTitulo(''); setUrl(''); setCompetencia('');
      carregar();
    } finally { setSalvando(false); }
  }
  async function remover(id: string) {
    await api.delete(`/documentos/${id}`);
    carregar();
  }

  if (carregando) return <EstadoCarregando />;
  if (erro) return <EstadoErro mensagem="Falha ao carregar documentos." onTentar={carregar} />;

  function linha(d: Documento, mine: boolean) {
    return (
      <li key={d.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '12px 14px', borderRadius: 10, background: 'var(--superficie-2)' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>
            {d.titulo} <span style={{ fontSize: 11, color: 'var(--texto-fraco)' }}>· {d.tipo}{d.competencia ? ` · ${d.competencia}` : ''}</span>
          </div>
          {!mine && d.colaborador && <div style={{ fontSize: 12, color: 'var(--texto-fraco)' }}>{d.colaborador.nome}</div>}
          <a href={d.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12.5, color: 'var(--cinza-vapor)', textDecoration: 'none' }}>Abrir documento →</a>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {d.assinadoEm ? (
            <span style={{ fontSize: 12, fontWeight: 700, color: '#67e0a3' }}>Assinado ✓</span>
          ) : mine ? (
            <BotaoPrimario onClick={() => assinar(d.id)}>Assinar</BotaoPrimario>
          ) : (
            <span style={{ fontSize: 12, color: 'var(--amarelo)' }}>Pendente</span>
          )}
          {ehRh && !mine && <BotaoSecundario onClick={() => remover(d.id)}>Remover</BotaoSecundario>}
        </div>
      </li>
    );
  }

  return (
    <PaginaShell titulo="Documentos" subtitulo="Holerite, folha, contrato e manual — assine pelo sistema.">
      <Card>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Meus documentos</h3>
        {meus.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--texto-fraco)' }}>Nenhum documento ainda.</p>
        ) : (
          <ul style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{meus.map((d) => linha(d, true))}</ul>
        )}
      </Card>

      {ehRh && (
        <>
          <Card>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Enviar documento (RH)</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
              <div>
                <label style={rotulo}>Colaborador</label>
                <select className="brk-input" style={{ width: '100%' }} value={colaboradorId} onChange={(e) => setColaboradorId(e.target.value)}>
                  <option value="">Selecione…</option>
                  {usuarios.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
                </select>
              </div>
              <div>
                <label style={rotulo}>Tipo</label>
                <select className="brk-input" style={{ width: '100%' }} value={tipo} onChange={(e) => setTipo(e.target.value)}>
                  {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div><label style={rotulo}>Título</label><input className="brk-input" style={{ width: '100%' }} value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Holerite Junho/2026" /></div>
              <div><label style={rotulo}>Competência</label><input className="brk-input" style={{ width: '100%' }} value={competencia} onChange={(e) => setCompetencia(e.target.value)} placeholder="2026-06" /></div>
              <div><label style={rotulo}>Link do documento</label><input className="brk-input" style={{ width: '100%' }} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." /></div>
            </div>
            <div style={{ marginTop: 10 }}>
              <BotaoPrimario onClick={enviar} disabled={salvando || !colaboradorId || !titulo.trim() || !url.trim()}>
                {salvando ? 'Enviando…' : 'Enviar para assinatura'}
              </BotaoPrimario>
            </div>
          </Card>

          <Card>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Todos os documentos</h3>
            {todos.length === 0 ? (
              <PainelVazio titulo="Nenhum documento" descricao="Os documentos enviados aparecerão aqui." />
            ) : (
              <ul style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{todos.map((d) => linha(d, false))}</ul>
            )}
          </Card>
        </>
      )}
    </PaginaShell>
  );
}
