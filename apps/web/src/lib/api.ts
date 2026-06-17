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
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url: string = error?.config?.url ?? '';
    if (status === 401 && !url.includes('/auth/login')) {
      const tinhaToken = !!localStorage.getItem(TOKEN_KEY);
      localStorage.removeItem(TOKEN_KEY);
      if (tinhaToken) {
        window.dispatchEvent(new CustomEvent(EVENTO_SESSAO_EXPIRADA));
      }
    }
    return Promise.reject(error);
  },
);
