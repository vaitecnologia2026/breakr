import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../lib/api';

/**
 * Página PÚBLICA de agendamento com um colaborador (booking).
 *  GET  /agendar/colaboradores
 *  GET  /agendar/:id/slots
 *  POST /agendar/:id { nome, email?, telefone?, assunto?, inicio }
 */

interface Colaborador { id: string; nome: string; cargo: string }

const campo: React.CSSProperties = {
  width: '100%', background: 'var(--superficie-2)', border: '1px solid var(--borda-forte)',
  borderRadius: 10, padding: '11px 13px', color: 'var(--texto)', fontSize: 14, outline: 'none',
};
const rotulo: React.CSSProperties = { fontSize: 12.5, fontWeight: 600, color: 'var(--texto-suave)', marginBottom: 4, display: 'block' };

export function AgendarPublico() {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [colaboradorId, setColaboradorId] = useState('');
  const [slots, setSlots] = useState<string[]>([]);
  const [slot, setSlot] = useState('');
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [assunto, setAssunto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    api.get<Colaborador[]>('/agendar/colaboradores').then(({ data }) => setColaboradores(data)).catch(() => setErro('Falha ao carregar.'));
  }, []);

  useEffect(() => {
    setSlot('');
    if (!colaboradorId) { setSlots([]); return; }
    api.get<string[]>(`/agendar/${colaboradorId}/slots`).then(({ data }) => setSlots(data)).catch(() => setSlots([]));
  }, [colaboradorId]);

  // Agrupa slots por dia.
  const porDia = slots.reduce<Record<string, string[]>>((acc, iso) => {
    const dia = new Date(iso).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
    (acc[dia] ??= []).push(iso);
    return acc;
  }, {});

  const valido = colaboradorId && slot && nome.trim().length >= 2;

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!valido || enviando) return;
    setEnviando(true); setErro(null);
    try {
      await api.post(`/agendar/${colaboradorId}`, {
        nome: nome.trim(), email: email.trim() || undefined, telefone: telefone.trim() || undefined,
        assunto: assunto.trim() || undefined, inicio: slot,
      });
      setOk(true);
    } catch (err) {
      setErro((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Falha ao agendar.');
      setEnviando(false);
    }
  }

  return (
    <main style={{ minHeight: '100vh', background: 'var(--preto-fumaca)', padding: '48px 20px' }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>Agendar com a <span className="brk-gradient-text">Breakr</span></h1>
        <p style={{ fontSize: 14, color: 'var(--texto-fraco)', marginBottom: 24 }}>Escolha com quem falar e um horário disponível (mín. 24h de antecedência).</p>

        {ok ? (
          <div className="brk-card" style={{ padding: 24, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: '#67e0a3' }}>Agendado! ✅</span>
            <span style={{ fontSize: 14, color: 'var(--texto-suave)' }}>Seu horário foi reservado. Até lá!</span>
          </div>
        ) : (
          <form onSubmit={enviar} className="brk-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={rotulo}>Com quem? *</label>
              <select style={campo} value={colaboradorId} onChange={(e) => setColaboradorId(e.target.value)}>
                <option value="">Selecione…</option>
                {colaboradores.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>

            {colaboradorId && (
              <div>
                <label style={rotulo}>Horários disponíveis *</label>
                {slots.length === 0 ? (
                  <p style={{ fontSize: 13, color: 'var(--texto-fraco)' }}>Sem horários disponíveis na janela.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 280, overflowY: 'auto' }}>
                    {Object.entries(porDia).map(([dia, isos]) => (
                      <div key={dia}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--texto-suave)', textTransform: 'capitalize', marginBottom: 4 }}>{dia}</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {isos.map((iso) => {
                            const hora = new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                            return (
                              <button key={iso} type="button" onClick={() => setSlot(iso)}
                                style={{ padding: '6px 12px', borderRadius: 8, fontSize: 13, cursor: 'pointer',
                                  border: '1px solid var(--borda-forte)',
                                  background: slot === iso ? 'var(--amarelo-fagulha)' : 'var(--superficie-2)',
                                  color: slot === iso ? '#1a1a1a' : 'var(--cinza-vapor)', fontWeight: 600 }}>
                                {hora}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div><label style={rotulo}>Nome *</label><input style={campo} value={nome} onChange={(e) => setNome(e.target.value)} /></div>
            <div><label style={rotulo}>E-mail</label><input style={campo} type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <div><label style={rotulo}>Telefone</label><input style={campo} value={telefone} onChange={(e) => setTelefone(e.target.value)} /></div>
            <div><label style={rotulo}>Assunto</label><input style={campo} value={assunto} onChange={(e) => setAssunto(e.target.value)} /></div>

            {erro && <div role="status" style={{ fontSize: 13, color: 'var(--vermelho)' }}>{erro}</div>}

            <button type="submit" disabled={!valido || enviando} className="brk-gradient-bg"
              style={{ marginTop: 4, padding: '12px 16px', borderRadius: 12, border: 'none', fontSize: 15, fontWeight: 700, color: '#fff', cursor: !valido || enviando ? 'default' : 'pointer', opacity: !valido || enviando ? 0.6 : 1 }}>
              {enviando ? 'Agendando…' : 'Confirmar agendamento'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
