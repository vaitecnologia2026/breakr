// NPS de cliente (Sucesso do Cliente, req. l.196-198, 544-547). Registra a nota
// (0..10) com comentario, mostra o historico e o resumo por squad. Nota de
// detrator (<= 6) marca crise e notifica o CS (tratado no backend).
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { PaginaHeader, Btn, Carregando, Alerta } from '../components/ui';

interface Registro {
  id: string;
  nota: number;
  comentario: string | null;
  crise: boolean;
  criadoEm: string;
  cliente?: { nomeFantasia: string } | null;
}
interface ResumoSquad { squad: string; media: number; total: number; detratores: number }
interface ClienteOpt { id: string; nomeFantasia: string }

const corNota = (n: number) => (n >= 9 ? '#10b981' : n >= 7 ? '#f59e0b' : '#ef4444');

export function NpsCliente() {
  const [historico, setHistorico] = useState<Registro[]>([]);
  const [resumo, setResumo] = useState<ResumoSquad[]>([]);
  const [clientes, setClientes] = useState<ClienteOpt[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [clienteId, setClienteId] = useState('');
  const [nota, setNota] = useState('9');
  const [comentario, setComentario] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [feedback, setFeedback] = useState<{ tipo: 'sucesso' | 'erro'; msg: string } | null>(null);

  async function carregar() {
    setCarregando(true);
    setErro(null);
    try {
      const [h, r, c] = await Promise.all([
        api.get<Registro[]>('/nps-cliente'),
        api.get<ResumoSquad[]>('/nps-cliente/resumo'),
        api.get<ClienteOpt[]>('/clientes'),
      ]);
      setHistorico(h.data);
      setResumo(r.data);
      setClientes(c.data);
    } catch (e: unknown) {
      // Mostra o motivo real (ex.: 403 sem permissão) em vez de um texto genérico.
      const resp = (e as { response?: { status?: number; data?: { message?: string | string[] } } })?.response;
      const msg = Array.isArray(resp?.data?.message) ? resp?.data?.message.join(' ') : resp?.data?.message;
      setErro(
        resp?.status === 403
          ? 'Sem permissão para ver o NPS (disponível para CS, Admin e Super Admin).'
          : msg
            ? `Não foi possível carregar o NPS: ${msg}`
            : 'Não foi possível carregar o NPS.',
      );
    } finally {
      setCarregando(false);
    }
  }
  useEffect(() => {
    carregar();
  }, []);

  async function registrar() {
    const n = Number(nota);
    if (!clienteId || !Number.isInteger(n) || n < 0 || n > 10 || salvando) return;
    setSalvando(true);
    setFeedback(null);
    try {
      await api.post('/nps-cliente', { clienteId, nota: n, comentario: comentario.trim() || undefined });
      setComentario('');
      setClienteId('');
      setFeedback({ tipo: 'sucesso', msg: 'NPS registrado.' });
      await carregar();
    } catch {
      setFeedback({ tipo: 'erro', msg: 'Erro ao registrar o NPS.' });
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) return <Carregando />;

  return (
    <>
      <PaginaHeader
        titulo="NPS de cliente"
        subtitulo="Histórico de NPS por cliente — nota de detrator (≤ 6) abre gestão de crise para o CS"
      />

      {erro && <Alerta tipo="erro">{erro}</Alerta>}
      {feedback && <Alerta tipo={feedback.tipo}>{feedback.msg}</Alerta>}

      {/* Registrar NPS */}
      <section className="brk-card brk-card-p" style={{ marginBottom: 18 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Registrar NPS</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <select
            className="brk-input"
            value={clienteId}
            onChange={(e) => setClienteId(e.target.value)}
            style={{ flex: '1 1 200px' }}
          >
            <option value="" disabled>
              {clientes.length === 0 ? 'Nenhum cliente' : 'Selecione o cliente'}
            </option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nomeFantasia}
              </option>
            ))}
          </select>
          <select
            className="brk-input"
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            style={{ flex: '0 1 90px' }}
          >
            {Array.from({ length: 11 }, (_, i) => (
              <option key={i} value={String(i)}>
                {i}
              </option>
            ))}
          </select>
          <input
            className="brk-input"
            placeholder="Comentário (opcional)"
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            style={{ flex: '2 1 240px' }}
          />
          <Btn onClick={registrar} disabled={!clienteId || salvando}>
            {salvando ? 'Salvando…' : 'Registrar'}
          </Btn>
        </div>
      </section>

      {/* Resumo por squad */}
      {resumo.length > 0 && (
        <section style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 18 }}>
          {resumo.map((s) => (
            <div key={s.squad} className="brk-card brk-card-p" style={{ flex: '1 1 160px' }}>
              <div style={{ fontSize: 12.5, color: 'var(--texto-fraco)' }}>{s.squad}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: corNota(s.media) }}>{s.media}</div>
              <div style={{ fontSize: 12, color: 'var(--texto-fraco)' }}>
                {s.total} resposta{s.total !== 1 ? 's' : ''} · {s.detratores} detratores
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Histórico */}
      {historico.length === 0 ? (
        <div className="brk-card brk-card-p">
          <p style={{ fontSize: 13, color: 'var(--texto-fraco)' }}>Nenhum NPS registrado ainda.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {historico.map((r) => (
            <div key={r.id} className="brk-card brk-card-p">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <span
                  style={{
                    fontSize: 16,
                    fontWeight: 800,
                    color: corNota(r.nota),
                    minWidth: 28,
                    textAlign: 'center',
                  }}
                >
                  {r.nota}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700 }}>
                    {r.cliente?.nomeFantasia ?? 'Cliente'}
                    {r.crise && (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: '#ef4444',
                          border: '1px solid #ef4444',
                          borderRadius: 999,
                          padding: '1px 7px',
                          marginLeft: 8,
                        }}
                      >
                        crise
                      </span>
                    )}
                  </div>
                  {r.comentario && (
                    <div style={{ fontSize: 12.5, color: 'var(--texto-suave)' }}>{r.comentario}</div>
                  )}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--texto-fraco)' }}>
                  {new Date(r.criadoEm).toLocaleDateString('pt-BR')}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
