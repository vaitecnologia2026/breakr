// Integracao com o Google Agenda (Service Account) para gerar o link do Google
// Meet ao criar um agendamento. Assina o JWT da conta de servico com o modulo
// nativo `crypto` e chama a REST API do Google Calendar (sem dependencia npm).
// Best-effort: se a integracao nao estiver configurada ou falhar, retorna null e
// o agendamento e criado normalmente (sem link).
import { Injectable, Logger } from '@nestjs/common';
import { createSign, randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

const CONFIG_ID = '00000000-0000-0000-0000-000000000001';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/calendar.events';
const TIME_ZONE = 'America/Sao_Paulo';

interface ConfigGoogle {
  serviceAccountJson: string | null;
  calendarId: string | null;
  impersonateEmail: string | null;
}

export interface ResultadoMeet {
  meetLink: string | null;
  eventId: string | null;
  htmlLink: string | null;
}

@Injectable()
export class GoogleAgendaService {
  private readonly logger = new Logger(GoogleAgendaService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Le a config do Google em Config.parametros.integracoes.google (mesma origem
  // da tela Configuracoes -> Integracoes).
  private async lerConfig(): Promise<ConfigGoogle> {
    const config = await this.prisma.config.findUnique({ where: { id: CONFIG_ID } });
    const params = (config?.parametros as Record<string, unknown>) ?? {};
    const integ = (params.integracoes as Record<string, unknown>) ?? {};
    const google = (integ.google as Partial<ConfigGoogle>) ?? {};
    return {
      serviceAccountJson: google.serviceAccountJson ?? null,
      calendarId: google.calendarId ?? null,
      impersonateEmail: google.impersonateEmail ?? null,
    };
  }

  private base64url(input: string | Buffer): string {
    return Buffer.from(input).toString('base64url');
  }

  // Gera um access_token OAuth2 assinando um JWT (RS256) da Service Account.
  private async obterAccessToken(clientEmail: string, privateKey: string, impersonateEmail: string | null): Promise<string> {
    const agora = Math.floor(Date.now() / 1000);
    const header = { alg: 'RS256', typ: 'JWT' };
    const claims: Record<string, unknown> = {
      iss: clientEmail,
      scope: SCOPE,
      aud: TOKEN_URL,
      iat: agora,
      exp: agora + 3600,
    };
    if (impersonateEmail) claims.sub = impersonateEmail;

    const conteudo = `${this.base64url(JSON.stringify(header))}.${this.base64url(JSON.stringify(claims))}`;
    const assinatura = createSign('RSA-SHA256').update(conteudo).sign(privateKey, 'base64url');
    const jwt = `${conteudo}.${assinatura}`;

    const corpo = new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    });
    const resp = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: corpo.toString(),
    });
    if (!resp.ok) {
      const txt = await resp.text().catch(() => '');
      throw new Error(`Falha ao obter token do Google (${resp.status}): ${txt.slice(0, 300)}`);
    }
    const data = (await resp.json()) as { access_token?: string };
    if (!data.access_token) throw new Error('Resposta do Google sem access_token');
    return data.access_token;
  }

  // Cria um evento no Google Agenda com Google Meet e devolve o link. Retorna
  // null quando a integracao nao esta configurada ou em caso de erro (best-effort).
  async criarEventoMeet(dados: { titulo: string; inicioIso: string; fimIso: string; descricao?: string | null }): Promise<ResultadoMeet | null> {
    const cfg = await this.lerConfig();
    if (!cfg.serviceAccountJson) return null;

    try {
      const sa = JSON.parse(cfg.serviceAccountJson) as { client_email?: string; private_key?: string };
      if (!sa.client_email || !sa.private_key) {
        this.logger.warn('Service Account do Google invalida (sem client_email/private_key).');
        return null;
      }

      const token = await this.obterAccessToken(sa.client_email, sa.private_key, cfg.impersonateEmail);
      const calendarId = cfg.calendarId || cfg.impersonateEmail || 'primary';

      const corpo = {
        summary: dados.titulo,
        description: dados.descricao ?? undefined,
        start: { dateTime: dados.inicioIso, timeZone: TIME_ZONE },
        end: { dateTime: dados.fimIso, timeZone: TIME_ZONE },
        conferenceData: {
          createRequest: {
            requestId: randomUUID(),
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
      };

      const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?conferenceDataVersion=1`;
      const resp = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(corpo),
      });
      if (!resp.ok) {
        const txt = await resp.text().catch(() => '');
        this.logger.warn(`Falha ao criar evento no Google (${resp.status}): ${txt.slice(0, 300)}`);
        return null;
      }
      const evento = (await resp.json()) as {
        id?: string;
        hangoutLink?: string;
        htmlLink?: string;
        conferenceData?: { entryPoints?: Array<{ entryPointType?: string; uri?: string }> };
      };
      const meetPorEntry = evento.conferenceData?.entryPoints?.find((e) => e.entryPointType === 'video')?.uri ?? null;
      return {
        meetLink: evento.hangoutLink ?? meetPorEntry,
        eventId: evento.id ?? null,
        htmlLink: evento.htmlLink ?? null,
      };
    } catch (e) {
      this.logger.warn(`Erro na integracao Google Agenda: ${(e as Error).message}`);
      return null;
    }
  }
}
