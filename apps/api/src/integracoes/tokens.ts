// ============================================================
// Tokens de DI (string) para os ports de integracao.
//
// Por que tokens string e nao a classe diretamente: os ports sao INTERFACES
// (apagadas em runtime), entao precisamos de um token estavel para o Nest
// resolver a implementacao (STUB hoje, real amanha). Consuma sempre via
// @Inject(TOKEN), nunca pela classe concreta — assim o resto do sistema nao
// sabe se esta falando com o stub ou com a API real.
//
// Exemplo de consumo:
//   constructor(@Inject(ASAAS_PORT) private readonly asaas: AsaasPort) {}
// ============================================================
export const ASAAS_PORT = 'ASAAS_PORT';
export const SPEED_PORT = 'SPEED_PORT';
export const AUTENTIQUE_PORT = 'AUTENTIQUE_PORT';
export const WHATSAPP_PORT = 'WHATSAPP_PORT';
export const GOOGLE_MEET_PORT = 'GOOGLE_MEET_PORT';
