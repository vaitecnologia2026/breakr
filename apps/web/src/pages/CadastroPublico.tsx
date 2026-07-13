import { useEffect, useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { Btn } from '../components/ui';
import { CADASTRO_CAMPOS, aplicarMascara, MASCARA_MAXLEN } from '../components/NegocioDetalhe';

/**
 * Página PÚBLICA do Cadastro Completo. O vendedor gera um link no negócio
 * (modal "Cadastro Completo" → "Enviar link ao cliente") e o cliente preenche
 * os mesmos campos aqui, no lugar do vendedor. Mantém o design system atual.
 *  GET  /comercial/publico/cadastro/:token  → { empresa, dados }
 *  PUT  /comercial/publico/cadastro/:token  → salva o cadastro
 */
export function CadastroPublico() {
  const { token } = useParams<{ token: string }>();
  const [empresa, setEmpresa] = useState<string | null>(null);
  const [codigo, setCodigo] = useState<string | null>(null);
  const [cadastro, setCadastro] = useState<Record<string, string>>({});
  const [carregando, setCarregando] = useState(true);
  const [erroCarga, setErroCarga] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    let ativo = true;
    (async () => {
      setCarregando(true); setErroCarga(null);
      try {
        const { data } = await api.get<{ empresa: string | null; codigoUnico: string | null; dados: Record<string, string> }>(`/comercial/publico/cadastro/${token}`);
        if (!ativo) return;
        setEmpresa(data.empresa ?? null);
        setCodigo(data.codigoUnico ?? null);
        setCadastro(data.dados ?? {});
      } catch {
        if (ativo) setErroCarga('Link inválido ou expirado. Solicite um novo link ao seu contato.');
      } finally {
        if (ativo) setCarregando(false);
      }
    })();
    return () => { ativo = false; };
  }, [token]);

  const faltando = CADASTRO_CAMPOS.filter((c) => c.rotulo.trim().endsWith('*') && !String(cadastro[c.chave] ?? '').trim());

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (enviando) return;
    if (faltando.length > 0) {
      setErro(`Preencha os campos obrigatórios: ${faltando.map((c) => c.rotulo.replace(' *', '')).join(', ')}.`);
      return;
    }
    setEnviando(true); setErro(null);
    try {
      await api.put(`/comercial/publico/cadastro/${token}`, cadastro);
      setOk(true);
    } catch {
      setErro('Falha ao enviar. Confira os dados e tente novamente.');
      setEnviando(false);
    }
  }

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', padding: '48px 20px' }}>
      <div className="brk-glow" />
      <div style={{ maxWidth: 720, margin: '0 auto', position: 'relative' }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 6 }}>
          Está na hora de desbloquear o verdadeiro potencial do seu negócio{empresa ? <> — <span className="brk-gradient-text">{empresa}</span></> : null}
        </h1>
        <p style={{ fontSize: 13.5, color: 'var(--texto-fraco)', marginBottom: codigo ? 8 : 24 }}>
          Por favor, compartilhe suas informações conosco para nosso jurídico preparar nosso contrato.
        </p>
        {codigo && (
          <p style={{ fontSize: 12, color: 'var(--texto-fraco)', marginBottom: 24 }}>
            Cadastro Nº <b style={{ color: 'var(--texto-suave)' }}>{codigo}</b>
          </p>
        )}

        {carregando ? (
          <div className="brk-card brk-card-p" style={{ textAlign: 'center', color: 'var(--texto-suave)' }}>Carregando…</div>
        ) : erroCarga ? (
          <div className="brk-card brk-card-p" style={{ textAlign: 'center', color: 'var(--vermelho)' }}>{erroCarga}</div>
        ) : ok ? (
          <div className="brk-card brk-card-p" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 18, fontWeight: 600, color: 'var(--verde)' }}>Recebemos seus dados! ✅</span>
            <span style={{ fontSize: 14, color: 'var(--texto-suave)' }}>
              Nossa equipe vai preparar seu contrato e enviar para assinatura em breve.
            </span>
          </div>
        ) : (
          <form onSubmit={enviar} className="brk-card brk-card-p" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="brk-rgrid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14 }}>
              {CADASTRO_CAMPOS.map((c) => (
                <div key={c.chave} style={{ minWidth: 0 }}>
                  <label className="brk-campo-label" style={{ display: 'block', marginBottom: 5 }}>{c.rotulo}</label>
                  <input
                    className="brk-input"
                    type={c.tipo ?? 'text'}
                    placeholder={c.placeholder ?? 'Inserir texto'}
                    inputMode={c.mascara ? 'numeric' : undefined}
                    maxLength={c.mascara ? MASCARA_MAXLEN[c.mascara] : undefined}
                    spellCheck={!c.mascara && c.tipo !== 'email'}
                    value={c.mascara ? aplicarMascara(c.mascara, cadastro[c.chave] ?? '') : (cadastro[c.chave] ?? '')}
                    onChange={(e) => { const v = c.mascara ? aplicarMascara(c.mascara, e.target.value) : e.target.value; setCadastro((m) => ({ ...m, [c.chave]: v })); }}
                    style={{ width: '100%' }}
                  />
                  {c.ajuda && <span style={{ display: 'block', marginTop: 4, fontSize: 11, color: 'var(--texto-fraco)' }}>{c.ajuda}</span>}
                </div>
              ))}
            </div>

            {erro && <div role="status" style={{ fontSize: 13, color: 'var(--vermelho)' }}>{erro}</div>}

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Btn type="submit" disabled={enviando}>{enviando ? 'Enviando…' : 'Enviar'}</Btn>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
