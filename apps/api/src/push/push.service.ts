// Servico de push (FCM via firebase-admin). Registra/remove tokens de dispositivo
// e envia notificacoes para todos os dispositivos de um usuario.
//
// Inicializacao lazy e defensiva: se FIREBASE_SERVICE_ACCOUNT nao estiver
// configurado, o servico continua funcionando (subscribe/unsubscribe gravam no
// banco), mas o envio vira no-op logado. Assim o app pode registrar tokens antes
// mesmo de o backend ter as credenciais do Firebase, e nada quebra.
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type { app as FirebaseApp, messaging } from 'firebase-admin';
import { PrismaService } from '../prisma/prisma.service';

export interface PushPayload {
  titulo: string;
  mensagem: string;
  link?: string;
  tipo?: string;
}

@Injectable()
export class PushService implements OnModuleInit {
  private readonly logger = new Logger(PushService.name);
  private app: FirebaseApp.App | null = null;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit(): void {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) {
      this.logger.warn(
        'FIREBASE_SERVICE_ACCOUNT ausente — push desabilitado (tokens ainda sao registrados).',
      );
      return;
    }
    try {
      // Import dinamico: firebase-admin so e carregado quando ha credenciais,
      // evitando custo em ambientes sem push (ex.: dev/testes).
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const admin = require('firebase-admin') as typeof import('firebase-admin');
      const credentials = JSON.parse(raw);
      this.app =
        admin.apps.length > 0
          ? admin.app()
          : admin.initializeApp({ credential: admin.credential.cert(credentials) });
      this.logger.log('Firebase Admin inicializado — push habilitado.');
    } catch (err) {
      this.logger.error(
        `Falha ao inicializar Firebase Admin — push desabilitado: ${(err as Error).message}`,
      );
      this.app = null;
    }
  }

  get habilitado(): boolean {
    return this.app !== null;
  }

  /** Registra (ou revalida) um token de dispositivo para o usuario. Idempotente. */
  async registrarToken(
    usuarioId: string,
    token: string,
    plataforma = 'android',
  ): Promise<{ ok: true }> {
    await this.prisma.pushToken.upsert({
      where: { token },
      create: { usuarioId, token, plataforma },
      update: { usuarioId, plataforma },
    });
    return { ok: true };
  }

  /** Remove um token (logout / app desinstalado / token invalido). */
  async removerToken(token: string): Promise<{ ok: true }> {
    await this.prisma.pushToken.deleteMany({ where: { token } });
    return { ok: true };
  }

  /**
   * Envia um push para todos os dispositivos do usuario. Nunca lanca: falhas sao
   * logadas e engolidas para nao quebrar o fluxo que originou a notificacao.
   * Tokens rejeitados pelo FCM (unregistered/invalid) sao removidos do banco.
   */
  async enviarParaUsuario(usuarioId: string, payload: PushPayload): Promise<void> {
    if (!this.app) return;
    const tokens = await this.prisma.pushToken.findMany({
      where: { usuarioId },
      select: { token: true },
    });
    if (tokens.length === 0) return;

    const lista = tokens.map((t) => t.token);
    try {
      const messaging = this.app.messaging();
      const resposta = await messaging.sendEachForMulticast({
        tokens: lista,
        notification: { title: payload.titulo, body: payload.mensagem },
        data: {
          ...(payload.link ? { link: payload.link } : {}),
          ...(payload.tipo ? { tipo: payload.tipo } : {}),
        },
        android: { priority: 'high' },
        apns: { payload: { aps: { sound: 'default' } } },
      });
      await this.limparTokensInvalidos(lista, resposta);
    } catch (err) {
      this.logger.error(`Falha ao enviar push para ${usuarioId}: ${(err as Error).message}`);
    }
  }

  private async limparTokensInvalidos(
    tokens: string[],
    resposta: messaging.BatchResponse,
  ): Promise<void> {
    const invalidos: string[] = [];
    resposta.responses.forEach((r, i) => {
      const code = r.error?.code ?? '';
      if (
        code === 'messaging/registration-token-not-registered' ||
        code === 'messaging/invalid-argument'
      ) {
        invalidos.push(tokens[i]);
      }
    });
    if (invalidos.length > 0) {
      await this.prisma.pushToken.deleteMany({ where: { token: { in: invalidos } } });
      this.logger.log(`Removidos ${invalidos.length} token(s) de push invalido(s).`);
    }
  }
}
