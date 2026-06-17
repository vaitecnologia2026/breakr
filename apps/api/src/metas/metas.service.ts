// Serviço de metas trimestrais (OKRs do time).
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CriarMetaDto } from './dto/criar-meta.dto';
import { AtualizarMetaDto } from './dto/atualizar-meta.dto';

@Injectable()
export class MetasService {
  constructor(private readonly prisma: PrismaService) {}

  listar(periodo?: string) {
    return this.prisma.metaTrimestre.findMany({
      where: periodo ? { periodo } : undefined,
      orderBy: [{ periodo: 'desc' }, { criadoEm: 'desc' }],
    });
  }

  criar(dto: CriarMetaDto) {
    return this.prisma.metaTrimestre.create({
      data: { titulo: dto.titulo, descricao: dto.descricao, periodo: dto.periodo },
    });
  }

  async atualizar(id: string, dto: AtualizarMetaDto) {
    await this.garantir(id);
    return this.prisma.metaTrimestre.update({
      where: { id },
      data: {
        titulo: dto.titulo,
        descricao: dto.descricao,
        periodo: dto.periodo,
        progresso: dto.progresso,
        status: dto.status,
      },
    });
  }

  async remover(id: string) {
    await this.garantir(id);
    await this.prisma.metaTrimestre.delete({ where: { id } });
    return { ok: true };
  }

  private async garantir(id: string) {
    const meta = await this.prisma.metaTrimestre.findUnique({ where: { id } });
    if (!meta) throw new NotFoundException('Meta nao encontrada');
    return meta;
  }
}
