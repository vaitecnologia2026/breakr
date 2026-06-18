// IntegracoesModule — adapters externos com seleção automática stub/real.
// Padrão PORT/ADAPTER: consumidores injetam pelo token (@Inject(WHATSAPP_PORT))
// e nunca conhecem a implementação concreta.
//
// Seleção: credenciais vêm primeiro da config do ADMIN (Configurações → Integrações,
// salva em Config.parametros.integracoes) e, como fallback, das variáveis de ambiente.
// Se houver chave → adapter real; senão → stub. (Mudanças no admin valem no próximo
// boot/restart do serviço.)
import { Logger, Module, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';
import {
  ASAAS_PORT,
  AUTENTIQUE_PORT,
  GOOGLE_MEET_PORT,
  SPEED_PORT,
  WHATSAPP_PORT,
} from './tokens';
// Stubs
import { AsaasStubService } from './stubs/asaas.stub.service';
import { SpeedStubService } from './stubs/speed.stub.service';
import { AutentiqueStubService } from './stubs/autentique.stub.service';
import { WhatsappStubService } from './stubs/whatsapp.stub.service';
import { GoogleMeetStubService } from './stubs/google-meet.stub.service';
// Adapters reais
import { WhatsappMegaService } from './real/whatsapp-mega.service';
import { AsaasService } from './real/asaas.service';
import { AutentiqueService } from './real/autentique.service';
import { SpeedService } from './real/speed.service';
import { GoogleMeetService } from './real/google-meet.service';

const logger = new Logger('IntegracoesModule');

// Id do Config singleton onde a aba Integrações grava as chaves (mesmo da
// IntegracoesConfigService). Lê com try/catch p/ não derrubar o boot se o DB oscilar.
const CONFIG_ID = '00000000-0000-0000-0000-000000000001';
interface IntegEntry { apiKey?: string | null; sandbox?: boolean; instancia?: string | null }
interface IntegDb { asaas?: IntegEntry; speed?: IntegEntry; autentique?: IntegEntry; whatsapp?: IntegEntry }

async function lerIntegracoesDb(prisma: PrismaService): Promise<IntegDb> {
  try {
    const cfg = await prisma.config.findUnique({ where: { id: CONFIG_ID } });
    const params = (cfg?.parametros as Record<string, unknown>) ?? {};
    return (params.integracoes as IntegDb) ?? {};
  } catch {
    return {};
  }
}

const providers: Provider[] = [
  // Stubs sempre registrados como fallback
  AsaasStubService,
  SpeedStubService,
  AutentiqueStubService,
  WhatsappStubService,
  GoogleMeetStubService,

  {
    provide: WHATSAPP_PORT,
    inject: [ConfigService, PrismaService, WhatsappStubService],
    useFactory: async (config: ConfigService, prisma: PrismaService, stub: WhatsappStubService) => {
      const db = await lerIntegracoesDb(prisma);
      const token = db.whatsapp?.apiKey ?? config.get<string>('WHATSAPP_TOKEN');
      const instancia = db.whatsapp?.instancia ?? config.get<string>('MEGAAPI_INSTANCE');
      if (token && instancia) {
        logger.log('WhatsApp: adapter REAL (MegaAPI) ativo.');
        return new WhatsappMegaService(token, instancia);
      }
      logger.log('WhatsApp: usando STUB (configure em Configurações → Integrações ou env).');
      return stub;
    },
  },

  {
    provide: ASAAS_PORT,
    inject: [ConfigService, PrismaService, AsaasStubService],
    useFactory: async (config: ConfigService, prisma: PrismaService, stub: AsaasStubService) => {
      const db = await lerIntegracoesDb(prisma);
      const key = db.asaas?.apiKey ?? config.get<string>('ASAAS_API_KEY');
      if (key) {
        const sandbox = db.asaas?.sandbox ?? config.get<string>('ASAAS_SANDBOX') === 'true';
        logger.log(`Asaas: adapter REAL ativo (${sandbox ? 'sandbox' : 'produção'}).`);
        return new AsaasService(key, sandbox);
      }
      logger.log('Asaas: usando STUB (configure em Configurações → Integrações ou env).');
      return stub;
    },
  },

  {
    provide: AUTENTIQUE_PORT,
    inject: [ConfigService, PrismaService, AutentiqueStubService],
    useFactory: async (config: ConfigService, prisma: PrismaService, stub: AutentiqueStubService) => {
      const db = await lerIntegracoesDb(prisma);
      const token = db.autentique?.apiKey ?? config.get<string>('AUTENTIQUE_TOKEN');
      if (token) {
        logger.log('Autentique: adapter REAL ativo.');
        return new AutentiqueService(token);
      }
      logger.log('Autentique: usando STUB (configure em Configurações → Integrações ou env).');
      return stub;
    },
  },

  {
    provide: SPEED_PORT,
    inject: [ConfigService, PrismaService, SpeedStubService],
    useFactory: async (config: ConfigService, prisma: PrismaService, stub: SpeedStubService) => {
      const db = await lerIntegracoesDb(prisma);
      const key = db.speed?.apiKey ?? config.get<string>('SPEED_API_KEY');
      if (key) {
        logger.log('Speed NF-e: adapter REAL ativo.');
        return new SpeedService(key);
      }
      logger.log('Speed NF-e: usando STUB (configure em Configurações → Integrações ou env).');
      return stub;
    },
  },

  {
    provide: GOOGLE_MEET_PORT,
    inject: [ConfigService, GoogleMeetStubService],
    useFactory: (config: ConfigService, stub: GoogleMeetStubService) => {
      const clientId = config.get<string>('GOOGLE_CLIENT_ID');
      const clientSecret = config.get<string>('GOOGLE_CLIENT_SECRET');
      const refreshToken = config.get<string>('GOOGLE_REFRESH_TOKEN');
      if (clientId && clientSecret && refreshToken) {
        const calendarId = config.get<string>('GOOGLE_CALENDAR_ID') ?? 'primary';
        logger.log('Google Meet: adapter REAL ativo.');
        return new GoogleMeetService(clientId, clientSecret, refreshToken, calendarId);
      }
      logger.log(
        'Google Meet: usando STUB (defina GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET + GOOGLE_REFRESH_TOKEN para ativar).',
      );
      return stub;
    },
  },
];

@Module({
  imports: [PrismaModule],
  providers,
  exports: [ASAAS_PORT, SPEED_PORT, AUTENTIQUE_PORT, WHATSAPP_PORT, GOOGLE_MEET_PORT],
})
export class IntegracoesModule {}
