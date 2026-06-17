// Serviço de contas a pagar (financeiro interno).
import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CriarContaDto } from './dto/criar-conta.dto';

@Injectable()
export class ContasPagarService {
  constructor(private readonly prisma: PrismaService) {}

  listar() {
    return this.prisma.contaPagar.findMany({ orderBy: [{ pago: 'asc' }, { vencimento: 'asc' }] });
  }

  async resumo(): Promise<{ aPagarTotal: number; aPagarMes: number; vencidas: number }> {
    const agora = new Date();
    const fimMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 0, 23, 59, 59);
    const pendentes = await this.prisma.contaPagar.findMany({
      where: { pago: false },
      select: { valor: true, vencimento: true },
    });
    const soma = (arr: { valor: Prisma.Decimal }[]) => arr.reduce((s, c) => s + Number(c.valor), 0);
    return {
      aPagarTotal: soma(pendentes),
      aPagarMes: soma(pendentes.filter((c) => c.vencimento <= fimMes)),
      vencidas: pendentes.filter((c) => c.vencimento < agora).length,
    };
  }

  criar(dto: CriarContaDto) {
    return this.prisma.contaPagar.create({
      data: {
        descricao: dto.descricao,
        categoria: dto.categoria,
        valor: new Prisma.Decimal(dto.valor),
        vencimento: new Date(dto.vencimento),
      },
    });
  }

  async marcarPago(id: string, pago: boolean) {
    await this.garantir(id);
    return this.prisma.contaPagar.update({
      where: { id },
      data: { pago, pagoEm: pago ? new Date() : null },
    });
  }

  async remover(id: string) {
    await this.garantir(id);
    await this.prisma.contaPagar.delete({ where: { id } });
    return { ok: true };
  }

  private async garantir(id: string) {
    const c = await this.prisma.contaPagar.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('Conta nao encontrada');
    return c;
  }
}
