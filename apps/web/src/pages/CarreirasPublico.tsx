import { useEffect, useState, type FormEvent } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { api } from '../lib/api';

/**
 * Página de Carreiras PÚBLICA (inspirada no InHire) — sem login, sem criar conta.
 *  GET  /carreiras/vagas → Vaga[]
 *  GET  /carreiras/vagas/:codigo → Vaga
 *  POST /carreiras/vagas/:codigo/candidatar { nome, email?, telefone?, curriculoUrl?, mensagem?, indicadoPor? }
 *
 * Duas visões na mesma página:
 *  - /carreiras           → lista de vagas abertas
 *  - /carreiras/:codigo   → detalhe + formulário de candidatura (aceita ?ref= p/ indicação)
 */

interface VagaPub {
  codigoUnico: string;
  titulo: string;
  departamento: string | null;
  descricao: string | null;
}

const campo: React.CSSProperties = {
  width: '100%', background: 'var(--superficie-2)', border: '1px solid var(--borda-forte)',
  borderRadius: 10, padding: '11px 13px', color: 'var(--texto)', fontSize: 14, outline: 'none',
};
const rotulo: React.CSSProperties = {
  fontSize: 12.5, fontWeight: 600, color: 'var(--texto-suave)', marginBottom: 4, display: 'block',
};

export function CarreirasPublico() {
  const { codigo } = useParams<{ codigo?: string }>();
  return (
    <main style={{ minHeight: '100vh', background: 'var(--preto-fumaca)', padding: '48px 20px' }}>
      <div style={{ maxWidth: 620, margin: '0 auto' }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>
          Trabalhe na <span className="brk-gradient-text">Breakr</span>
        </h1>
        <p style={{ fontSize: 14, color: 'var(--texto-fraco)', marginBottom: 24 }}>
          {codigo
            ? 'Candidate-se em menos de 3 minutos — sem criar conta.'
            : 'Confira nossas vagas abertas e candidate-se sem burocracia.'}
        </p>
        {codigo ? <DetalheVaga codigo={codigo} /> : <ListaVagas />}
      </div>
    </main>
  );
}

/* ------------------------------ Lista ------------------------------ */
function ListaVagas() {
  const [vagas, setVagas] = useState<VagaPub[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    (async () => {
      try {
        const { data } = await api.get<VagaPub[]>('/carreiras/vagas');
        if (ativo) setVagas(data);
      } catch {
        if (ativo) setErro('Não foi possível carregar as vagas agora.');
      } finally {
        if (ativo) setCarregando(false);
      }
    })();
    return () => { ativo = false; };
  }, []);

  if (carregando) return <p style={{ color: 'var(--texto-fraco)' }}>Carregando vagas…</p>;
  if (erro) return <div className="brk-card" style={{ padding: 20 }}>{erro}</div>;
  if (vagas.length === 0)
    return (
      <div className="brk-card" style={{ padding: 24, textAlign: 'center' }}>
        <p style={{ fontSize: 15, fontWeight: 600 }}>Nenhuma vaga aberta no momento.</p>
        <p style={{ fontSize: 13, color: 'var(--texto-fraco)', marginTop: 4 }}>
          Volte em breve — novas oportunidades são publicadas com frequência.
        </p>
      </div>
    );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {vagas.map((v) => (
        <Link
          key={v.codigoUnico}
          to={`/carreiras/${v.codigoUnico}`}
          className="brk-card"
          style={{ padding: 18, textDecoration: 'none', color: 'inherit', display: 'block' }}
        >
          <div style={{ fontSize: 16, fontWeight: 700 }}>{v.titulo}</div>
          {v.departamento && (
            <div style={{ fontSize: 13, color: 'var(--texto-fraco)', marginTop: 2 }}>{v.departamento}</div>
          )}
          {v.descricao && (
            <div style={{ fontSize: 13, color: 'var(--texto-suave)', marginTop: 8, lineHeight: 1.5 }}>
              {v.descricao.length > 160 ? `${v.descricao.slice(0, 160)}…` : v.descricao}
            </div>
          )}
          <span className="brk-gradient-text" style={{ fontSize: 13, fontWeight: 700, display: 'inline-block', marginTop: 10 }}>
            Ver vaga e candidatar-se →
          </span>
        </Link>
      ))}
    </div>
  );
}

