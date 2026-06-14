// STUB do Asaas (Fase 0). Loga a chamada e devolve um objeto fake plausivel.
// A impl real (HTTP para api.asaas.com com a ASAAS_API_KEY do cofre) entra
// quando a env key existir — ver IntegracoesModule.
import { Injectable, Logger } from '@nestjs/common';
import {
  AsaasCobranca,
  AsaasCobrancaInput,
  AsaasPort,
} from '../ports';
import { fakeId } from './fake.util';

@Injectable()
export class AsaasStubService implements AsaasPort {
  private readonly logger = new Logger(AsaasStubService.name);

  async criarCobranca(input: AsaasCobrancaInput): Promise<AsaasCobranca> {
    this.logger.log(
      `[STUB] criarCobranca cliente=${input.clienteId} valor=${input.valor} ` +
        `forma=${input.formaPagamento ?? 'BOLETO'}`,
    );
    const id = fakeId('pay');
    return {
      id,
      status: 'PENDING',
      valor: input.valor,
      vencimento: input.vencimento,
      linkBoleto: `https://stub.asaas/boleto/${id}`,
      pixCopiaECola: `00020126STUBPIX${id}`,
    };
  }

  async consultarBoletos(filtro?: {
    status?: string;
    clienteId?: string;
  }): Promise<AsaasCobranca[]> {
    this.logger.log(
      `[STUB] consultarBoletos status=${filtro?.status ?? 'TODOS'} ` +
        `cliente=${filtro?.clienteId ?? 'TODOS'}`,
    );
    const id = fakeId('pay');
    return [
      {
        id,
        status: filtro?.status ?? 'PENDING',
        valor: 1500,
        vencimento: new Date().toISOString().slice(0, 10),
        linkBoleto: `https://stub.asaas/boleto/${id}`,
      },
    ];
  }
}
