// Modo demonstração: quando VITE_DEMO=1, as telas exibem dados de exemplo (mock)
// para apresentações. Em produção (flag ausente) mostram apenas dados reais e
// os estados vazios normais. Centraliza a decisão para todas as páginas.
export const MODO_DEMO = import.meta.env.VITE_DEMO === '1';

/**
 * Retorna os dados reais; se vierem vazios, cai para o mock APENAS em modo demo.
 * Em produção, vazio continua vazio (estado vazio real).
 */
export function comDemo<T>(real: T[] | undefined | null, mock: T[]): T[] {
  if (real && real.length) return real;
  return MODO_DEMO ? mock : (real ?? []);
}

/** Mock só em modo demo (para usar em catch de falha de API). */
export function mockSeDemo<T>(mock: T[]): T[] {
  return MODO_DEMO ? mock : [];
}
