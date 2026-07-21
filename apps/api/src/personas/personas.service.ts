import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CriarPersonaDto } from './dto/criar-persona.dto';
import { AtualizarPersonaDto } from './dto/atualizar-persona.dto';

@Injectable()
export class PersonasService {
  constructor(private readonly prisma: PrismaService) {}

  listar() {
    return this.prisma.persona.findMany({
      orderBy: [{ ativo: 'desc' }, { criadoEm: 'desc' }],
      take: 200,
    });
  }

  criar(dto: CriarPersonaDto, criadoPorId?: string) {
    return this.prisma.persona.create({
      data: {
        nome: dto.nome,
        clienteId: dto.clienteId ?? null,
        genero: dto.genero ?? null,
        idade: dto.idade ?? null,
        relacionamento: dto.relacionamento ?? null,
        classeSocial: dto.classeSocial ?? null,
        localizacao: dto.localizacao ?? null,
        formacao: dto.formacao ?? null,
        ocupacao: dto.ocupacao ?? null,
        decisaoCompra: dto.decisaoCompra ?? null,
        comentarios: dto.comentarios ?? null,
        ativo: dto.ativo ?? true,
        criadoPorId: criadoPorId ?? null,
      },
    });
  }

  async atualizar(id: string, dto: AtualizarPersonaDto) {
    await this.garantirExiste(id);
    return this.prisma.persona.update({
      where: { id },
      data: {
        ...(dto.nome !== undefined ? { nome: dto.nome } : {}),
        ...(dto.clienteId !== undefined ? { clienteId: dto.clienteId } : {}),
        ...(dto.genero !== undefined ? { genero: dto.genero } : {}),
        ...(dto.idade !== undefined ? { idade: dto.idade } : {}),
        ...(dto.relacionamento !== undefined
          ? { relacionamento: dto.relacionamento }
          : {}),
        ...(dto.classeSocial !== undefined
          ? { classeSocial: dto.classeSocial }
          : {}),
        ...(dto.localizacao !== undefined
          ? { localizacao: dto.localizacao }
          : {}),
        ...(dto.formacao !== undefined ? { formacao: dto.formacao } : {}),
        ...(dto.ocupacao !== undefined ? { ocupacao: dto.ocupacao } : {}),
        ...(dto.decisaoCompra !== undefined
          ? { decisaoCompra: dto.decisaoCompra }
          : {}),
        ...(dto.comentarios !== undefined
          ? { comentarios: dto.comentarios }
          : {}),
        ...(dto.ativo !== undefined ? { ativo: dto.ativo } : {}),
      },
    });
  }

  async remover(id: string) {
    await this.garantirExiste(id);
    await this.prisma.persona.delete({ where: { id } });
    return { ok: true };
  }

  private async garantirExiste(id: string) {
    const p = await this.prisma.persona.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('Persona não encontrada.');
    return p;
  }
}
