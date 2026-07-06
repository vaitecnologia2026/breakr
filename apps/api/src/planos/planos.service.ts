// Servico de planos — master-data do nucleo.
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Plano, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CriarPlanoDto } from './dto/criar-plano.dto';
import { AtualizarPlanoDto } from './dto/atualizar-plano.dto';

@Injectable()
export class PlanosService {
  constructor(private readonly prisma: PrismaService) {}

  // Lista todos os planos (ordem alfabetica).
  listar(): Promise<Plano[]> {
    return this.prisma.plano.findMany({ orderBy: { nome: 'asc' } });
  }

  // Busca um plano pelo id.
  async buscarPorId(id: string): Promise<Plano> {
    const plano = await this.prisma.plano.findUnique({ where: { id } });
    if (!plano) {
      throw new NotFoundException('Plano nao encontrado');
    }
    return plano;
  }

  // Cria um plano.
  async criar(dto: CriarPlanoDto): Promise<Plano> {
    try {
      return await this.prisma.plano.create({
        data: {
          nome: dto.nome,
          valor: new Prisma.Decimal(dto.valor),
          ...(dto.ciclo !== undefined && { ciclo: dto.ciclo }),
          ...(dto.tiposProjeto !== undefined && { tiposProjeto: dto.tiposProjeto }),
          ...(dto.entregaveis !== undefined && {
            entregaveis: dto.entregaveis as Prisma.InputJsonValue,
          }),
        },
      });
    } catch (erro) {
      if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === 'P2002') {
        throw new ConflictException('Ja existe um plano com esse nome');
      }
      throw erro;
    }
  }

  // Atualiza campos do plano (so os enviados).
  async atualizar(id: string, dto: AtualizarPlanoDto): Promise<Plano> {
    await this.buscarPorId(id);
    try {
      return await this.prisma.plano.update({
        where: { id },
        data: {
          ...(dto.nome !== undefined && { nome: dto.nome }),
          ...(dto.valor !== undefined && { valor: new Prisma.Decimal(dto.valor) }),
          ...(dto.ciclo !== undefined && { ciclo: dto.ciclo }),
          ...(dto.tiposProjeto !== undefined && { tiposProjeto: dto.tiposProjeto }),
          ...(dto.entregaveis !== undefined && {
            entregaveis: dto.entregaveis as Prisma.InputJsonValue,
          }),
          ...(dto.ativo !== undefined && { ativo: dto.ativo }),
        },
      });
    } catch (erro) {
      if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === 'P2002') {
        throw new ConflictException('Ja existe um plano com esse nome');
      }
      throw erro;
    }
  }
}
