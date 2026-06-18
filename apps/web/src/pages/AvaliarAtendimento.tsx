import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';

/**
 * Página pública de avaliação do atendimento (CSAT).
 * O cliente acessa via link enviado após a resolução do atendimento.
 *  GET  /atendimento/avaliacao/:id
 *  POST /atendimento/avaliacao/:id { nota, comentario }
 */
interface Dados { cliente: string | null; jaAvaliado: boolean; nota: number | null }

export function AvaliarAtendimento() {
  const { id } = useParams<{ id: string }>();
  const [dados, setDados] = useState<Dados | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);
  const [nota, setNota] = useState(0);
  const [hover, setHover] = useState(0);
  const [comentario, setComentario] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  useEffect(() => {
    api.get<Dados>(`/atendimento/avaliacao/${id}`)
      .then(({ data }) => { setDados(data); if (data.jaAvaliado) setEnviado(true); })
      .catch(() => setErro(true))
      .finally(() => setCarregando(false));
  }, [id]);

  async function enviar() {
    if (!nota || enviando) return;
    setEnviando(true);
    try {
      await api.post(`/atendimento/avaliacao/${id}`, { nota, comentario: comentario.trim() || undefined });
      setEnviado(true);
    } catch { setErro(true); }
    finally { setEnviando(false); }
  }

  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--preto-fumaca)', padding: 24 }}>
      <div style={{ width: 'min(440px, 100%)', background: 'var(--superficie)', border: '1px solid var(--borda)', borderRadius: 14, padding: 28, textAlign: 'center' }}>
        {carregando ? (
          <p style={{ color: 'var(--texto-fraco)' }}>Carregando…</p>
        ) : erro ? (
          <p style={{ color: 'var(--texto-suave)' }}>Não foi possível carregar esta avaliação.</p>
        ) : enviado ? (
          <>
            <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
            <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>Obrigado pela avaliação!</h1>
            <p style={{ fontSize: 14, color: 'var(--texto-fraco)' }}>Sua opinião ajuda a melhorar nosso atendimento.</p>
          </>
        ) : (
          <>
            <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>Como foi seu atendimento?</h1>
            <p style={{ fontSize: 13.5, color: 'var(--texto-fraco)', marginBottom: 20 }}>
              {dados?.cliente ? `${dados.cliente}, sua` : 'Sua'} avaliação é muito importante para nós.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 20 }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setNota(n)}
                  onMouseEnter={() => setHover(n)}
                  onMouseLeave={() => setHover(0)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 34, lineHeight: 1, color: (hover || nota) >= n ? '#f5b301' : 'var(--borda-forte)' }}
                  aria-label={`${n} estrela${n > 1 ? 's' : ''}`}
                >
                  ★
                </button>
              ))}
            </div>
            <textarea
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              placeholder="Quer deixar um comentário? (opcional)"
              rows={3}
              style={{ width: '100%', background: 'var(--superficie-2)', border: '1px solid var(--borda)', borderRadius: 8, padding: 10, color: 'var(--texto)', fontFamily: 'inherit', fontSize: 13.5, resize: 'vertical', marginBottom: 16 }}
            />
            <button
              type="button"
              onClick={enviar}
              disabled={!nota || enviando}
              style={{ width: '100%', padding: '11px', borderRadius: 8, border: 'none', background: nota ? 'var(--gradiente-brasa)' : 'var(--superficie-3)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: nota ? 'pointer' : 'not-allowed' }}
            >
              {enviando ? 'Enviando…' : 'Enviar avaliação'}
            </button>
          </>
        )}
      </div>
    </main>
  );
}
