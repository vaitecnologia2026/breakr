import axios from 'axios';

/**
 * Instância central do axios para falar com a API do Breakr OS.
 * A baseURL vem de VITE_API_URL (.env) e cai para localhost:3000 em dev.
 */
export const TOKEN_KEY = 'breakr.token';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Interceptor de requisição: injeta o token JWT (Bearer) salvo no
 * localStorage em toda chamada autenticada.
 */
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/** Evento global emitido quando a sessao expira (401). O AuthProvider ouve. */
export const EVENTO_SESSAO_EXPIRADA = 'breakr:sessao-expirada';

/**
 * Interceptor de resposta: em 401 numa chamada autenticada (exceto o proprio
 * login), limpa o token e avisa a app para encerrar a sessao — evitando que o
 * usuario fique preso numa sessao morta vendo "erro ao carregar" em tudo.
 *
 * Exceção: os endpoints do portal do cliente (`/portal/...`) têm autenticação
 * própria (header X-Portal-Token em sessionStorage) e tratam seus próprios 401
 * localmente. Um 401 do portal (senha errada no login do portal, ou sessão do
 * portal expirada) NÃO pode encerrar a sessão interna (staff/admin): como o
 * localStorage é compartilhado entre abas, isso apagaria o `breakr.token` e
 * deslogaria o admin — quebrando telas como "Usuários" (GET /clientes vinha
 * sem token → 401 "Token ausente"). Por isso `/portal/` também é ignorado aqui.
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url: string = error?.config?.url ?? '';
    if (status === 401 && !url.includes('/auth/login') && !url.includes('/portal/')) {
      const tinhaToken = !!localStorage.getItem(TOKEN_KEY);
      localStorage.removeItem(TOKEN_KEY);
      if (tinhaToken) {
        window.dispatchEvent(new CustomEvent(EVENTO_SESSAO_EXPIRADA));
      }
    }
    return Promise.reject(error);
  },
);
