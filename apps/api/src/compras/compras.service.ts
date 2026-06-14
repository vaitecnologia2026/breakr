// Servico de compras — solicitacoes de compra (Operacoes, M20). Uma Compra
// percorre o fluxo SOLICITADA -> APROVADA -> COMPRADA -> RECEBIDA.
import { Injectable, NotFoundException } from '@nestjs/common';
import { Compra, Prisma, StatusCompra } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CodigoUnicoService } from '../common/codigo-unico/codigo-unico.service';
import { CriarCompraDto } from './dto/criar-compra.dto';

@Injectable()
export class ComprasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly codigoUnico: CodigoUnicoService,
  ) {}

  // Cria a solicitacao com status SOLICITADA e codigo unico gerado (prefixo
  // CMP).
  criar(dto: CriarCompraDto): Promise<Compra> {
    return this.prisma.compra.create({
      data: {
        descricao: dto.descricao,
        categoria: dto.categoria,
        fornecedor: dto.fornecedor,
        solicitanteId: dto.solicitanteId,
        status: StatusCompra.SOLICITADA,
        valor: new Prisma.Decimal(dto.valor),
        codigoUnico: this.codigoUnico.gerar('CMP'),
      },
    });
  }

  // Lista as solicitacoes (mais recentes primeiro), com filtro opcional por
  // status.
  listar(filtro?: { status?: StatusCompra }): Promise<Compra[]> {
    const where: Prisma.CompraWhereInput = {};
    if (filtro?.status !== undefined) {
      where.status = filtro.status;
    }
    return this.prisma.compra.findMany({
      where,
      include: {
        solicitante: { select: { nome: true } },
      },
      orderBy: { criadoEm: 'desc' },
    });
  }

  // Busca uma solicitacao pelo id.
  async obter(id: string): Promise<Compra> {
    const compra = await this.prisma.compra.findUnique({
      where: { id },
      include: {
        solicitante: { select: { nome: true } },
      },
    });
    if (!compra) {
      throw new NotFoundException('Compra nao encontrada');
    }
    return compra;
  }

  // Move a solicitacao para outro status do fluxo.
  async moverStatus(id: string, novoStatus: StatusCompra): Promise<Compra> {
    await this.obter(id);
    await this.prisma.compra.update({
      where: { id },
      data: { status: novoStatus },
    });
    return this.obter(id);
  }
}
