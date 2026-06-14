// Porta (contrato) de um provedor de IA (LLM). Cada provedor (OpenAI, Anthropic,
// Gemini) implementa este contrato. O resto do sistema fala com IaService, que
// resolve o provedor ativo a partir da configuracao — nunca com a impl concreta.
export interface IaProvider {
  /** Nome legivel (para mensagens/logs). */
  readonly nome: string;

  /**
   * Completa um prompt simples. Lanca em caso de HTTP != 2xx ou erro de rede.
   * A chave e o modelo vem da configuracao salva em Configuracoes.
   */
  completar(prompt: string, opts: { apiKey: string; modelo: string }): Promise<string>;
}
