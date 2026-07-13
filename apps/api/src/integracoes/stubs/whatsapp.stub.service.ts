// STUB do WhatsApp (Fase 0). Loga e devolve mensagem/grupo fake.
// Impl real (API oficial via WHATSAPP_TOKEN) entra depois — ver IntegracoesModule.
import { Injectable, Logger } from '@nestjs/common';
import {
  WhatsappGrupo,
  WhatsappGrupoInput,
  WhatsappMensagem,
  WhatsappMensagemInput,
  WhatsappPort,
} from '../ports';
import { fakeId } from './fake.util';

@Injectable()
export class WhatsappStubService implements WhatsappPort {
  private readonly logger = new Logger(WhatsappStubService.name);

  async enviarMensagem(
    input: WhatsappMensagemInput,
  ): Promise<WhatsappMensagem> {
    this.logger.log(
      `[STUB] enviarMensagem destino=${input.destino} ` +
        `${input.template ? `template=${input.template}` : 'texto-livre'}` +
        `${input.midiaUrl ? ' +midia' : ''}`,
    );
    return { id: fakeId('wamsg'), status: 'ENVIADA' };
  }

  async criarGrupo(input: WhatsappGrupoInput): Promise<WhatsappGrupo> {
    this.logger.log(
      `[STUB] criarGrupo nome="${input.nome}" ` +
        `participantes=${input.participantes.length}`,
    );
    return {
      waGroupId: `${fakeId('wagroup')}@g.us`,
      nome: input.nome,
    };
  }
}
