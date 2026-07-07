import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

/**
 * Formulário PÚBLICO de captação de dados (jurídico). O cliente preenche após o
 * "sim" na reunião; o sistema cria o cliente + um contrato em rascunho para a
 * equipe revisar e enviar para assinatura.
 *  GET  /captacao/planos
 *  POST /captacao { nomeFantasia, cnpj?, email?, telefone?, planoId }
 */

interface PlanoOpt {
  id: string;
  nome: string;
  valor: string;
}

const campoStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--superficie-2)',
  border: '1px solid var(--borda-forte)',
  borderRadius: 10,
  padding: '11px 13px',
  color: 'var(--texto)',
  fontSize: 14,
  outline: 'none',
};

const rotuloStyle: React.CSSProperties = {
  fontSize: 12.5,
  fontWeight: 600,
  color: 'var(--texto-suave)',
  marginBottom: 4,
  display: 'block',
};

export function Captacao() {
  const { autenticado } = useAuth();
  const navigate = useNavigate();
  const [planos, setPlanos] = useState<PlanoOpt[]>([]);
  const [nomeFantasia, setNomeFantasia] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [planoId, setPlanoId] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    let ativo = true;
    (async () => {
      try {
        const { data } = await api.get<PlanoOpt[]>('/captacao/planos');
        if (!ativo) return;
        setPlanos(data);
        if (data.length > 0) setPlanoId(data[0].id);
      } catch {
        if (ativo) setErro('Não foi possível carregar os planos.');
      }
    })();
    return () => {
      ativo = false;
    };
  }, []);

  const valido = nomeFantasia.trim().length >= 2 && planoId !== '';

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!valido || enviando) return;
    setEnviando(true);
    setErro(null);
    try {
      await api.post('/captacao', {
        nomeFantasia: nomeFantasia.trim(),
        cnpj: cnpj.trim() || undefined,
        email: email.trim() || undefined,
        telefone: telefone.trim() || undefined,
        planoId,
      });
      setOk(true);
    } catch {
      setErro('Falha ao enviar. Confira os dados e tente novamente.');
      setEnviando(false);
    }
  }

  return (
    <main style={{ minHeight: '100vh', background: 'var(--preto-fumaca)', padding: '48px 20px' }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        {autenticado && (
          <button
            type="button"
            onClick={() => navigate('/')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'transparent',
              border: '1px solid var(--borda-forte)',
              borderRadius: 10,
              padding: '7px 12px',
              color: 'var(--texto-suave)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              marginBottom: 18,
            }}
          >
            ← Voltar ao painel
          </button>
        )}
        <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>
          Bem-vindo à <span className="brk-gradient-text">Breakr</span>
        </h1>
        <p style={{ fontSize: 14, color: 'var(--texto-fraco)', marginBottom: 24 }}>
          Preencha seus dados para iniciarmos seu contrato.
        </p>

        {ok ? (
          <div
            className="brk-card"
            style={{ padding: 24, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 8 }}
          >
            <span style={{ fontSize: 18, fontWeight: 700, color: '#67e0a3' }}>Recebemos seus dados! ✅</span>
            <span style={{ fontSize: 14, color: 'var(--texto-suave)' }}>
              Nossa equipe vai preparar seu contrato e enviar para assinatura em breve.
            </span>
          </div>
        ) : (
          <form
            onSubmit={enviar}
            className="brk-card"
            style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}
          >
            <div>
              <label style={rotuloStyle}>Nome fantasia *</label>
              <input style={campoStyle} value={nomeFantasia} onChange={(e) => setNomeFantasia(e.target.value)} placeholder="Ex.: Nona Pizzas" autoFocus />
            </div>
            <div>
              <label style={rotuloStyle}>CNPJ</label>
              <input style={campoStyle} value={cnpj} onChange={(e) => setCnpj(e.target.value)} placeholder="00.000.000/0000-00" />
            </div>
            <div>
              <label style={rotuloStyle}>E-mail</label>
              <input style={campoStyle} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contato@empresa.com" />
            </div>
            <div>
              <label style={rotuloStyle}>WhatsApp / telefone</label>
              <input style={campoStyle} value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(00) 00000-0000" />
            </div>
            <div>
              <label style={rotuloStyle}>Plano *</label>
              <select style={campoStyle} value={planoId} onChange={(e) => setPlanoId(e.target.value)}>
                {planos.length === 0 && <option value="">Carregando planos…</option>}
                {planos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome} — R$ {Number(p.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </option>
                ))}
              </select>
            </div>

            {erro && (
              <div role="status" style={{ fontSize: 13, color: 'var(--vermelho)' }}>{erro}</div>
            )}

            <button
              type="submit"
              disabled={!valido || enviando}
              className="brk-gradient-bg"
              style={{
                marginTop: 4,
                padding: '12px 16px',
                borderRadius: 12,
                border: 'none',
                fontSize: 15,
                fontWeight: 700,
                color: '#fff',
                cursor: !valido || enviando ? 'default' : 'pointer',
                opacity: !valido || enviando ? 0.6 : 1,
              }}
            >
              {enviando ? 'Enviando…' : 'Enviar dados'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
