// Pesquisas (surveys) — CRUD do admin (req. l.44-46). O cliente responde pelo
// portal; essa parte fica no PortalService (le/grava Pesquisa/RespostaPesquisa
// direto), mantendo os modulos desacoplados.
import { Injectable, NotFoundException } from '@nestjs/common';
import { Pesquisa } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CriarPesquisaDto, AtualizarPesquisaDto } from './dto/pesquisa.dto';

@Injectable()
export class PesquisasService {
  constructor(private readonly prisma: PrismaService) {}

  listar() {
    return this.prisma.pesquisa.findMany({
      include: { _count: { select: { respostas: true } } },
      orderBy: { criadoEm: 'desc' },
    });
  }

  async obter(id: string) {
    const p = await this.prisma.pesquisa.findUnique({
      where: { id },
      include: {
        respostas: {
          include: { cliente: { select: { nomeFantasia: true } } },
          orderBy: { criadoEm: 'desc' },
        },
      },
    });
    if (!p) throw new NotFoundException('Pesquisa nao encontrada');
    return p;
  }

  criar(dto: CriarPesquisaDto): Promise<Pesquisa> {
    return this.prisma.pesquisa.create({
      data: { titulo: dto.titulo, descricao: dto.descricao },
    });
  }

  async atualizar(id: string, dto: AtualizarPesquisaDto): Promise<Pesquisa> {
    const existe = await this.prisma.pesquisa.findUnique({ where: { id }, select: { id: true } });
    if (!existe) throw new NotFoundException('Pesquisa nao encontrada');
    return this.prisma.pesquisa.update({
      where: { id },
      data: { titulo: dto.titulo, descricao: dto.descricao, ativa: dto.ativa },
    });
  }
}
