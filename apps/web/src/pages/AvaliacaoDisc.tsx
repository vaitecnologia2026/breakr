import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../lib/api';
import { DiscRadar, type SerieRadar } from '../components/DiscRadar';

/**
 * Página PÚBLICA de candidatura + teste DISC (modelo ipsativo Most/Least).
 *  GET  /disc/vagas
 *  GET  /disc/teste
 *  POST /disc/candidatura { vagaId, nome, email?, telefone?, curriculoUrl?,
 *        respostas: [{ perguntaId, maisIndice, menosIndice }] }
 */

interface Vaga { id: string; titulo: string; departamento: string | null }
interface OpcaoPub { indice: number; texto: string }
interface PerguntaPub { id: string; enunciado: string | null; opcoes: OpcaoPub[] }
interface InterpretacaoDisc { titulo: string; descricao: string; pontosFortes: string; desafios: string }
type Placar4 = { D: number; I: number; S: number; C: number };
interface GraficosDisc { adaptado: Placar4; natural: Placar4; combinado: Placar4 }
type Anomalia = 'OVERSHIFT' | 'UNDERSHIFT' | 'COMPRIMIDO' | null;
interface RespostaCandidatura {
  ok: boolean;
  candidatoId: string;
  perfil: string;
  primario: string | null;
  secundario: string | null;
  interpretacao: InterpretacaoDisc | null;
  graficos?: GraficosDisc;
  percentis?: Placar4;
  anomalia?: Anomalia;
}

// Marcação Most/Least de um bloco.
interface RespBloco { mais?: number; menos?: number }

const campo: React.CSSProperties = {
  width: '100%', background: 'var(--superficie-2)', border: '1px solid var(--borda-forte)',
  borderRadius: 10, padding: '11px 13px', color: 'var(--texto)', fontSize: 14, outline: 'none',
};
const rotulo: React.CSSProperties = { fontSize: 12.5, fontWeight: 600, color: 'var(--texto-suave)', marginBottom: 4, display: 'block' };

const DIMS: (keyof Placar4)[] = ['D', 'I', 'S', 'C'];
const ANOMALIA_TXT: Record<Exclude<Anomalia, null>, string> = {
  OVERSHIFT: 'Sobreposição — todos os fatores acima da média; respostas possivelmente superestimadas.',
  UNDERSHIFT: 'Sub-representação — nenhum estilo comportamental predominante claro.',
  COMPRIMIDO: 'Padrão comprimido — respostas muito neutras/cautelosas, sem picos definidos.',
};

