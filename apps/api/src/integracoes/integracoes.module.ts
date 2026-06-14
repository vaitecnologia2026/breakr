// ============================================================
// IntegracoesModule — camada de adapters de integracao externa (Fase 0).
//
// Padrao: cada integracao tem um PORT (interface, em ports.ts) resolvido por
// um TOKEN string (tokens.ts). Os consumidores injetam o port pelo token
// (@Inject(ASAAS_PORT) etc.) e nunca conhecem a implementacao concreta.
//
// Selecao da implementacao: um factory provider escolhe o adapter conforme a
// presenca da env key (cofre/.env). Na Fase 0 so existe STUB, entao o stub e
// sempre devolvido — mas, se a credencial ja estiver setada, logamos um aviso
// deixando claro que o adapter REAL ainda nao foi implementado. Quando a impl
// real existir, basta trocar o `return stub` por `new XReal(config)` dentro do
// factory; o resto do sistema nao muda.
//
// Para usar: importe este modulo onde precisar (controllers/services) — ele NAO
// e global de proposito (integracoes sao um limite explicito do sistema).
// ============================================================
import { Logger, Module, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ASAAS_PORT,
  AUTENTIQUE_PORT,
  GOOGLE_PORT,
  SPEED_PORT,
  WHATSAPP_PORT,
} from './tokens';
import { AsaasStubService } from './stubs/asaas.stub.service';
import { SpeedStubService } from './stubs/speed.stub.service';
import { AutentiqueStubService } from './stubs/autentique.stub.service';
import { GoogleStubService } from './stubs/google.stub.service';
import { WhatsappStubService } from './stubs/whatsapp.stub.service';

const logger = new Logger('IntegracoesModule');

/**
 * Decide entre stub e impl real para um port. Hoje sempre retorna o stub; se
 * a env key existir, avisa que a real ainda esta pendente. Centraliza o
 * "selecione stub quando a env key nao existir" pedido no escopo.
 */
function selecionar<T>(
  nome: string,
  envKey: string,
  config: ConfigService,
  stub: T,
  // real?: () => T  // <- plugar aqui quando o adapter real existir
): T {
  const credencial = config.get<string>(envKey);
  if (credencial) {
    logger.warn(
      `Credencial ${envKey} detectada, mas o adapter real de ${nome} ainda ` +
        'nao foi implementado — usando STUB. Implementar na proxima fase.',
    );
  } else {
    logger.log(`${nome}: sem ${envKey} no ambiente — usando STUB.`);
  }
  return stub;
}

// Cada port: stub registrado como provider concreto + factory que resolve o
// token para a implementacao selecionada (stub na Fase 0).
const providers: Provider[] = [
  AsaasStubService,
  SpeedStubService,
  AutentiqueStubService,
  GoogleStubService,
  WhatsappStubService,
  {
    provide: ASAAS_PORT,
    inject: [ConfigService, AsaasStubService],
    useFactory: (config: ConfigService, stub: AsaasStubService) =>
      selecionar('Asaas', 'ASAAS_API_KEY', config, stub),
  },
  {
    provide: SPEED_PORT,
    inject: [ConfigService, SpeedStubService],
    useFactory: (config: ConfigService, stub: SpeedStubService) =>
      selecionar('Speed', 'SPEED_API_KEY', config, stub),
  },
  {
    provide: AUTENTIQUE_PORT,
    inject: [ConfigService, AutentiqueStubService],
    useFactory: (config: ConfigService, stub: AutentiqueStubService) =>
      selecionar('Autentique', 'AUTENTIQUE_TOKEN', config, stub),
  },
  {
    provide: GOOGLE_PORT,
    inject: [ConfigService, GoogleStubService],
    useFactory: (config: ConfigService, stub: GoogleStubService) =>
      selecionar('Google', 'GOOGLE_SERVICE_ACCOUNT_JSON', config, stub),
  },
  {
    provide: WHATSAPP_PORT,
    inject: [ConfigService, WhatsappStubService],
    useFactory: (config: ConfigService, stub: WhatsappStubService) =>
      selecionar('WhatsApp', 'WHATSAPP_TOKEN', config, stub),
  },
];

@Module({
  providers,
  // Exporta APENAS os tokens dos ports — o mundo externo so conhece a interface.
  exports: [ASAAS_PORT, SPEED_PORT, AUTENTIQUE_PORT, GOOGLE_PORT, WHATSAPP_PORT],
})
export class IntegracoesModule {}
