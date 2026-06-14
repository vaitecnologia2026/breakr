// Servico do portal do cliente. Monta a visao READ-ONLY que o cliente final
// (dono do restaurante) ve em /portal/:codigo — onboarding, contrato e faturas.
// Devolve apenas dados operacionais do proprio cliente, nada interno.
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PortalService {
  constructor(private readonly prisma: PrismaService) {}

  async obterPorCodigo(codigo: string) {
    const cliente = await this.prisma.cliente.findUnique({
      where: { codigoUnico: codigo },
      include: {
        squad: { select: { nome: true } },
        plano: { select: { nome: true } },
        onboarding: { include: { etapas: { orderBy: { ordem: 'asc' } } } },
        contratos: { orderBy: { criadoEm: 'desc' }, take: 1 },
        faturas: { orderBy: { criadoEm: 'desc' } },
      },
    });
    if (!cliente) {
      throw new NotFoundException('Portal nao encontrado');
    }

    const contrato = cliente.contratos[0] ?? null;

    return {
      cliente: {
        nomeFantasia: cliente.nomeFantasia,
        status: cliente.status,
        codigoUnico: cliente.codigoUnico,
      },
      squad: cliente.squad ? { nome: cliente.squad.nome } : null,
      plano: cliente.plano ? { nome: cliente.plano.nome } : null,
      contrato: contrato
        ? { status: contrato.status, vencimento: contrato.vencimento }
        : null,
      onboarding: cliente.onboarding
        ? {
            progresso: cliente.onboarding.progresso,
            concluido: cliente.onboarding.concluido,
            etapas: cliente.onboarding.etapas.map((e) => ({
              titulo: e.titulo,
              concluido: e.concluido,
              ordem: e.ordem,
            })),
          }
        : null,
      faturas: cliente.faturas.map((f) => ({
        codigoUnico: f.codigoUnico,
        valor: f.valor.toString(),
        vencimento: f.vencimento,
        status: f.status,
        notaFiscalUrl: f.notaFiscalUrl,
      })),
    };
  }
}