/* ------------------------------ Detalhe + form ------------------------------ */
function DetalheVaga({ codigo }: { codigo: string }) {
  const [params] = useSearchParams();
  const refIndicacao = params.get('ref') ?? '';

  const [vaga, setVaga] = useState<VagaPub | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erroCarga, setErroCarga] = useState<string | null>(null);

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [curriculoUrl, setCurriculoUrl] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [indicadoPor, setIndicadoPor] = useState(refIndicacao);

  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    let ativo = true;
    (async () => {
      try {
        const { data } = await api.get<VagaPub>(`/carreiras/vagas/${codigo}`);
        if (ativo) setVaga(data);
      } catch {
        if (ativo) setErroCarga('Vaga não encontrada ou já encerrada.');
      } finally {
        if (ativo) setCarregando(false);
      }
    })();
    return () => { ativo = false; };
  }, [codigo]);

  const valido = nome.trim().length >= 2;

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!valido || enviando) return;
    setEnviando(true);
    setErro(null);
    try {
      await api.post(`/carreiras/vagas/${codigo}/candidatar`, {
        nome: nome.trim(),
        email: email.trim() || undefined,
        telefone: telefone.trim() || undefined,
        curriculoUrl: curriculoUrl.trim() || undefined,
        mensagem: mensagem.trim() || undefined,
        indicadoPor: indicadoPor.trim() || undefined,
      });
      setOk(true);
    } catch {
      setErro('Falha ao enviar a candidatura. Verifique os dados e tente novamente.');
      setEnviando(false);
    }
  }

  if (carregando) return <p style={{ color: 'var(--texto-fraco)' }}>Carregando vaga…</p>;
  if (erroCarga)
    return (
      <div className="brk-card" style={{ padding: 24, textAlign: 'center' }}>
        <p style={{ fontSize: 15, fontWeight: 600 }}>{erroCarga}</p>
        <Link to="/carreiras" className="brk-gradient-text" style={{ fontSize: 13, fontWeight: 700, display: 'inline-block', marginTop: 10 }}>
          ← Ver todas as vagas
        </Link>
      </div>
    );

  if (ok)
    return (
      <div className="brk-card" style={{ padding: 24, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span style={{ fontSize: 18, fontWeight: 700, color: '#67e0a3' }}>Candidatura enviada! ✅</span>
        <span style={{ fontSize: 14, color: 'var(--texto-suave)' }}>
          Recebemos sua candidatura para <strong>{vaga?.titulo}</strong>. Boa sorte!
        </span>
        <Link to="/carreiras" className="brk-gradient-text" style={{ fontSize: 13, fontWeight: 700, marginTop: 6 }}>
          ← Ver outras vagas
        </Link>
      </div>
    );

  return (
    <>
      <Link to="/carreiras" style={{ fontSize: 13, color: 'var(--texto-fraco)', textDecoration: 'none' }}>
        ← Todas as vagas
      </Link>
      {vaga && (
        <div className="brk-card" style={{ padding: 20, margin: '12px 0 20px' }}>
          <div style={{ fontSize: 19, fontWeight: 800 }}>{vaga.titulo}</div>
          {vaga.departamento && (
            <div style={{ fontSize: 13, color: 'var(--texto-fraco)', marginTop: 2 }}>{vaga.departamento}</div>
          )}
          {vaga.descricao && (
            <p style={{ fontSize: 14, color: 'var(--texto-suave)', marginTop: 12, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {vaga.descricao}
            </p>
          )}
        </div>
      )}

      <form onSubmit={enviar} className="brk-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700 }}>Candidatar-se</h2>

        <div>
          <label style={rotulo}>Nome *</label>
          <input style={campo} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome completo" autoFocus />
        </div>
        <div>
          <label style={rotulo}>E-mail</label>
          <input style={campo} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" />
        </div>
        <div>
          <label style={rotulo}>Telefone</label>
          <input style={campo} value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(00) 00000-0000" />
        </div>
        <div>
          <label style={rotulo}>Link do currículo (LinkedIn, PDF…)</label>
          <input style={campo} value={curriculoUrl} onChange={(e) => setCurriculoUrl(e.target.value)} placeholder="https://…" />
        </div>
        <div>
          <label style={rotulo}>Indicado por (e-mail do colaborador)</label>
          <input style={campo} value={indicadoPor} onChange={(e) => setIndicadoPor(e.target.value)} placeholder="opcional — se alguém te indicou" />
        </div>
        <div>
          <label style={rotulo}>Mensagem</label>
          <textarea style={{ ...campo, minHeight: 90, resize: 'vertical' }} value={mensagem} onChange={(e) => setMensagem(e.target.value)} placeholder="Conte por que você é ideal para a vaga (opcional)" />
        </div>

        {erro && <div style={{ fontSize: 13, color: '#ff8484' }}>{erro}</div>}

        <button
          type="submit"
          disabled={!valido || enviando}
          className="brk-btn brk-btn-primary"
          style={{ opacity: !valido || enviando ? 0.6 : 1, cursor: !valido || enviando ? 'not-allowed' : 'pointer' }}
        >
          {enviando ? 'Enviando…' : 'Enviar candidatura'}
        </button>
      </form>
    </>
  );
}
