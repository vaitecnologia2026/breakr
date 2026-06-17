// Serviço de avaliações de desempenho do time.
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CriarDesempenhoDto } from './dto/criar-desempenho.dto';

@Injectable()
export class DesempenhoService {
  constructor(private readonly prisma: PrismaService) {}

  // Avaliações do próprio colaborador.
  meus(usuarioId: string) {
    return this.prisma.avaliacaoDesempenho.findMany({
      where: { colaboradorId: usuarioId },
      orderBy: { criadoEm: 'desc' },
      include: { avaliador: { select: { nome: true } } },
    });
  }

  // Visão da liderança (opcionalmente por colaborador).
  listar(colaboradorId?: string) {
    return this.prisma.avaliacaoDesempenho.findMany({
      where: colaboradorId ? { colaboradorId } : undefined,
      orderBy: { criadoEm: 'desc' },
      include: {
        colaborador: { select: { nome: true } },
        avaliador: { select: { nome: true } },
      },
    });
  }

  criar(dto: CriarDesempenhoDto, avaliadorId: string) {
    return this.prisma.avaliacaoDesempenho.create({
      data: {
        colaboradorId: dto.colaboradorId,
        periodo: dto.periodo,
        nota: dto.nota,
        comentario: dto.comentario,
        avaliadorId,
      },
    });
  }

  async remover(id: string) {
    const av = await this.prisma.avaliacaoDesempenho.findUnique({ where: { id } });
    if (!av) throw new NotFoundException('Avaliacao nao encontrada');
    await this.prisma.avaliacaoDesempenho.delete({ where: { id } });
    return { ok: true };
  }
}
