// STUB da Speed (NF-e, Fase 0). Loga e devolve uma NF fake "processando".
// Impl real entra com a SPEED_API_KEY do cofre — ver IntegracoesModule.
import { Injectable, Logger } from '@nestjs/common';
import { SpeedNota, SpeedNotaInput, SpeedPort } from '../ports';
import { fakeId } from './fake.util';

@Injectable()
export class SpeedStubService implements SpeedPort {
  private readonly logger = new Logger(SpeedStubService.name);

  async emitirNota(input: SpeedNotaInput): Promise<SpeedNota> {
    this.logger.log(
      `[STUB] emitirNota cliente=${input.clienteId} valor=${input.valor} ` +
        `servico="${input.descricaoServico}"`,
    );
    const id = fakeId('nfe');
    return {
      id,
      status: 'PROCESSANDO',
      linkPdf: `https://stub.speed/nfe/${id}.pdf`,
    };
  }
}
