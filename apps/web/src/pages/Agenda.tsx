import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import {
  PaginaShell,
  BotaoPrimario,
  BotaoSecundario,
  EstadoCarregando,
  EstadoErro,
} from '../components/primitivos';
import { Card } from '../components/ui';

/**
 * Agenda interna: sala de reuniões presencial (RBAC CS/gestão), feriados (gestão),
 * home office (cada um marca os seus dias).
 */

interface Agendamento { id: string; titulo: string; inicio: string; fim: string; responsavel: { nome: string } | null }
interface Feriado { id: string; data: string; titulo: string }
interface DiaHO { id: string; data: string }

const rotulo: React.CSSProperties = { fontSize: 12.5, fontWeight: 600, color: 'var(--texto-suave)', marginBottom: 4, display: 'block' };
const dataBR = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
const dtBR = (iso: string) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

export function Agenda() {
  const { usuario } = useAuth();
  const cargo = usuario?.cargo ?? '';
  const podeAgendarSala = ['SUPERADMIN', 'ADMIN', 'CS'].includes(cargo);
  const ehGestao = ['SUPERADMIN', 'ADMIN'].includes(cargo);

  const [sala, setSala] = useState<Agendamento[]>([]);
  const [feriados, setFeriados] = useState<Feriado[]>([]);
  const [meusHO, setMeusHO] = useState<DiaHO[]>([]);
  const [hojeHO, setHojeHO] = useState<string[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);

  // forms
  const [salaTitulo, setSalaTitulo] = useState('');
  const [salaInicio, setSalaInicio] = useState('');
  const [salaFim, setSalaFim] = useState('');
  const [salaErro, setSalaErro] = useState<string | null>(null);
  const [ferData, setFerData] = useState('');
  const [ferTitulo, setFerTitulo] = useState('');
  const [hoData, setHoData] = useState('');

  async function carregar() {
    setCarregando(true); setErro(false);
    try {
      const [s, f, m, h] = await Promise.all([
        api.get<Agendamento[]>('/agenda/sala'),
        api.get<Feriado[]>('/agenda/feriados'),
        api.get<DiaHO[]>('/agenda/home-office/meus'),
        api.get<string[]>('/agenda/home-office/hoje'),
      ]);
      setSala(s.data); setFeriados(f.data); setMeusHO(m.data); setHojeHO(h.data);
    } catch { setErro(true); }
    finally { setCarregando(false); }
  }
  useEffect(() => { carregar(); }, []);

  async function agendarSala() {
    setSalaErro(null);
    if (!salaTitulo.trim() || !salaInicio || !salaFim) return;
    try {
      await api.post('/agenda/sala', { titulo: salaTitulo.trim(), inicio: new Date(salaInicio).toISOString(), fim: new Date(salaFim).toISOString() });
      setSalaTitulo(''); setSalaInicio(''); setSalaFim('');
      carregar();
    } catch (e) {
      setSalaErro((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Falha ao agendar.');
    }
  }
  async function cancelarSala(id: string) { await api.delete(`/agenda/sala/${id}`); carregar(); }
  async function addFeriado() {
    if (!ferData || !ferTitulo.trim()) return;
    await api.post('/agenda/feriados', { data: ferData, titulo: ferTitulo.trim() });
    setFerData(''); setFerTitulo(''); carregar();
  }
  async function removerFeriado(id: string) { await api.delete(`/agenda/feriados/${id}`); carregar(); }
  async function marcarHO() {
    if (!hoData) return;
    await api.post('/agenda/home-office', { data: hoData });
    setHoData(''); carregar();
  }
  async function desmarcarHO(id: string) { await api.delete(`/agenda/home-office/${id}`); carregar(); }

  if (carregando) return <EstadoCarregando />;
  if (erro) return <EstadoErro mensagem="Falha ao carregar a agenda." onTentar={carregar} />;

  return (
    <PaginaShell titulo="Agenda" subtitulo="Sala de reuniões, feriados e home office.">
      {/* Sala presencial */}
      <Card>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Sala de reuniões presencial</h3>
        {sala.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--texto-fraco)' }}>Nenhum agendamento.</p>
        ) : (
          <ul style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: podeAgendarSala ? 14 : 0 }}>
            {sala.map((a) => (
              <li key={a.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '10px 12px', borderRadius: 10, background: 'var(--superficie-2)' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{a.titulo}</div>
                  <div style={{ fontSize: 12, color: 'var(--texto-fraco)' }}>{dtBR(a.inicio)} – {new Date(a.fim).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}{a.responsavel ? ` · ${a.responsavel.nome}` : ''}</div>
                </div>
                {podeAgendarSala && <BotaoSecundario onClick={() => cancelarSala(a.id)}>Cancelar</BotaoSecundario>}
              </li>
            ))}
          </ul>
        )}
        {podeAgendarSala ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, borderTop: '1px solid var(--borda)', paddingTop: 14 }}>
            <div><label style={rotulo}>Título</label><input className="brk-input" style={{ width: '100%' }} value={salaTitulo} onChange={(e) => setSalaTitulo(e.target.value)} placeholder="Reunião com cliente X" /></div>
            <div><label style={rotulo}>Início</label><input className="brk-input" style={{ width: '100%' }} type="datetime-local" value={salaInicio} onChange={(e) => setSalaInicio(e.target.value)} /></div>
            <div><label style={rotulo}>Fim</label><input className="brk-input" style={{ width: '100%' }} type="datetime-local" value={salaFim} onChange={(e) => setSalaFim(e.target.value)} /></div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}><BotaoPrimario onClick={agendarSala} disabled={!salaTitulo.trim() || !salaInicio || !salaFim}>Agendar sala</BotaoPrimario></div>
            {salaErro && <p style={{ gridColumn: '1/-1', fontSize: 12.5, color: 'var(--vermelho)' }}>{salaErro}</p>}
          </div>
        ) : (
          <p style={{ fontSize: 12, color: 'var(--texto-fraco)', marginTop: 8 }}>Apenas CS e gestão podem agendar a sala.</p>
        )}
      </Card>

      {/* Feriados */}
      <Card>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Feriados</h3>
        {feriados.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--texto-fraco)' }}>Nenhum feriado cadastrado.</p>
        ) : (
          <ul style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: ehGestao ? 14 : 0 }}>
            {feriados.map((f) => (
              <li key={f.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13.5, padding: '8px 12px', borderRadius: 8, background: 'var(--superficie-2)' }}>
                <span><strong style={{ color: '#f0814f' }}>{dataBR(f.data)}</strong> · {f.titulo}</span>
                {ehGestao && <button type="button" onClick={() => removerFeriado(f.id)} style={{ background: 'none', border: 'none', color: 'var(--texto-fraco)', cursor: 'pointer', fontSize: 12 }}>remover</button>}
              </li>
            ))}
          </ul>
        )}
        {ehGestao && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', borderTop: '1px solid var(--borda)', paddingTop: 14, flexWrap: 'wrap' }}>
            <div><label style={rotulo}>Data</label><input className="brk-input" type="date" value={ferData} onChange={(e) => setFerData(e.target.value)} /></div>
            <div style={{ flex: 1, minWidth: 160 }}><label style={rotulo}>Descrição</label><input className="brk-input" style={{ width: '100%' }} value={ferTitulo} onChange={(e) => setFerTitulo(e.target.value)} placeholder="Feriado municipal" /></div>
            <BotaoPrimario onClick={addFeriado} disabled={!ferData || !ferTitulo.trim()}>Cadastrar</BotaoPrimario>
          </div>
        )}
      </Card>

      {/* Home office */}
      <Card>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Home office</h3>
        {hojeHO.length > 0 && (
          <p style={{ fontSize: 12.5, color: 'var(--texto-suave)', marginBottom: 10 }}>Hoje em home office: {hojeHO.join(', ')}</p>
        )}
        <p style={{ fontSize: 12.5, color: 'var(--texto-fraco)', marginBottom: 8 }}>Meus próximos dias de home office:</p>
        {meusHO.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--texto-fraco)' }}>Nenhum dia marcado.</p>
        ) : (
          <ul style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {meusHO.map((d) => (
              <li key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 999, background: 'var(--superficie-2)', fontSize: 12.5 }}>
                {dataBR(d.data)}
                <button type="button" onClick={() => desmarcarHO(d.id)} style={{ background: 'none', border: 'none', color: 'var(--texto-fraco)', cursor: 'pointer' }}>×</button>
              </li>
            ))}
          </ul>
        )}
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <div><label style={rotulo}>Marcar dia</label><input className="brk-input" type="date" value={hoData} onChange={(e) => setHoData(e.target.value)} /></div>
          <BotaoPrimario onClick={marcarHO} disabled={!hoData}>Marcar home office</BotaoPrimario>
        </div>
      </Card>
    </PaginaShell>
  );
}
