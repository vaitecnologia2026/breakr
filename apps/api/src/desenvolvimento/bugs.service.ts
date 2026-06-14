// Servico de desenvolvimento — quadro de bugs (bug board, M21). Um Bug e
// reportado, triado por severidade e percorre o fluxo ate ser resolvido/fechado.
import { Injectable, NotFoundException } from '@nestjs/common';
import { Bug, Prisma, SeveridadeBug, StatusBug } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CodigoUnicoService } from '../common/codigo-unico/codigo-unico.service';
import { CriarBugDto } from './dto/criar-bug.dto';

@Injectable()
export class BugsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly codigoUnico: CodigoUnicoService,
  ) {}

  // Cria bug com status ABERTO, severidade informada (ou MEDIA) e codigo unico
  // gerado (prefixo BUG).
  criar(dto: CriarBugDto): Promise<Bug> {
    return this.prisma.bug.create({
      data: {
        titulo: dto.titulo,
        descricao: dto.descricao,
        responsavelId: dto.responsavelId,
        severidade: dto.severidade ?? SeveridadeBug.MEDIA,
        status: StatusBug.ABERTO,
        codigoUnico: this.codigoUnico.gerar('BUG'),
      },
    });
  }

  // Lista os bugs (mais recentes primeiro), com filtro opcional por status e
  // severidade.
  listar(filtro?: {
    status?: StatusBug;
    severidade?: SeveridadeBug;
  }): Promise<Bug[]> {
    const where: Prisma.BugWhereInput = {};
    if (filtro?.status !== undefined) {
      where.status = filtro.status;
    }
    if (filtro?.severidade !== undefined) {
      where.severidade = filtro.severidade;
    }
    return this.prisma.bug.findMany({
      where,
      include: {
        responsavel: { select: { nome: true } },
      },
      orderBy: { criadoEm: 'desc' },
    });
  }

  // Busca um bug pelo id.
  async obter(id: string): Promise<Bug> {
    const bug = await this.prisma.bug.findUnique({
      where: { id },
      include: {
        responsavel: { select: { nome: true } },
      },
    });
    if (!bug) {
      throw new NotFoundException('Bug nao encontrado');
    }
    return bug;
  }

  // Move o bug para outro status do fluxo.
  async moverStatus(id: string, novoStatus: StatusBug): Promise<Bug> {
    await this.obter(id);
    await this.prisma.bug.update({
      where: { id },
      data: { status: novoStatus },
    });
    return this.obter(id);
  }
}
