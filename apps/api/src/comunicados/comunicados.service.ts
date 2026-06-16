import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ComunicadosService {
  constructor(private readonly prisma: PrismaService) {}

  listar() {
    return this.prisma.comunicado.findMany({
      orderBy: [{ fixado: 'desc' }, { criadoEm: 'desc' }],
      take: 50,
      include: { autor: { select: { id: true, nome: true } } },
    });
  }

  criar(dto: { titulo: string; corpo: string; fixado?: boolean; autorId?: string }) {
    return this.prisma.comunicado.create({
      data: { titulo: dto.titulo, corpo: dto.corpo, fixado: dto.fixado ?? false, autorId: dto.autorId ?? null },
      include: { autor: { select: { id: true, nome: true } } },
    });
  }

  remover(id: string) {
    return this.prisma.comunicado.delete({ where: { id } });
  }

  alternarFixado(id: string, fixado: boolean) {
    return this.prisma.comunicado.update({ where: { id }, data: { fixado } });
  }
}
