// Adapter real do WhatsApp via MegaAPI.
// Ativa quando WHATSAPP_TOKEN e MEGAAPI_INSTANCE estiverem no ambiente.
// Ref: https://docs.megaapi.com.br
import { Injectable, Logger } from '@nestjs/common';
import {
  WhatsappGrupo,
  WhatsappGrupoInput,
  WhatsappMensagem,
  WhatsappMensagemInput,
  WhatsappPort,
} from '../ports';

@Injectable()
export class WhatsappMegaService implements WhatsappPort {
  private readonly logger = new Logger(WhatsappMegaService.name);
  private readonly base: string;
  private readonly token: string;

  constructor(token: string, instancia: string) {
    this.token = token;
    this.base = `https://app.megaapi.com.br/rest/${instancia}`;
  }

  async enviarMensagem(input: WhatsappMensagemInput): Promise<WhatsappMensagem> {
    // Destinos de grupo usam o sufixo @g.us; numeros individuais sao E.164.
    const isGrupo = input.destino.endsWith('@g.us');

    if (input.midiaUrl) {
      const body: Record<string, unknown> = {
        number: input.destino,
        caption: input.texto ?? '',
        image: input.midiaUrl,
      };
      const res = await this.post('/sendImage', body);
      return { id: String(res.messageId ?? res.id ?? ''), status: 'ENVIADA' };
    }

    const endpoint = isGrupo ? '/sendTextGroup' : '/sendText';
    const body = isGrupo
      ? { groupId: input.destino, message: input.texto ?? '' }
      : { number: input.destino, text: input.texto ?? '' };

    const res = await this.post(endpoint, body);
    return { id: String(res.messageId ?? res.id ?? ''), status: 'ENVIADA' };
  }

  async criarGrupo(input: WhatsappGrupoInput): Promise<WhatsappGrupo> {
    const body = {
      name: input.nome,
      phones: input.participantes,
    };
    const res = await this.post('/createGroup', body);
    const waGroupId: string = String(res.groupId ?? res.id ?? `${input.nome.replace(/\s/g, '')}@g.us`);
    return { waGroupId, nome: input.nome };
  }

  private async post(path: string, body: unknown): Promise<Record<string, unknown>> {
    const url = `${this.base}${path}`;
    this.logger.debug(`POST ${url}`);
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      const txt = await resp.text();
      throw new Error(`MegaAPI ${path} ${resp.status}: ${txt.slice(0, 200)}`);
    }
    return (await resp.json()) as Record<string, unknown>;
  }
}