export function AvaliacaoDisc() {
  const [vagas, setVagas] = useState<Vaga[]>([]);
  const [perguntas, setPerguntas] = useState<PerguntaPub[]>([]);
  const [vagaId, setVagaId] = useState('');
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [curriculoUrl, setCurriculoUrl] = useState('');
  const [respostas, setRespostas] = useState<Record<string, RespBloco>>({});
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [resultado, setResultado] = useState<RespostaCandidatura | null>(null);

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

  function marcar(pid: string, coluna: 'mais' | 'menos', indice: number) {
    setRespostas((prev) => {
      const atual: RespBloco = { ...prev[pid] };
      atual[coluna] = indice;
      // A mesma opção não pode ser Mais e Menos ao mesmo tempo.
      const outra = coluna === 'mais' ? 'menos' : 'mais';
      if (atual[outra] === indice) atual[outra] = undefined;
      return { ...prev, [pid]: atual };
    });
  }

  const blocoOk = (pid: string) => {
    const r = respostas[pid];
    return !!r && r.mais !== undefined && r.menos !== undefined && r.mais !== r.menos;
  };
  const todasRespondidas = perguntas.length > 0 && perguntas.every((p) => blocoOk(p.id));
  const valido = vagaId !== '' && nome.trim().length >= 2 && todasRespondidas;

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!valido || enviando) return;
    setEnviando(true);
    setErro(null);
    try {
      const { data } = await api.post<RespostaCandidatura>('/disc/candidatura', {
        vagaId,
        nome: nome.trim(),
        email: email.trim() || undefined,
        telefone: telefone.trim() || undefined,
        curriculoUrl: curriculoUrl.trim() || undefined,
        respostas: perguntas.map((p) => ({
          perguntaId: p.id,
          maisIndice: respostas[p.id].mais,
          menosIndice: respostas[p.id].menos,
        })),
      });
      setResultado(data);
      setOk(true);
    } catch {
      setErro('Falha ao enviar a candidatura. Tente novamente.');
      setEnviando(false);
    }
  }

  // Séries do radar (0..100): Percentil (G3), Máscara (G1) e Essência (G2)
  // normalizadas pelo total de blocos. Atrito = maior gap entre Máscara e Essência.
  const totalBlocos = perguntas.length || 1;
  const series: SerieRadar[] = [];
  let atrito = 0;
  if (resultado?.percentis && resultado.graficos) {
    const mask: Placar4 = { D: 0, I: 0, S: 0, C: 0 };
    const ess: Placar4 = { D: 0, I: 0, S: 0, C: 0 };
    for (const d of DIMS) {
      mask[d] = Math.round((resultado.graficos.adaptado[d] / totalBlocos) * 100);
      ess[d] = Math.round((resultado.graficos.natural[d] / totalBlocos) * 100);
      atrito = Math.max(atrito, Math.abs(mask[d] - ess[d]));
    }
    series.push({ nome: 'Percentil', cor: '#8b5cf6', valores: resultado.percentis });
    series.push({ nome: 'Máscara (adaptado)', cor: '#3b82f6', valores: mask });
    series.push({ nome: 'Essência (natural)', cor: '#67e0a3', valores: ess });
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="brk-card" style={{ padding: 24, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: '#67e0a3' }}>Candidatura enviada! ✅</span>
              <span style={{ fontSize: 14, color: 'var(--texto-suave)' }}>Recebemos seu currículo e seu perfil. Boa sorte!</span>
            </div>

            {series.length > 0 && resultado?.percentis && (
              <div className="brk-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--texto-fraco)', textTransform: 'uppercase', letterSpacing: 0.4 }}>Gráficos DISC</span>
                <DiscRadar series={series} />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {DIMS.map((d) => (
                    <div key={d} style={{ textAlign: 'center', background: 'var(--superficie-2)', borderRadius: 10, padding: '8px 4px' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--texto-suave)' }}>{d}</div>
                      <div style={{ fontSize: 18, fontWeight: 800 }} className="brk-gradient-text">{resultado.percentis![d]}</div>
                      <div style={{ fontSize: 10, color: 'var(--texto-fraco)' }}>percentil</div>
                    </div>
                  ))}
                </div>
                {atrito > 25 && (
                  <div role="status" style={{ fontSize: 12.5, color: '#f59e0b', background: 'rgba(245,158,11,0.1)', borderRadius: 8, padding: '8px 10px' }}>
                    ⚠️ Distância relevante entre Máscara e Essência ({atrito} pts) — indica esforço de adaptação.
                  </div>
                )}
                {resultado.anomalia && (
                  <div role="status" style={{ fontSize: 12.5, color: '#f59e0b', background: 'rgba(245,158,11,0.1)', borderRadius: 8, padding: '8px 10px' }}>
                    ⚠️ {ANOMALIA_TXT[resultado.anomalia]}
                  </div>
                )}
              </div>
            )}

            {resultado?.interpretacao && (
              <div className="brk-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--texto-fraco)', textTransform: 'uppercase', letterSpacing: 0.4 }}>Seu perfil comportamental</span>
                  <h2 className="brk-gradient-text" style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>{resultado.interpretacao.titulo}</h2>
                </div>
                <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--texto-suave)' }}>{resultado.interpretacao.descricao}</p>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#67e0a3' }}>Pontos fortes</span>
                  <p style={{ fontSize: 13.5, lineHeight: 1.55, color: 'var(--texto-suave)', marginTop: 2 }}>{resultado.interpretacao.pontosFortes}</p>
                </div>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--texto)' }}>Pontos de atenção</span>
                  <p style={{ fontSize: 13.5, lineHeight: 1.55, color: 'var(--texto-suave)', marginTop: 2 }}>{resultado.interpretacao.desafios}</p>
                </div>
              </div>
            )}
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
                {perguntas.length} blocos — em cada um, marque a opção que <strong>MAIS</strong> e a que <strong>MENOS</strong> combinam com você.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                {perguntas.map((p, idx) => (
                  <div key={p.id}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 8 }}>{idx + 1}. {p.enunciado ?? 'Marque a opção que mais e a que menos combinam com você'}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '40px 40px 1fr', gap: 6, alignItems: 'center' }}>
                      <span style={{ fontSize: 10.5, fontWeight: 700, color: '#67e0a3', textAlign: 'center' }}>MAIS</span>
                      <span style={{ fontSize: 10.5, fontWeight: 700, color: '#f87171', textAlign: 'center' }}>MENOS</span>
                      <span />
                      {p.opcoes.map((o) => {
                        const r = respostas[p.id] ?? {};
                        return (
                          <div key={o.indice} style={{ display: 'contents' }}>
                            <span style={{ textAlign: 'center' }}>
                              <input type="radio" name={`mais-${p.id}`} checked={r.mais === o.indice}
                                disabled={r.menos === o.indice}
                                onChange={() => marcar(p.id, 'mais', o.indice)} aria-label={`Mais: ${o.texto}`} />
                            </span>
                            <span style={{ textAlign: 'center' }}>
                              <input type="radio" name={`menos-${p.id}`} checked={r.menos === o.indice}
                                disabled={r.mais === o.indice}
                                onChange={() => marcar(p.id, 'menos', o.indice)} aria-label={`Menos: ${o.texto}`} />
                            </span>
                            <span style={{ fontSize: 13.5, color: 'var(--texto-suave)', padding: '4px 0' }}>{o.texto}</span>
                          </div>
                        );
                      })}
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
