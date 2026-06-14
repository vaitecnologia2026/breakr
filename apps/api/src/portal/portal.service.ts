// Servico do portal do cliente. Monta a visao READ-ONLY que o cliente final
// (dono do restaurante) ve em /portal/:codigo — onboarding, contrato e faturas.
// Devolve apenas dados operacionais do proprio cliente, nada interno.
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { StatusConteudo } from '@prisma/client';
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
        // Pecas aguardando o aval do cliente (M18 — aprovacao no portal).
        conteudos: {
          where: { status: StatusConteudo.APROVACAO_CLIENTE },
          orderBy: { criadoEm: 'desc' },
        },
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
      conteudosParaAprovar: cliente.conteudos.map((c) => ({
        id: c.id,
        titulo: c.titulo,
        descricao: c.descricao,
        tipo: c.tipo,
        codigoUnico: c.codigoUnico,
      })),
    };
  }

  // Carrega a peca garantindo que pertence ao cliente do portal e que esta
  // mesmo aguardando aprovacao — evita que um link aprove peca de outro.
  private async conteudoDoCliente(codigo: string, conteudoId: string) {
    const cliente = await this.prisma.cliente.findUnique({
      where: { codigoUnico: codigo },
    });
    if (!cliente) {
      throw new NotFoundException('Portal nao encontrado');
    }
    const conteudo = await this.prisma.conteudo.findUnique({
      where: { id: conteudoId },
    });
    if (!conteudo || conteudo.clienteId !== cliente.id) {
      throw new NotFoundException('Peca nao encontrada neste portal');
    }
    if (conteudo.status !== StatusConteudo.APROVACAO_CLIENTE) {
      throw new BadRequestException('Esta peca nao esta aguardando aprovacao');
    }
    return conteudo;
  }

  // Cliente aprova a peca: avalia (1..5), comenta e a peca segue para AGENDADO.
  async aprovar(
    codigo: string,
    conteudoId: string,
    dados: { estrelas: number; comentario?: string },
  ) {
    await this.conteudoDoCliente(codigo, conteudoId);
    return this.prisma.conteudo.update({
      where: { id: conteudoId },
      data: {
        status: StatusConteudo.AGENDADO,
        estrelas: dados.estrelas,
        comentarioCliente: dados.comentario,
        aprovadoEm: new Date(),
      },
    });
  }

  // Cliente pede ajuste: a peca volta para PRODUCAO e conta um rework.
  async solicitarAjuste(
    codigo: string,
    conteudoId: string,
    dados: { comentario: string },
  ) {
    await this.conteudoDoCliente(codigo, conteudoId);
    return this.prisma.conteudo.update({
      where: { id: conteudoId },
      data: {
        status: StatusConteudo.PRODUCAO,
        comentarioCliente: dados.comentario,
        reworkCount: { increment: 1 },
      },
    });
  }
}
