// Integracao com o Google Agenda para gerar o link do Google Meet ao criar um
// agendamento. Suporta DOIS tipos de credencial (detectados pelo JSON salvo em
// Configuracoes -> Integracoes):
//   - Cliente OAuth Web ({ "web": { client_id, client_secret, redirect_uris } }):
//     fluxo de autorizacao (botao "Conectar Google"); guarda o refresh token e o
//     usa para criar o evento na conta conectada. Funciona com conta Google comum.
//   - Service Account ({ "type": "service_account", client_email, private_key }):
//     assina um JWT (RS256) e usa domain-wide delegation (Google Workspace).
// Usa apenas modulos nativos do Node (`crypto` + `fetch`), sem dependencia npm.
// Best-effort: se nao estiver configurado ou falhar, retorna null e o agendamento
// e criado normalmente (sem link).
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { createSign, randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

const CONFIG_ID = '00000000-0000-0000-0000-000000000001';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';
const SCOPE_SA = 'https://www.googleapis.com/auth/calendar.events';
const SCOPE_OAUTH = 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.email';
const TIME_ZONE = 'America/Sao_Paulo';

interface ConfigGoogle {
  serviceAccountJson: string | null;
  calendarId: string | null;
  impersonateEmail: string | null;
  refreshToken: string | null;
  googleEmail: string | null;
}

type Credencial =
  | { tipo: 'service_account'; clientEmail: string; privateKey: string }
  | { tipo: 'oauth'; clientId: string; clientSecret: string; redirectUri: string };

export interface ResultadoMeet {
  meetLink: string | null;
  eventId: string | null;
  htmlLink: string | null;
}

@Injectable()
export class GoogleAgendaService {
  private readonly logger = new Logger(GoogleAgendaService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Le a config do Google em Config.parametros.integracoes.google.
  private async lerConfig(): Promise<ConfigGoogle> {
    const config = await this.prisma.config.findUnique({ where: { id: CONFIG_ID } });
    const params = (config?.parametros as Record<string, unknown>) ?? {};
    const integ = (params.integracoes as Record<string, unknown>) ?? {};
    const google = (integ.google as Partial<ConfigGoogle>) ?? {};
    return {
      serviceAccountJson: google.serviceAccountJson ?? null,
      calendarId: google.calendarId ?? null,
      impersonateEmail: google.impersonateEmail ?? null,
      refreshToken: google.refreshToken ?? null,
      googleEmail: google.googleEmail ?? null,
    };
  }

  // Grava campos parciais em integracoes.google preservando todo o resto.
  private async salvarGoogleParcial(patch: Record<string, unknown>): Promise<void> {
    const config = await this.prisma.config.findUnique({ where: { id: CONFIG_ID } });
    const params = (config?.parametros as Record<string, unknown>) ?? {};
    const integ = (params.integracoes as Record<string, unknown>) ?? {};
    const google = (integ.google as Record<string, unknown>) ?? {};
    const payload = {
      ...params,
      integracoes: { ...integ, google: { ...google, ...patch } },
    } as unknown as Parameters<typeof this.prisma.config.upsert>[0]['update']['parametros'];
    await this.prisma.config.upsert({
      where: { id: CONFIG_ID },
      update: { parametros: payload },
      create: { id: CONFIG_ID, branding: {}, parametros: payload },
    });
  }

  // Detecta o tipo de credencial a partir do JSON salvo.
  private parseCredencial(json: string | null): Credencial | null {
    if (!json) return null;
    try {
      const obj = JSON.parse(json) as Record<string, any>;
      if (obj.type === 'service_account' && obj.client_email && obj.private_key) {
        return { tipo: 'service_account', clientEmail: obj.client_email, privateKey: obj.private_key };
      }
      const web = obj.web ?? obj.installed;
      if (web?.client_id && web?.client_secret) {
        const redirectUri = Array.isArray(web.redirect_uris) ? web.redirect_uris[0] : web.redirect_uri;
        return { tipo: 'oauth', clientId: web.client_id, clientSecret: web.client_secret, redirectUri: redirectUri ?? '' };
      }
      return null;
    } catch {
      return null;
    }
  }

  private base64url(input: string | Buffer): string {
    return Buffer.from(input).toString('base64url');
  }

  // Um ID de calendario valido e 'primary' ou um e-mail (calendario pessoal ou
  // ...@group.calendar.google.com). Valor invalido (ex.: client_id colado por
  // engano no campo "ID do calendario") cai para o fallback, evitando 404 "Not Found".
  private resolverCalendarId(id: string | null, fallback: string): string {
    if (id && (id === 'primary' || id.includes('@'))) return id;
    if (id) this.logger.warn(`ID de calendario invalido ("${id}"); usando "${fallback}".`);
    return fallback;
  }

  // ── Service Account: gera access_token assinando um JWT (RS256) ──
  private async accessTokenServiceAccount(clientEmail: string, privateKey: string, impersonateEmail: string | null): Promise<string> {
    const agora = Math.floor(Date.now() / 1000);
    const header = { alg: 'RS256', typ: 'JWT' };
    const claims: Record<string, unknown> = {
      iss: clientEmail,
      scope: SCOPE_SA,
      aud: TOKEN_URL,
      iat: agora,
      exp: agora + 3600,
    };
    if (impersonateEmail) claims.sub = impersonateEmail;

    const conteudo = `${this.base64url(JSON.stringify(header))}.${this.base64url(JSON.stringify(claims))}`;
    const assinatura = createSign('RSA-SHA256').update(conteudo).sign(privateKey, 'base64url');
    const jwt = `${conteudo}.${assinatura}`;

    const corpo = new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt });
    return this.postToken(corpo);
  }

  // ── OAuth: gera access_token a partir do refresh token ──
  private async accessTokenOAuth(cred: Extract<Credencial, { tipo: 'oauth' }>, refreshToken: string): Promise<string> {
    const corpo = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: cred.clientId,
      client_secret: cred.clientSecret,
      refresh_token: refreshToken,
    });
    return this.postToken(corpo);
  }

  private async postToken(corpo: URLSearchParams): Promise<string> {
    const resp = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: corpo.toString(),
    });
    if (!resp.ok) {
      const txt = await resp.text().catch(() => '');
      throw new Error(`Falha no token do Google (${resp.status}): ${txt.slice(0, 300)}`);
    }
    const data = (await resp.json()) as { access_token?: string };
    if (!data.access_token) throw new Error('Resposta do Google sem access_token');
    return data.access_token;
  }

  // Monta a URL de consentimento OAuth (usada pelo botao "Conectar Google").
  async gerarUrlConsentimento(): Promise<string> {
    const cfg = await this.lerConfig();
    const cred = this.parseCredencial(cfg.serviceAccountJson);
    if (cred?.tipo !== 'oauth') {
      throw new BadRequestException('Salve primeiro o JSON do cliente OAuth do Google (aba Integracoes).');
    }
    if (!cred.redirectUri) {
      throw new BadRequestException('O JSON OAuth nao tem redirect_uris configurado.');
    }
    const params = new URLSearchParams({
      client_id: cred.clientId,
      redirect_uri: cred.redirectUri,
      response_type: 'code',
      scope: SCOPE_OAUTH,
      access_type: 'offline',
      include_granted_scopes: 'true',
      prompt: 'consent',
      state: randomUUID(),
    });
    return `${AUTH_URL}?${params.toString()}`;
  }

  // Troca o "code" do callback OAuth por tokens; guarda o refresh token e o e-mail.
  async conectarComCodigo(code: string): Promise<{ email: string | null }> {
    const cfg = await this.lerConfig();
    const cred = this.parseCredencial(cfg.serviceAccountJson);
    if (cred?.tipo !== 'oauth') {
      throw new BadRequestException('Credencial OAuth do Google nao configurada.');
    }
    const corpo = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: cred.clientId,
      client_secret: cred.clientSecret,
      redirect_uri: cred.redirectUri,
    });
    const resp = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: corpo.toString(),
    });
    if (!resp.ok) {
      const txt = await resp.text().catch(() => '');
      throw new BadRequestException(`Falha ao conectar no Google (${resp.status}): ${txt.slice(0, 300)}`);
    }
    const data = (await resp.json()) as { refresh_token?: string; access_token?: string; scope?: string };
    if (!data.refresh_token) {
      throw new BadRequestException('O Google nao retornou refresh_token. Revogue o acesso do app na conta Google e conecte novamente.');
    }
    // Sem o escopo do Calendar nao da para criar o evento/Meet. Falha claro aqui
    // em vez de "conectar" sem permissao e so falhar depois (sem gerar o link).
    if (!(data.scope ?? '').includes('/auth/calendar')) {
      throw new BadRequestException(
        'A permissao do Google Calendar nao foi concedida. No Google Cloud: habilite a "Google Calendar API" e adicione o escopo .../auth/calendar.events na tela de consentimento (Data access / Escopos). Depois clique em Conectar novamente e permita o acesso a Agenda.',
      );
    }
    let email: string | null = null;
    if (data.access_token) {
      email = await this.buscarEmail(data.access_token);
    }
    await this.salvarGoogleParcial({ refreshToken: data.refresh_token, googleEmail: email });
    return { email };
  }

  private async buscarEmail(accessToken: string): Promise<string | null> {
    try {
      const resp = await fetch(USERINFO_URL, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (!resp.ok) return null;
      const data = (await resp.json()) as { email?: string };
      return data.email ?? null;
    } catch {
      return null;
    }
  }

  // Cria um evento no Google Agenda com Google Meet e devolve o link. Retorna
  // null quando nao configurado/nao conectado ou em erro (best-effort).
  async criarEventoMeet(dados: { titulo: string; inicioIso: string; fimIso: string; descricao?: string | null; attendees?: string[] }): Promise<ResultadoMeet | null> {
    const cfg = await this.lerConfig();
    const cred = this.parseCredencial(cfg.serviceAccountJson);
    if (!cred) return null;

    try {
      let token: string;
      let calendarId: string;
      if (cred.tipo === 'oauth') {
        if (!cfg.refreshToken) {
          this.logger.warn('Google OAuth configurado mas nao conectado (sem refresh token).');
          return null;
        }
        token = await this.accessTokenOAuth(cred, cfg.refreshToken);
        calendarId = this.resolverCalendarId(cfg.calendarId, 'primary');
      } else {
        token = await this.accessTokenServiceAccount(cred.clientEmail, cred.privateKey, cfg.impersonateEmail);
        calendarId = this.resolverCalendarId(cfg.calendarId, cfg.impersonateEmail || 'primary');
      }

      const corpo = {
        summary: dados.titulo,
        description: dados.descricao ?? undefined,
        start: { dateTime: dados.inicioIso, timeZone: TIME_ZONE },
        end: { dateTime: dados.fimIso, timeZone: TIME_ZONE },
        ...(dados.attendees && dados.attendees.length
          ? { attendees: dados.attendees.map((email) => ({ email })) }
          : {}),
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
