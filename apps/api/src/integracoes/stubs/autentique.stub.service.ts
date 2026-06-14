// STUB do Autentique (assinatura, Fase 0). Loga e devolve um documento fake
// "pendente" com link de assinatura. O retorno de "assinado" real chega por
// webhook -> evento contrato.assinado (doc 04). Impl real com AUTENTIQUE_TOKEN.
import { Injectable, Logger } from '@nestjs/common';
import {
  AutentiqueAssinaturaInput,
  AutentiqueDocumento,
  AutentiquePort,
} from '../ports';
import { fakeId } from './fake.util';

@Injectable()
export class AutentiqueStubService implements AutentiquePort {
  private readonly logger = new Logger(AutentiqueStubService.name);

  async enviarParaAssinatura(
    input: AutentiqueAssinaturaInput,
  ): Promise<AutentiqueDocumento> {
    this.logger.log(
      `[STUB] enviarParaAssinatura doc="${input.nomeDocumento}" ` +
        `signatarios=${input.signatarios.length}`,
    );
    const id = fakeId('doc');
    return {
      id,
      status: 'PENDENTE',
      linkAssinatura: `https://stub.autentique/assinar/${id}`,
    };
  }
}
