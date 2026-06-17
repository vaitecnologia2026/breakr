// Serviço de inventário interno (equipamentos/materiais da empresa).
import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CriarItemDto } from './dto/criar-item.dto';

@Injectable()
export class InventarioService {
  constructor(private readonly prisma: PrismaService) {}

  listar() {
    return this.prisma.itemInventario.findMany({
      orderBy: { criadoEm: 'desc' },
      include: { responsavel: { select: { nome: true } } },
    });
  }

  criar(dto: CriarItemDto) {
    return this.prisma.itemInventario.create({
      data: {
        nome: dto.nome,
        categoria: dto.categoria,
        valor: dto.valor !== undefined ? new Prisma.Decimal(dto.valor) : undefined,
        notaFiscalUrl: dto.notaFiscalUrl,
        plaqueta: dto.plaqueta,
        responsavelId: dto.responsavelId,
      },
      include: { responsavel: { select: { nome: true } } },
    });
  }

  // Marca o recebimento do item pelo responsável (a "assinatura" de recebimento).
  async confirmarRecebimento(id: string) {
    await this.garantir(id);
    return this.prisma.itemInventario.update({
      where: { id },
      data: { recebidoEm: new Date() },
      include: { responsavel: { select: { nome: true } } },
    });
  }

  async remover(id: string) {
    await this.garantir(id);
    await this.prisma.itemInventario.delete({ where: { id } });
    return { ok: true };
  }

  private async garantir(id: string) {
    const item = await this.prisma.itemInventario.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Item nao encontrado');
    return item;
  }
}
