// Adapter real do Google Meet via Google Calendar API v3.
// Ativa quando GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET + GOOGLE_REFRESH_TOKEN estiverem no ambiente.
// A conta Google usada deve ter o Calendar API habilitado no Google Cloud Console.
// Escopo necessário: https://www.googleapis.com/auth/calendar.events
import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { GoogleMeetInput, GoogleMeetLink, GoogleMeetPort } from '../ports';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

@Injectable()
export class GoogleMeetService implements GoogleMeetPort {
  private readonly logger = new Logger(GoogleMeetService.name);

  constructor(
    private readonly clientId: string,
    private readonly clientSecret: string,
    private readonly refreshToken: string,
    // ID do calendário onde criar os eventos (padrão: "primary")
    private readonly calendarId = 'primary',
  ) {}

  async criarMeet(input: GoogleMeetInput): Promise<GoogleMeetLink> {
    const accessToken = await this.obterAccessToken();
    const inicio = new Date(input.inicio);
    const fim = new Date(inicio.getTime() + (input.duracaoMinutos ?? 60) * 60_000);

    const body = {
      summary: input.titulo,
      start: { dateTime: inicio.toISOString() },
      end: { dateTime: fim.toISOString() },
      attendees: (input.convidados ?? []).map((email) => ({ email })),
      conferenceData: {
        createRequest: {
          requestId: randomUUID(),
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
    };

    const resp = await fetch(
      `${CALENDAR_API}/calendars/${encodeURIComponent(this.calendarId)}/events?conferenceDataVersion=1`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
      },
    );

    if (!resp.ok) {
      const txt = await resp.text();
      throw new Error(`Google Calendar POST event ${resp.status}: ${txt.slice(0, 300)}`);
    }

    const evento = (await resp.json()) as GoogleCalendarEventRaw;
    const meetLink = evento.hangoutLink ?? evento.conferenceData?.entryPoints?.[0]?.uri;

    if (!meetLink) {
      throw new Error('Google Calendar retornou evento sem hangoutLink — verifique escopo do OAuth.');
    }

    this.logger.log(`Meet criado: ${meetLink} (eventoId=${evento.id})`);
    return { meetLink, eventoId: evento.id };
  }

  private async obterAccessToken(): Promise<string> {
    const resp = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: this.refreshToken,
      }),
    });
    if (!resp.ok) {
      const txt = await resp.text();
      throw new Error(`Google OAuth token refresh ${resp.status}: ${txt.slice(0, 200)}`);
    }
    const json = (await resp.json()) as { access_token: string };
    return json.access_token;
  }
}

interface GoogleCalendarEventRaw {
  id: string;
  hangoutLink?: string;
  conferenceData?: {
    entryPoints?: Array<{ uri: string; entryPointType: string }>;
  };
}
