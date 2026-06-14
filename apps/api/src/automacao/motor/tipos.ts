// Tipos do motor de automacao proprio (dispatcher evento -> regra -> acoes).
// Uma regra (AutomacaoRule) e composta por:
//   - trigger: qual evento de dominio dispara a regra
//   - condicoes: filtros sobre o payload (combinados em AND); vazio = sempre passa
//   - acoes: lista do catalogo interno, executada em ordem
// Tudo e JSON no banco — o motor interpreta. E assim que substituimos o n8n:
// a logica vira dado configuravel, nao codigo.

/** Trigger: casa pelo nome do evento (ex.: 'contrato.renovacao_proxima'). */
export interface Trigger {
  evento: string;
}

/** Operadores suportados na avaliacao de condicoes. */
export type Operador = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'existe';

/** Condicao sobre um campo do payload. Combinadas em AND. */
export interface Condicao {
  campo: string;
  op: Operador;
  valor?: unknown;
}

/** Acao do catalogo interno. `params` varia por tipo; strings aceitam {{campo}}. */
export interface Acao {
  tipo: string;
  params?: Record<string, unknown>;
}

/** Contexto entregue aos handlers de acao. */
export interface ContextoExecucao {
  evento: string;
  payload: Record<string, unknown>;
}

/** Resultado de uma acao — gravado em JobExecution.resultado para observabilidade. */
export interface ResultadoAcao {
  tipo: string;
  ok: boolean;
  detalhe?: unknown;
  erro?: string;
}
