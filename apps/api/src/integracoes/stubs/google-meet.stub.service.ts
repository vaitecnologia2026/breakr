// STUB do Google Meet. Loga e devolve um link fake.
// Impl real ativa com GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET + GOOGLE_REFRESH_TOKEN.
import { Injectable, Logger } from '@nestjs/common';
import { GoogleMeetInput, GoogleMeetLink, GoogleMeetPort } from '../ports';
import { fakeId } from './fake.util';

@Injectable()
export class GoogleMeetStubService implements GoogleMeetPort {
  private readonly logger = new Logger(GoogleMeetStubService.name);

  async criarMeet(input: GoogleMeetInput): Promise<GoogleMeetLink> {
    const eventoId = fakeId('evt');
    const codigo = `${eventoId.slice(4, 7)}-${eventoId.slice(7, 11)}-${eventoId.slice(11, 15)}`;
    this.logger.log(
      `[STUB] criarMeet titulo="${input.titulo}" inicio="${input.inicio}" ` +
        `duração=${input.duracaoMinutos ?? 60}min convidados=${(input.convidados ?? []).length}`,
    );
    return {
      meetLink: `https://meet.google.com/${codigo}`,
      eventoId,
    };
  }
}
