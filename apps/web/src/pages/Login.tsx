import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../lib/auth';
import { Logo } from '../components/Logo';

// Token de acesso para o período de demonstração de 48h.
// Sobrescreva com a variável de ambiente VITE_GATE_TOKEN.
const GATE_TOKEN = import.meta.env.VITE_GATE_TOKEN ?? 'BREAKR48H';
const GATE_KEY = 'brk.gate';

const KEYFRAMES = `
@keyframes gate-out {
  0%   { opacity: 1; transform: translateY(0) scale(1); }
  100% { opacity: 0; transform: translateY(-24px) scale(0.97); pointer-events: none; }
}
@keyframes login-in {
  0%   { opacity: 0; transform: translateY(24px) scale(0.97); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes vai-pulse {
  0%, 100% { filter: brightness(1); }
  50%       { filter: brightness(1.15); }
}
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20%       { transform: translateX(-8px); }
  40%       { transform: translateX(8px); }
  60%       { transform: translateX(-5px); }
  80%       { transform: translateX(5px); }
}
`;

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  // gate = mostra tela de token | login = mostra formulário de login
  const [tela, setTela] = useState<'gate' | 'transicao' | 'login'>(() =>
    sessionStorage.getItem(GATE_KEY) === '1' ? 'login' : 'gate',
  );

  function aoValidarToken() {
    sessionStorage.setItem(GATE_KEY, '1');
    setTela('transicao');
    setTimeout(() => setTela('login'), 480);
  }

  return (
    <div
      style={{
        position: 'relative',
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
        overflow: 'hidden',
        background: 'var(--preto-fumaca)',
      }}
    >
      <style>{KEYFRAMES}</style>
      <div className="brk-glow" aria-hidden="true" />

      <main style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 408 }}>
        {(tela === 'gate' || tela === 'transicao') && (
          <div
            key="gate"
            style={{
              animation:
                tela === 'transicao'
                  ? 'gate-out 0.45s cubic-bezier(0.4,0,0.6,1) forwards'
                  : undefined,
            }}
          >
            <GateTela aoValidar={aoValidarToken} />
          </div>
        )}

        {tela === 'login' && (
          <div
            key="login"
            style={{ animation: 'login-in 0.45s cubic-bezier(0.22,1,0.36,1) both' }}
          >
            <FormLogin login={login} navigate={navigate} />
          </div>
        )}
      </main>
    </div>
  );
}

// ─── Tela de gate (token 48h) ─────────────────────────────────────────────────

function GateTela({ aoValidar }: { aoValidar: () => void }) {
  const [token, setToken] = useState('');
  const [erro, setErro] = useState(false);
  const [validando, setValidando] = useState(false);

  function validar(e: FormEvent) {
    e.preventDefault();
    if (validando) return;
    if (token.trim().toUpperCase() === GATE_TOKEN.toUpperCase()) {
      setValidando(true);
      aoValidar();
    } else {
      setErro(true);
      setTimeout(() => setErro(false), 600);
    }
  }

  return (
    <>
      <div style={{ marginBottom: 32, textAlign: 'center' }}>
        <LogoVAI />
        <p
          style={{
            marginTop: 18,
            fontSize: 13,
            color: 'var(--texto-fraco)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            fontWeight: 600,
          }}
        >
          Tecnologia que acelera negócios
        </p>
      </div>

      <div
        style={{
          background: 'var(--superficie)',
          border: '1px solid var(--borda)',
          borderRadius: 18,
          padding: '28px 26px',
          boxShadow: 'var(--sombra-card)',
          textAlign: 'center',
        }}
        className="brk-gradient-border"
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: 'rgba(202, 63, 23, 0.12)',
            border: '1px solid rgba(202, 63, 23, 0.3)',
            borderRadius: 99,
            padding: '5px 14px',
            marginBottom: 20,
          }}
        >
          <span style={{ fontSize: 13, color: '#CA3F17', fontWeight: 700 }}>
            ⏱ Acesso especial · 48 horas
          </span>
        </div>

        <h1
          style={{
            fontSize: 22,
            fontWeight: 800,
            lineHeight: 1.2,
            marginBottom: 6,
            color: 'var(--cinza-vapor)',
          }}
        >
          Seu Breakr OS está pronto
        </h1>
        <p style={{ fontSize: 13.5, color: 'var(--texto-suave)', marginBottom: 24 }}>
          Digite o token de acesso enviado pela equipe VAI para explorar o sistema.
        </p>

        <form onSubmit={validar} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="text"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Token de acesso"
            autoFocus
            autoCapitalize="characters"
            style={{
              background: 'var(--preto-fumaca)',
              border: `1px solid ${erro ? '#e2738a' : 'var(--borda-forte)'}`,
              borderRadius: 11,
              padding: '13px 16px',
              color: 'var(--texto)',
              fontSize: 15,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textAlign: 'center',
              outline: 'none',
              transition: 'border-color 0.2s',
              animation: erro ? 'shake 0.4s ease' : undefined,
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--amarelo-fagulha)';
              e.currentTarget.style.boxShadow = '0 0 0 3px var(--foco)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = erro ? '#e2738a' : 'var(--borda-forte)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />

          {erro && (
            <p style={{ fontSize: 12.5, color: '#e2738a', margin: 0 }}>
              Token inválido. Verifique com a equipe VAI.
            </p>
          )}

          <button
            type="submit"
            disabled={validando || token.trim().length === 0}
            className="brk-gradient-bg"
            style={{
              border: 'none',
              borderRadius: 11,
              padding: '13px 16px',
              color: '#fff',
              fontWeight: 700,
              fontSize: 15,
              opacity: validando || token.trim().length === 0 ? 0.6 : 1,
              cursor: validando || token.trim().length === 0 ? 'not-allowed' : 'pointer',
              transition: 'opacity 0.15s, filter 0.15s',
            }}
          >
            {validando ? 'Validando…' : 'Acessar sistema'}
          </button>
        </form>
      </div>

      <p
        style={{
          marginTop: 20,
          textAlign: 'center',
          fontSize: 12,
          color: 'var(--texto-fraco)',
        }}
      >
        Desenvolvido por{' '}
        <span style={{ color: 'var(--laranja-fagulha)', fontWeight: 700 }}>
          VAI Tecnologia
        </span>
      </p>
    </>
  );
}

