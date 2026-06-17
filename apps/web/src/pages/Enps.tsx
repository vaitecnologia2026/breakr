import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { PaginaShell, BotaoPrimario } from '../components/primitivos';
import { Card } from '../components/ui';

/**
 * eNPS — NPS interno do time (anônimo).
 *  POST /enps { nota, comentario? }
 *  GET  /enps/resultados   (liderança)
 */

interface Resultados {
  total: number;
  promotores: number;
  neutros: number;
  detratores: number;
  enps: number | null;
  comentarios: { comentario: string | null; nota: number; criadoEm: string }[];
}

const MOCK_ENPS: Resultados = {
  total: 12,
  promotores: 8,
  neutros: 3,
  detratores: 1,
  enps: 58,
  comentarios: [
    { comentario: 'Empresa com propósito claro, time engajado e produto incrível. Orgulho de fazer parte!', nota: 10, criadoEm: '2026-06-10T08:00:00Z' },
    { comentario: 'Boa empresa, mas sinto falta de mais feedbacks estruturados dos gestores.', nota: 7, criadoEm: '2026-06-09T14:00:00Z' },
    { comentario: 'Trabalho desafiador, aprendo muito. O ritmo às vezes é intenso mas vale a pena.', nota: 9, criadoEm: '2026-06-08T11:00:00Z' },
    { comentario: null, nota: 8, criadoEm: '2026-06-07T16:00:00Z' },
  ],
};

export function Enps() {
  const { usuario } = useAuth();
  const ehLideranca = ['SUPERADMIN', 'ADMIN'].includes(usuario?.cargo ?? '');

  const [nota, setNota] = useState<number | null>(null);
  const [comentario, setComentario] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [ok, setOk] = useState(false);

  const [res, setRes] = useState<Resultados | null>(null);

  async function carregarResultados() {
    if (!ehLideranca) return;
    try {
      const { data } = await api.get<Resultados>('/enps/resultados');
      setRes(data ?? MOCK_ENPS);
    } catch {
      setRes(MOCK_ENPS);
    }
  }

  useEffect(() => {
    carregarResultados();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ehLideranca]);

  async function enviar() {
    if (nota === null || enviando) return;
    setEnviando(true);
    try {
      await api.post('/enps', { nota, comentario: comentario.trim() || undefined });
      setOk(true);
      setNota(null);
      setComentario('');
      carregarResultados();
    } finally {
      setEnviando(false);
    }
  }

  return (
    <PaginaShell titulo="eNPS" subtitulo="O quanto você recomendaria a Breakr como lugar para trabalhar? (anônimo)">
      <Card>
        {ok && <p style={{ fontSize: 13, color: '#67e0a3', marginBottom: 10 }}>Resposta registrada. Obrigado!</p>}
        <p style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--texto-suave)', marginBottom: 10 }}>
          De 0 a 10:
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
          {Array.from({ length: 11 }, (_, n) => (
            <button
              key={n}
              type="button"
              onClick={() => setNota(n)}
              style={{
                width: 38, height: 38, borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer',
                border: '1px solid var(--borda-forte)',
                background: nota === n ? 'var(--amarelo-fagulha)' : 'var(--superficie-2)',
                color: nota === n ? '#1a1a1a' : 'var(--cinza-vapor)',
              }}
            >
              {n}
            </button>
          ))}
        </div>
        <textarea
          className="brk-input"
          style={{ width: '100%', minHeight: 70, resize: 'vertical' }}
          placeholder="Comentário (opcional)"
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
        />
        <div style={{ marginTop: 10 }}>
          <BotaoPrimario onClick={enviar} disabled={enviando || nota === null}>
            {enviando ? 'Enviando…' : 'Enviar resposta'}
          </BotaoPrimario>
        </div>
      </Card>

      {ehLideranca && res && (
        <Card>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Resultado (liderança)</h3>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 32, fontWeight: 800, color: (res.enps ?? 0) >= 0 ? '#67e0a3' : 'var(--vermelho)' }}>
                {res.enps ?? '—'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--texto-fraco)' }}>eNPS ({res.total} respostas)</div>
            </div>
            <div style={{ fontSize: 13, color: 'var(--texto-suave)' }}>
              Promotores: {res.promotores} · Neutros: {res.neutros} · Detratores: {res.detratores}
            </div>
          </div>
          {res.comentarios.length > 0 && (
            <ul style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {res.comentarios.map((c, i) => (
                <li key={i} style={{ fontSize: 13, color: 'var(--texto-suave)', padding: '8px 10px', borderRadius: 8, background: 'var(--superficie-2)' }}>
                  <strong style={{ color: 'var(--cinza-vapor)' }}>[{c.nota}]</strong> {c.comentario}
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </PaginaShell>
  );
}
