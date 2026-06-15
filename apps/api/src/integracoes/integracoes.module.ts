// IntegracoesModule — adapters externos com seleção automática stub/real.
// Padrão PORT/ADAPTER: consumidores injetam pelo token (@Inject(WHATSAPP_PORT))
// e nunca conhecem a implementação concreta.
//
// Seleção: se a env key estiver no ambiente → adapter real. Caso contrário → stub.
// Para ativar uma integração: basta adicionar a env var no Railway/cofre.
import { Logger, Module, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ASAAS_PORT,
  AUTENTIQUE_PORT,
  GOOGLE_PORT,
  SPEED_PORT,
  WHATSAPP_PORT,
} from './tokens';
// Stubs
import { AsaasStubService } from './stubs/asaas.stub.service';
import { SpeedStubService } from './stubs/speed.stub.service';
import { AutentiqueStubService } from './stubs/autentique.stub.service';
import { GoogleStubService } from './stubs/google.stub.service';
import { WhatsappStubService } from './stubs/whatsapp.stub.service';
// Adapters reais
import { WhatsappMegaService } from './real/whatsapp-mega.service';
import { AsaasService } from './real/asaas.service';
import { AutentiqueService } from './real/autentique.service';
import { GoogleService } from './real/google.service';
import { SpeedService } from './real/speed.service';

const logger = new Logger('IntegracoesModule');

const providers: Provider[] = [
  // Stubs sempre registrados como fallback
  AsaasStubService,
  SpeedStubService,
  AutentiqueStubService,
  GoogleStubService,
  WhatsappStubService,

  {
    provide: WHATSAPP_PORT,
    inject: [ConfigService, WhatsappStubService],
    useFactory: (config: ConfigService, stub: WhatsappStubService) => {
      const token = config.get<string>('WHATSAPP_TOKEN');
      const instancia = config.get<string>('MEGAAPI_INSTANCE');
      if (token && instancia) {
        logger.log('WhatsApp: adapter REAL (MegaAPI) ativo.');
        return new WhatsappMegaService(token, instancia);
      }
      logger.log('WhatsApp: usando STUB (defina WHATSAPP_TOKEN + MEGAAPI_INSTANCE para ativar).');
      return stub;
    },
  },

  {
    provide: ASAAS_PORT,
    inject: [ConfigService, AsaasStubService],
    useFactory: (config: ConfigService, stub: AsaasStubService) => {
      const key = config.get<string>('ASAAS_API_KEY');
      if (key) {
        const sandbox = config.get<string>('ASAAS_SANDBOX') === 'true';
        logger.log(`Asaas: adapter REAL ativo (${sandbox ? 'sandbox' : 'produção'}).`);
        return new AsaasService(key, sandbox);
      }
      logger.log('Asaas: usando STUB (defina ASAAS_API_KEY para ativar).');
      return stub;
    },
  },

  {
    provide: AUTENTIQUE_PORT,
    inject: [ConfigService, AutentiqueStubService],
    useFactory: (config: ConfigService, stub: AutentiqueStubService) => {
      const token = config.get<string>('AUTENTIQUE_TOKEN');
      if (token) {
        logger.log('Autentique: adapter REAL ativo.');
        return new AutentiqueService(token);
      }
      logger.log('Autentique: usando STUB (defina AUTENTIQUE_TOKEN para ativar).');
      return stub;
    },
  },

  {
    provide: GOOGLE_PORT,
    inject: [ConfigService, GoogleStubService],
    useFactory: (config: ConfigService, stub: GoogleStubService) => {
      const sa = config.get<string>('GOOGLE_SERVICE_ACCOUNT_JSON');
      if (sa) {
        logger.log('Google: adapter REAL (service account) ativo.');
        return new GoogleService(sa);
      }
      logger.log('Google: usando STUB (defina GOOGLE_SERVICE_ACCOUNT_JSON para ativar).');
      return stub;
    },
  },

  {
    provide: SPEED_PORT,
    inject: [ConfigService, SpeedStubService],
    useFactory: (config: ConfigService, stub: SpeedStubService) => {
      const key = config.get<string>('SPEED_API_KEY');
      if (key) {
        logger.log('Speed NF-e: adapter REAL ativo.');
        return new SpeedService(key);
      }
      logger.log('Speed NF-e: usando STUB (defina SPEED_API_KEY para ativar).');
      return stub;
    },
  },
];

@Module({
  providers,
  exports: [ASAAS_PORT, SPEED_PORT, AUTENTIQUE_PORT, GOOGLE_PORT, WHATSAPP_PORT],
})
export class IntegracoesModule {}
