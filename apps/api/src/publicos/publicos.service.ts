import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CriarPublicoDto } from './dto/criar-publico.dto';
import { AtualizarPublicoDto } from './dto/atualizar-publico.dto';

@Injectable()
export class PublicosService {
  constructor(private readonly prisma: PrismaService) {}

  listar() {
    return this.prisma.publico.findMany({
      orderBy: [{ ativo: 'desc' }, { criadoEm: 'desc' }],
      take: 300,
    });
  }

  criar(dto: CriarPublicoDto, criadoPorId?: string) {
    return this.prisma.publico.create({
      data: {
        nome: dto.nome,
        clienteId: dto.clienteId ?? null,
        personaId: dto.personaId ?? null,
        tamanho: dto.tamanho ?? null,
        tipoSegmentacao:
          (dto.tipoSegmentacao as Prisma.PublicoCreateInput['tipoSegmentacao']) ??
          null,
        prioridade:
          (dto.prioridade as Prisma.PublicoCreateInput['prioridade']) ??
          undefined,
        idMeta: dto.idMeta ?? null,
        importadoMeta: dto.importadoMeta ?? false,
        ativo: dto.ativo ?? true,
        criadoPorId: criadoPorId ?? null,
      },
    });
  }

  async atualizar(id: string, dto: AtualizarPublicoDto) {
    await this.garantirExiste(id);
    return this.prisma.publico.update({
      where: { id },
      data: {
        ...(dto.nome !== undefined ? { nome: dto.nome } : {}),
        ...(dto.clienteId !== undefined ? { clienteId: dto.clienteId } : {}),
        ...(dto.personaId !== undefined ? { personaId: dto.personaId } : {}),
        ...(dto.tamanho !== undefined ? { tamanho: dto.tamanho } : {}),
        ...(dto.tipoSegmentacao !== undefined
          ? {
              tipoSegmentacao:
                dto.tipoSegmentacao as Prisma.PublicoUpdateInput['tipoSegmentacao'],
            }
          : {}),
        ...(dto.prioridade !== undefined
          ? {
              prioridade:
                dto.prioridade as Prisma.PublicoUpdateInput['prioridade'],
            }
          : {}),
        ...(dto.idMeta !== undefined ? { idMeta: dto.idMeta } : {}),
        ...(dto.importadoMeta !== undefined
          ? { importadoMeta: dto.importadoMeta }
          : {}),
        ...(dto.ativo !== undefined ? { ativo: dto.ativo } : {}),
      },
    });
  }

  async remover(id: string) {
    await this.garantirExiste(id);
    await this.prisma.publico.delete({ where: { id } });
    return { ok: true };
  }

  private async garantirExiste(id: string) {
    const p = await this.prisma.publico.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('Público não encontrado.');
    return p;
  }
}
