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
