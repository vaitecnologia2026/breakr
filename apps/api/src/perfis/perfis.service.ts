// Servico de perfis de acesso — master-data (quais menus/telas cada perfil ve).
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Perfil, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CriarPerfilDto } from './dto/criar-perfil.dto';
import { AtualizarPerfilDto } from './dto/atualizar-perfil.dto';

@Injectable()
export class PerfisService {
  constructor(private readonly prisma: PrismaService) {}

  // Lista todos os perfis (ordem alfabetica).
  listar(): Promise<Perfil[]> {
    return this.prisma.perfil.findMany({ orderBy: { nome: 'asc' } });
  }

  // Busca um perfil pelo id.
  async buscarPorId(id: string): Promise<Perfil> {
    const perfil = await this.prisma.perfil.findUnique({ where: { id } });
    if (!perfil) {
      throw new NotFoundException('Perfil nao encontrado');
    }
    return perfil;
  }

  // Cria um perfil.
  async criar(dto: CriarPerfilDto): Promise<Perfil> {
    try {
      return await this.prisma.perfil.create({
        data: {
          nome: dto.nome,
          ...(dto.permissoes !== undefined && { permissoes: dto.permissoes }),
        },
      });
    } catch (erro) {
      if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === 'P2002') {
        throw new ConflictException('Ja existe um perfil com esse nome');
      }
      throw erro;
    }
  }

  // Atualiza campos do perfil (so os enviados).
  async atualizar(id: string, dto: AtualizarPerfilDto): Promise<Perfil> {
    await this.buscarPorId(id);
    try {
      return await this.prisma.perfil.update({
        where: { id },
        data: {
          ...(dto.nome !== undefined && { nome: dto.nome }),
          ...(dto.permissoes !== undefined && { permissoes: dto.permissoes }),
          ...(dto.ativo !== undefined && { ativo: dto.ativo }),
        },
      });
    } catch (erro) {
      if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === 'P2002') {
        throw new ConflictException('Ja existe um perfil com esse nome');
      }
      throw erro;
    }
  }
}
