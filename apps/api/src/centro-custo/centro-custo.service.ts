// Centro de custo (financeiro interno, req. l.469-476). Cada categoria tem um
// teto de gasto configuravel; o gasto realizado e AGREGADO das Compras de mesma
// categoria (sem alterar o modelo Compra — leitura apenas). Aditivo.
import { Injectable, NotFoundException } from '@nestjs/common';
import { CentroCusto, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CriarCentroCustoDto } from './dto/centro-custo.dto';
import { AtualizarCentroCustoDto } from './dto/centro-custo.dto';

@Injectable()
export class CentroCustoService {
  constructor(private readonly prisma: PrismaService) {}

  listar(): Promise<CentroCusto[]> {
    return this.prisma.centroCusto.findMany({ orderBy: { criadoEm: 'desc' } });
  }

  async obter(id: string): Promise<CentroCusto> {
    const cc = await this.prisma.centroCusto.findUnique({ where: { id } });
    if (!cc) throw new NotFoundException('Centro de custo nao encontrado');
    return cc;
  }

  criar(dto: CriarCentroCustoDto): Promise<CentroCusto> {
    return this.prisma.centroCusto.create({
      data: {
        nome: dto.nome,
        categoria: dto.categoria,
        teto: dto.teto !== undefined ? new Prisma.Decimal(dto.teto) : undefined,
      },
    });
  }

  async atualizar(id: string, dto: AtualizarCentroCustoDto): Promise<CentroCusto> {
    await this.obter(id);
    return this.prisma.centroCusto.update({
      where: { id },
      data: {
        nome: dto.nome,
        categoria: dto.categoria,
        teto: dto.teto !== undefined ? new Prisma.Decimal(dto.teto) : undefined,
        ativo: dto.ativo,
      },
    });
  }

  // Resumo: para cada centro ativo, soma as Compras de mesma categoria (gasto)
  // e compara com o teto. status = 'ok' | 'estourado' | 'sem_teto'.
  async resumo() {
    const centros = await this.prisma.centroCusto.findMany({
      where: { ativo: true },
      orderBy: { nome: 'asc' },
    });
    const resultado: {
      id: string;
      nome: string;
      categoria: string | null;
      teto: number | null;
      gasto: number;
      saldo: number | null;
      status: 'ok' | 'estourado' | 'sem_teto';
    }[] = [];
    for (const c of centros) {
      let gasto = 0;
      if (c.categoria) {
        const agg = await this.prisma.compra.aggregate({
          where: { categoria: c.categoria },
          _sum: { valor: true },
        });
        gasto = agg._sum.valor ? Number(agg._sum.valor) : 0;
      }
      const teto = c.teto !== null ? Number(c.teto) : null;
      const status: 'ok' | 'estourado' | 'sem_teto' =
        teto === null ? 'sem_teto' : gasto > teto ? 'estourado' : 'ok';
      const saldo = teto !== null ? teto - gasto : null;
      resultado.push({ id: c.id, nome: c.nome, categoria: c.categoria, teto, gasto, saldo, status });
    }
    return resultado;
  }
}
