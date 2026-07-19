// Serviço de processos jurídicos (contencioso). Domínio novo e independente.
import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CriarProcessoDto } from './dto/criar-processo.dto';
import { AtualizarProcessoDto } from './dto/atualizar-processo.dto';

@Injectable()
export class ProcessosJuridicosService {
  constructor(private readonly prisma: PrismaService) {}

  listar() {
    return this.prisma.processoJuridico.findMany({
      orderBy: [{ status: 'asc' }, { criadoEm: 'desc' }],
    });
  }

  criar(dto: CriarProcessoDto) {
    return this.prisma.processoJuridico.create({
      data: {
        numero: dto.numero,
        parte: dto.parte,
        vara: dto.vara ?? null,
        fase: dto.fase ?? null,
        status: dto.status,
        valorCausa: dto.valorCausa != null ? new Prisma.Decimal(dto.valorCausa) : null,
        proximoPrazo: dto.proximoPrazo ? new Date(dto.proximoPrazo) : null,
        observacao: dto.observacao ?? null,
      },
    });
  }

  async atualizar(id: string, dto: AtualizarProcessoDto) {
    await this.garantir(id);
    return this.prisma.processoJuridico.update({
      where: { id },
      data: {
        numero: dto.numero,
        parte: dto.parte,
        vara: dto.vara,
        fase: dto.fase,
        status: dto.status,
        valorCausa: dto.valorCausa != null ? new Prisma.Decimal(dto.valorCausa) : undefined,
        proximoPrazo: dto.proximoPrazo ? new Date(dto.proximoPrazo) : undefined,
        observacao: dto.observacao,
      },
    });
  }

  async remover(id: string) {
    await this.garantir(id);
    await this.prisma.processoJuridico.delete({ where: { id } });
    return { ok: true };
  }

  private async garantir(id: string) {
    const p = await this.prisma.processoJuridico.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('Processo nao encontrado');
    return p;
  }
}
