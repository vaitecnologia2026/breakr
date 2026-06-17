import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../lib/api';

/**
 * Página PÚBLICA de candidatura + teste DISC.
 *  GET  /disc/vagas
 *  GET  /disc/teste
 *  POST /disc/candidatura { vagaId, nome, email?, telefone?, curriculoUrl?, respostas: [{ perguntaId, opcaoIndice }] }
 */

interface Vaga { id: string; titulo: string; departamento: string | null }
interface OpcaoPub { indice: number; texto: string }
interface PerguntaPub { id: string; enunciado: string | null; opcoes: OpcaoPub[] }

const campo: React.CSSProperties = {
  width: '100%', background: 'var(--superficie-2)', border: '1px solid var(--borda-forte)',
  borderRadius: 10, padding: '11px 13px', color: 'var(--texto)', fontSize: 14, outline: 'none',
};
const rotulo: React.CSSProperties = { fontSize: 12.5, fontWeight: 600, color: 'var(--texto-suave)', marginBottom: 4, display: 'block' };

export function AvaliacaoDisc() {
  const [vagas, setVagas] = useState<Vaga[]>([]);
  const [perguntas, setPerguntas] = useState<PerguntaPub[]>([]);
  const [vagaId, setVagaId] = useState('');
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [curriculoUrl, setCurriculoUrl] = useState('');
  const [respostas, setRespostas] = useState<Record<string, number>>({});
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    let ativo = true;
    (async () => {
      try {
        const [v, p] = await Promise.all([
          api.get<Vaga[]>('/disc/vagas'),
          api.get<PerguntaPub[]>('/disc/teste'),
        ]);
        if (!ativo) return;
        setVagas(v.data);
        if (v.data.length > 0) setVagaId(v.data[0].id);
        setPerguntas(p.data);
      } catch {
        if (ativo) setErro('Não foi possível carregar a avaliação.');
      }
    })();
    return () => { ativo = false; };
  }, []);

  const todasRespondidas = perguntas.length > 0 && perguntas.every((p) => respostas[p.id] !== undefined);
  const valido = vagaId !== '' && nome.trim().length >= 2 && todasRespondidas;

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!valido || enviando) return;
    setEnviando(true);
    setErro(null);
    try {
      await api.post('/disc/candidatura', {
        vagaId,
        nome: nome.trim(),
        email: email.trim() || undefined,
        telefone: telefone.trim() || undefined,
        curriculoUrl: curriculoUrl.trim() || undefined,
        respostas: perguntas.map((p) => ({ perguntaId: p.id, opcaoIndice: respostas[p.id] })),
      });
      setOk(true);
    } catch {
      setErro('Falha ao enviar a candidatura. Tente novamente.');
      setEnviando(false);
    }
  }

  return (
    <main style={{ minHeight: '100vh', background: 'var(--preto-fumaca)', padding: '48px 20px' }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>
          Candidatura <span className="brk-gradient-text">Breakr</span>
        </h1>
        <p style={{ fontSize: 14, color: 'var(--texto-fraco)', marginBottom: 24 }}>
          Preencha seus dados e responda à avaliação de perfil comportamental.
        </p>

        {ok ? (
          <div className="brk-card" style={{ padding: 24, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: '#67e0a3' }}>Candidatura enviada! ✅</span>
            <span style={{ fontSize: 14, color: 'var(--texto-suave)' }}>Recebemos seu currículo e seu perfil. Boa sorte!</span>
          </div>
        ) : (
          <form onSubmit={enviar} className="brk-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={rotulo}>Vaga *</label>
              <select style={campo} value={vagaId} onChange={(e) => setVagaId(e.target.value)}>
                {vagas.length === 0 && <option value="">Nenhuma vaga aberta</option>}
                {vagas.map((v) => <option key={v.id} value={v.id}>{v.titulo}{v.departamento ? ` — ${v.departamento}` : ''}</option>)}
              </select>
            </div>
            <div><label style={rotulo}>Nome *</label><input style={campo} value={nome} onChange={(e) => setNome(e.target.value)} /></div>
            <div><label style={rotulo}>E-mail</label><input style={campo} type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <div><label style={rotulo}>Telefone</label><input style={campo} value={telefone} onChange={(e) => setTelefone(e.target.value)} /></div>
            <div><label style={rotulo}>Link do currículo</label><input style={campo} value={curriculoUrl} onChange={(e) => setCurriculoUrl(e.target.value)} placeholder="https://... (Drive, LinkedIn)" /></div>

            <div style={{ borderTop: '1px solid var(--borda)', paddingTop: 14 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Avaliação de perfil</h2>
              <p style={{ fontSize: 12.5, color: 'var(--texto-fraco)', marginBottom: 12 }}>
                {perguntas.length} perguntas — escolha a opção com que mais se identifica.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {perguntas.map((p, idx) => (
                  <div key={p.id}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 6 }}>{idx + 1}. {p.enunciado ?? 'Escolha a opção com que mais se identifica'}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {p.opcoes.map((o) => (
                        <label key={o.indice} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, color: 'var(--texto-suave)', cursor: 'pointer', padding: '6px 10px', borderRadius: 8, background: respostas[p.id] === o.indice ? 'var(--superficie-3)' : 'transparent' }}>
                          <input type="radio" name={`p-${p.id}`} checked={respostas[p.id] === o.indice} onChange={() => setRespostas((prev) => ({ ...prev, [p.id]: o.indice }))} />
                          {o.texto}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {erro && <div role="status" style={{ fontSize: 13, color: 'var(--vermelho)' }}>{erro}</div>}

            <button type="submit" disabled={!valido || enviando} className="brk-gradient-bg" style={{ marginTop: 4, padding: '12px 16px', borderRadius: 12, border: 'none', fontSize: 15, fontWeight: 700, color: '#fff', cursor: !valido || enviando ? 'default' : 'pointer', opacity: !valido || enviando ? 0.6 : 1 }}>
              {enviando ? 'Enviando…' : 'Enviar candidatura'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