// ─── Formulário de login (após gate) ─────────────────────────────────────────

function FormLogin({
  login,
  navigate,
}: {
  login: (email: string, senha: string) => Promise<void>;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const [email, setEmail] = useState('admin@breakr.com');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  // Foca a senha automaticamente pois o e-mail já vem preenchido.
  useEffect(() => {
    const input = document.getElementById('senha-input') as HTMLInputElement | null;
    input?.focus();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await login(email.trim(), senha);
      navigate('/', { replace: true });
    } catch (err) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 401) {
          setErro('E-mail ou senha inválidos.');
        } else if (err.response) {
          const msg = (err.response.data as { message?: string })?.message;
          setErro(msg ?? 'Não foi possível entrar. Tente novamente.');
        } else {
          setErro('Sem conexão com o servidor. Verifique a API.');
        }
      } else {
        setErro('Erro inesperado ao entrar.');
      }
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <div style={{ marginBottom: 28, textAlign: 'left' }}>
        <Logo tamanho={34} />
        <h1 style={{ marginTop: 22, fontSize: 30, fontWeight: 800, lineHeight: 1.12 }}>
          Acenda a{' '}
          <span className="brk-gradient-text">operação</span>.
        </h1>
        <p style={{ marginTop: 8, color: 'var(--texto-suave)', fontSize: 15 }}>
          Entre no sistema operacional da Breakr.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="brk-gradient-border"
        style={{
          background: 'var(--superficie)',
          border: '1px solid var(--borda)',
          borderRadius: 18,
          padding: 26,
          boxShadow: 'var(--sombra-card)',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <Campo
          id="email"
          rotulo="E-mail"
          type="email"
          placeholder="voce@breakr.com.br"
          value={email}
          autoComplete="username"
          onChange={setEmail}
        />

        <Campo
          id="senha-input"
          rotulo="Senha"
          type="password"
          placeholder="••••••••"
          value={senha}
          autoComplete="current-password"
          onChange={setSenha}
        />

        {erro && (
          <div
            role="alert"
            style={{
              fontSize: 13.5,
              color: '#ffd0c2',
              background: 'rgba(148, 18, 44, 0.22)',
              border: '1px solid rgba(202, 63, 23, 0.45)',
              borderRadius: 10,
              padding: '10px 12px',
            }}
          >
            {erro}
          </div>
        )}

        <button
          type="submit"
          disabled={enviando}
          className="brk-gradient-bg"
          style={{
            marginTop: 4,
            border: 'none',
            borderRadius: 11,
            padding: '13px 16px',
            color: '#fff',
            fontWeight: 700,
            fontSize: 15,
            letterSpacing: '0.01em',
            opacity: enviando ? 0.7 : 1,
            cursor: enviando ? 'wait' : 'pointer',
            transition: 'opacity 0.15s ease, filter 0.15s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(1.08)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.filter = 'none'; }}
        >
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>

      <p
        style={{
          marginTop: 18,
          textAlign: 'center',
          fontSize: 12.5,
          color: 'var(--texto-fraco)',
        }}
      >
        Quando os padrões não servem, nós quebramos.
      </p>
    </>
  );
}

// ─── Logo VAI ─────────────────────────────────────────────────────────────────

function LogoVAI() {
  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
      <img
        src="/vai-logo.png"
        alt="VAI Tecnologia"
        width={110}
        height={55}
        style={{
          objectFit: 'contain',
          animation: 'vai-pulse 3s ease-in-out infinite',
          imageRendering: 'auto',
        }}
      />
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.22em',
          color: 'var(--texto-fraco)',
          textTransform: 'uppercase',
          marginTop: 4,
        }}
      >
        Tecnologia
      </span>
    </div>
  );
}

// ─── Campo de formulário ──────────────────────────────────────────────────────

interface CampoProps {
  id: string;
  rotulo: string;
  type: string;
  placeholder: string;
  value: string;
  autoComplete?: string;
  onChange: (v: string) => void;
}

function Campo({ id, rotulo, type, placeholder, value, autoComplete, onChange }: CampoProps) {
  return (
    <label htmlFor={id} style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--texto-suave)' }}>
        {rotulo}
      </span>
      <input
        id={id}
        name={id}
        type={type}
        required
        placeholder={placeholder}
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        style={{
          background: 'var(--preto-fumaca)',
          border: '1px solid var(--borda-forte)',
          borderRadius: 10,
          padding: '12px 14px',
          color: 'var(--texto)',
          outline: 'none',
          transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = 'var(--amarelo-fagulha)';
          e.currentTarget.style.boxShadow = '0 0 0 3px var(--foco)';
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = 'var(--borda-forte)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      />
    </label>
  );
}
