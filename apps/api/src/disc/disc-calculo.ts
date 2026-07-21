// Motor de cálculo DISC (funções puras, sem I/O) — implementa o modelo do
// documento "Avaliação DISC em Recrutamento Web": os 3 gráficos clássicos
// (Adaptado/Natural/Combinado), a padronização em percentis e a detecção de
// anomalias, além da distância euclidiana usada no Job Fit.
//
// IMPORTANTE sobre percentis: o documento pede percentis derivados de tabelas
// normativas (curva de Gauss de amostra demográfica validada). O Breakr não
// possui essas tabelas reais; portanto usamos uma APROXIMAÇÃO por z-score com
// média (μ) e desvio-padrão (σ) fixos por dimensão (constantes NORMA abaixo),
// convertida por uma aproximação da função de distribuição normal (erf). As
// constantes ficam isoladas para troca futura por norma populacional real.

export type DimDisc = 'D' | 'I' | 'S' | 'C';

export const DIMENSOES: DimDisc[] = ['D', 'I', 'S', 'C'];

export interface Placar {
  D: number;
  I: number;
  S: number;
  C: number;
}

export interface GraficosDisc {
  adaptado: Placar; // Gráfico 1 (máscara): soma dos "Mais"
  natural: Placar; // Gráfico 2 (essência): não-rejeição = totalBlocos − "Menos"
  combinado: Placar; // Gráfico 3 (resultante): "Mais" − "Menos"
}

// μ/σ por dimensão para o Gráfico 3 (Combinado), que varia aprox. de −N a +N.
// Valores neutros (aproximação, não norma validada) — ajustáveis no futuro.
const NORMA: Record<DimDisc, { mu: number; sigma: number }> = {
  D: { mu: 0, sigma: 5 },
  I: { mu: 0, sigma: 5 },
  S: { mu: 0, sigma: 5 },
  C: { mu: 0, sigma: 5 },
};

const placarZero = (): Placar => ({ D: 0, I: 0, S: 0, C: 0 });

// Aproximação de erf (Abramowitz & Stegun 7.1.26) — sem dependências.
function erf(x: number): number {
  const sinal = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-ax * ax);
  return sinal * y;
}

// CDF normal padrão Φ(z) → probabilidade acumulada (0..1).
function cdfNormal(z: number): number {
  return 0.5 * (1 + erf(z / Math.SQRT2));
}

const arredondar = (n: number) => Math.round(n);
const limitar = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

/**
 * Calcula os 3 gráficos DISC a partir das contagens de "Mais" e "Menos" por
 * dimensão e do total de blocos respondidos.
 */
export function calcularGraficos(mais: Placar, menos: Placar, totalBlocos: number): GraficosDisc {
  const adaptado = placarZero();
  const natural = placarZero();
  const combinado = placarZero();
  for (const d of DIMENSOES) {
    adaptado[d] = mais[d];
    natural[d] = totalBlocos - menos[d];
    combinado[d] = mais[d] - menos[d];
  }
  return { adaptado, natural, combinado };
}

/** Converte o placar bruto (Gráfico 3) em percentis (0..100) por aproximação z-score. */
export function calcularPercentis(combinado: Placar): Placar {
  const p = placarZero();
  for (const d of DIMENSOES) {
    const { mu, sigma } = NORMA[d];
    const z = sigma === 0 ? 0 : (combinado[d] - mu) / sigma;
    p[d] = limitar(arredondar(cdfNormal(z) * 100), 0, 100);
  }
  return p;
}

export type AnomaliaDisc = 'OVERSHIFT' | 'UNDERSHIFT' | 'COMPRIMIDO' | null;

/**
 * Detecta anomalias estatísticas sobre os percentis finais:
 *  - OVERSHIFT: todos os fatores acima de 50 (candidato tenta parecer "super-herói").
 *  - UNDERSHIFT: todos os fatores muito baixos (<30) — nenhum estilo claro.
 *  - COMPRIMIDO: amplitude (max−min) < 15 — neutralização/autoproteção.
 */
export function detectarAnomalia(percentis: Placar): AnomaliaDisc {
  const vals = DIMENSOES.map((d) => percentis[d]);
  const maiorQue50 = vals.every((v) => v > 50);
  if (maiorQue50) return 'OVERSHIFT';
  const todosBaixos = vals.every((v) => v < 30);
  if (todosBaixos) return 'UNDERSHIFT';
  const amplitude = Math.max(...vals) - Math.min(...vals);
  if (amplitude < 15) return 'COMPRIMIDO';
  return null;
}

/** Distância euclidiana tetradimensional entre o perfil do candidato e o da vaga. */
export function distanciaEuclidiana(candidato: Placar, vaga: Placar): number {
  let soma = 0;
  for (const d of DIMENSOES) {
    const delta = candidato[d] - vaga[d];
    soma += delta * delta;
  }
  return Math.sqrt(soma);
}

/**
 * Traduz a distância euclidiana em um Índice de Aderência (Match Score) 0..100.
 * Dispersão escalar teórica máxima entre vetores (0..100 em 4 dimensões) = 200.
 */
export function matchScore(distancia: number): number {
  return limitar(arredondar((1 - distancia / 200) * 100), 0, 100);
}
