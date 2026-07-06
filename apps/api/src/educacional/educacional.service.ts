// Serviço educacional — catálogo de cursos/treinamentos (links externos).
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CriarCursoDto } from './dto/criar-curso.dto';

@Injectable()
export class EducacionalService {
  constructor(private readonly prisma: PrismaService) {}

  // Lista cursos ativos (visão de todos os usuários).
  listar() {
    return this.prisma.cursoEducacional.findMany({
      where: { ativo: true },
      orderBy: { criadoEm: 'desc' },
    });
  }

  criar(dto: CriarCursoDto) {
    return this.prisma.cursoEducacional.create({
      data: {
        titulo: dto.titulo,
        descricao: dto.descricao,
        url: dto.url,
        plataforma: dto.plataforma,
        tipoAcesso: dto.tipoAcesso,
      },
    });
  }

  async remover(id: string) {
    const curso = await this.prisma.cursoEducacional.findUnique({ where: { id } });
    if (!curso) throw new NotFoundException('Curso nao encontrado');
    await this.prisma.cursoEducacional.delete({ where: { id } });
    return { ok: true };
  }
}
