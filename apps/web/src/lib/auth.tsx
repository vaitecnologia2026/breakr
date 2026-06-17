import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { LoginResponse, UsuarioPublico } from '@breakr/shared';
import { api, TOKEN_KEY, EVENTO_SESSAO_EXPIRADA } from './api';

/**
 * Contexto de autenticação do Breakr OS.
 * Mantém o usuário logado + token JWT, expõe login/logout e o estado
 * de carregamento inicial (enquanto valida um token já existente).
 */
interface AuthContextValue {
  usuario: UsuarioPublico | null;
  token: string | null;
  carregando: boolean;
  autenticado: boolean;
  login: (email: string, senha: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioPublico | null>(null);
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem(TOKEN_KEY),
  );
  // Começa carregando apenas se houver token a validar.
  const [carregando, setCarregando] = useState<boolean>(
    () => !!localStorage.getItem(TOKEN_KEY),
  );

  // Ao montar (ou se houver token persistido), recupera o usuário em /usuarios/me.
  useEffect(() => {
    const tokenSalvo = localStorage.getItem(TOKEN_KEY);
    if (!tokenSalvo) {
      setCarregando(false);
      return;
    }

    let ativo = true;
    api
      .get<UsuarioPublico>('/usuarios/me')
      .then(({ data }) => {
        if (ativo) setUsuario(data);
      })
      .catch(() => {
        // Token inválido/expirado: limpa a sessão.
        if (ativo) {
          localStorage.removeItem(TOKEN_KEY);
          setToken(null);
          setUsuario(null);
        }
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });

    return () => {
      ativo = false;
    };
  }, []);

  // Encerra a sessao quando o interceptor de API detecta 401 (token expirado).
  useEffect(() => {
    function aoExpirar() {
      setToken(null);
      setUsuario(null);
    }
    window.addEventListener(EVENTO_SESSAO_EXPIRADA, aoExpirar);
    return () => window.removeEventListener(EVENTO_SESSAO_EXPIRADA, aoExpirar);
  }, []);

  async function login(email: string, senha: string): Promise<void> {
    const { data } = await api.post<LoginResponse>('/auth/login', {
      email,
      senha,
    });
    localStorage.setItem(TOKEN_KEY, data.token);
    setToken(data.token);
    setUsuario(data.usuario);
  }

  function logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUsuario(null);
  }

  const valor = useMemo<AuthContextValue>(
    () => ({
      usuario,
      token,
      carregando,
      autenticado: !!usuario && !!token,
      login,
      logout,
    }),
    [usuario, token, carregando],
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

/** Hook de acesso ao contexto de autenticação. */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth deve ser usado dentro de <AuthProvider>.');
  }
  return ctx;
}
