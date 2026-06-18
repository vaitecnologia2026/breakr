import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import {
  PaginaShell,
  BotaoPrimario,
  EstadoCarregando,
  EstadoErro,
} from '../components/primitivos';
import { Card, CampoSelect } from '../components/ui';
import { comDemo, mockSeDemo } from '../lib/demo';

/**
 * Medalhas (gamificação) — admin/CS cria e concede a clientes; aparecem no portal.
 *  GET/POST/DELETE /medalhas
 *  POST/DELETE /medalhas/:id/conceder?clienteId=
 */

interface Medalha { id: string; titulo: string; icone: string | null; descricao: string | null }
interface ClienteOpt { id: string; nomeFantasia: string }

const rotulo: React.CSSProperties = { fontSize: 12.5, fontWeight: 600, color: 'var(--texto-suave)', marginBottom: 4, display: 'block' };

const MOCK_MEDALHAS: Medalha[] = [
  { id: 'md1', titulo: 'Cliente do Mes', icone: '🏆', descricao: 'Concedida ao cliente com melhor engajamento do mes.' },
  { id: 'md2', titulo: 'Campanha de Ouro', icone: '🥇', descricao: 'ROAS acima de 4x por pelo menos 30 dias consecutivos.' },
  { id: 'md3', titulo: 'Aprovacao Rapida', icone: '⚡', descricao: 'Aprovou 10 pecas em menos de 24h cada.' },
  { id: 'md4', titulo: 'Parceiro Fiel', icone: '🤝', descricao: 'Cliente ha mais de 12 meses sem interrupcao.' },
];
const MOCK_CLIENTES_MD: ClienteOpt[] = [
  { id: 'c1', nomeFantasia: 'Tua Pizza' },
  { id: 'c2', nomeFantasia: 'Rikai Sushi' },
  { id: 'c3', nomeFantasia: 'Bigger Pizzaria' },
  { id: 'c4', nomeFantasia: 'Brasa Burger' },
  { id: 'c5', nomeFantasia: 'Taco Loco' },
];

export function Medalhas() {
  const [medalhas, setMedalhas] = useState<Medalha[]>([]);
  const [clientes, setClientes] = useState<ClienteOpt[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);

  const [titulo, setTitulo] = useState('');
  const [icone, setIcone] = useState('🏅');
  const [descricao, setDescricao] = useState('');
  const [salvando, setSalvando] = useState(false);

  const [medalhaSel, setMedalhaSel] = useState('');
  const [clienteSel, setClienteSel] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  async function carregar() {
    setCarregando(true); setErro(false);
    try {
      const [m, c] = await Promise.all([
        api.get<Medalha[]>('/medalhas'),
        api.get<ClienteOpt[]>('/clientes'),
      ]);
      setMedalhas(comDemo(m.data, MOCK_MEDALHAS));
      setClientes(comDemo(c.data, MOCK_CLIENTES_MD));
    } catch { setMedalhas(mockSeDemo(MOCK_MEDALHAS)); setClientes(mockSeDemo(MOCK_CLIENTES_MD)); setErro(false); }
    finally { setCarregando(false); }
  }
  useEffect(() => { carregar(); }, []);

  async function criar() {
    if (!titulo.trim() || salvando) return;
    setSalvando(true);
    try {
      await api.post('/medalhas', { titulo: titulo.trim(), icone: icone.trim() || undefined, descricao: descricao.trim() || undefined });
      setTitulo(''); setIcone('🏅'); setDescricao('');
      carregar();
    } finally { setSalvando(false); }
  }
  async function remover(id: string) { await api.delete(`/medalhas/${id}`); carregar(); }
  async function conceder() {
    if (!medalhaSel || !clienteSel) return;
    await api.post(`/medalhas/${medalhaSel}/conceder?clienteId=${clienteSel}`);
    setFeedback('Medalha concedida ao cliente!');
    setTimeout(() => setFeedback(null), 3000);
  }

  if (carregando) return <EstadoCarregando />;
  if (erro) return <EstadoErro mensagem="Falha ao carregar as medalhas." onTentar={carregar} />;

  return (
    <PaginaShell titulo="Medalhas" subtitulo="Gamificação do portal do cliente.">
      <Card>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Nova medalha</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
          <div><label style={rotulo}>Ícone (emoji)</label><input className="brk-input" style={{ width: '100%' }} value={icone} onChange={(e) => setIcone(e.target.value)} maxLength={4} /></div>
          <div><label style={rotulo}>Título</label><input className="brk-input" style={{ width: '100%' }} value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Onboarding concluído" /></div>
          <div><label style={rotulo}>Descrição</label><input className="brk-input" style={{ width: '100%' }} value={descricao} onChange={(e) => setDescricao(e.target.value)} /></div>
        </div>
        <div style={{ marginTop: 10 }}><BotaoPrimario onClick={criar} disabled={salvando || !titulo.trim()}>{salvando ? 'Salvando…' : 'Criar medalha'}</BotaoPrimario></div>
      </Card>

      <Card>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Conceder a um cliente</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, alignItems: 'end' }}>
          <CampoSelect rotulo="Medalha" value={medalhaSel} onChange={(e) => setMedalhaSel(e.target.value)}>
            <option value="">Selecione…</option>
            {medalhas.map((m) => <option key={m.id} value={m.id}>{m.icone} {m.titulo}</option>)}
          </CampoSelect>
          <CampoSelect rotulo="Cliente" value={clienteSel} onChange={(e) => setClienteSel(e.target.value)}>
            <option value="">Selecione…</option>
            {clientes.map((c) => <option key={c.id} value={c.id}>{c.nomeFantasia}</option>)}
          </CampoSelect>
          <BotaoPrimario onClick={conceder} disabled={!medalhaSel || !clienteSel}>Conceder</BotaoPrimario>
        </div>
        {feedback && <p style={{ fontSize: 13, color: '#67e0a3', marginTop: 8 }}>{feedback}</p>}
      </Card>

      <Card>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Medalhas cadastradas</h3>
        {medalhas.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--texto-fraco)' }}>Nenhuma medalha.</p>
        ) : (
          <ul style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {medalhas.map((m) => (
              <li key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 10, background: 'var(--superficie-2)' }}>
                <span style={{ fontSize: 18 }}>{m.icone}</span>
                <span style={{ fontSize: 13.5, fontWeight: 600 }}>{m.titulo}</span>
                <button type="button" onClick={() => remover(m.id)} style={{ background: 'none', border: 'none', color: 'var(--texto-fraco)', cursor: 'pointer' }}>×</button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </PaginaShell>
  );
}
