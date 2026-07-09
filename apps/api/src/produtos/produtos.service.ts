// Servico de produtos — master-data (produtos avulsos).
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Produto, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CriarProdutoDto } from './dto/criar-produto.dto';
import { AtualizarProdutoDto } from './dto/atualizar-produto.dto';

@Injectable()
export class ProdutosService {
  constructor(private readonly prisma: PrismaService) {}

  // Lista todos os produtos (ordem alfabetica).
  listar(): Promise<Produto[]> {
    return this.prisma.produto.findMany({ orderBy: { nome: 'asc' } });
  }

  // Busca um produto pelo id.
  async buscarPorId(id: string): Promise<Produto> {
    const produto = await this.prisma.produto.findUnique({ where: { id } });
    if (!produto) {
      throw new NotFoundException('Produto nao encontrado');
    }
    return produto;
  }

  // Cria um produto.
  async criar(dto: CriarProdutoDto): Promise<Produto> {
    try {
      return await this.prisma.produto.create({
        data: {
          nome: dto.nome,
          valor: new Prisma.Decimal(dto.valor),
          ...(dto.descricao !== undefined && { descricao: dto.descricao }),
        },
      });
    } catch (erro) {
      if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === 'P2002') {
        throw new ConflictException('Ja existe um produto com esse nome');
      }
      throw erro;
    }
  }

  // Atualiza campos do produto (so os enviados).
  async atualizar(id: string, dto: AtualizarProdutoDto): Promise<Produto> {
    await this.buscarPorId(id);
    try {
      return await this.prisma.produto.update({
        where: { id },
        data: {
          ...(dto.nome !== undefined && { nome: dto.nome }),
          ...(dto.valor !== undefined && { valor: new Prisma.Decimal(dto.valor) }),
          ...(dto.descricao !== undefined && { descricao: dto.descricao }),
          ...(dto.ativo !== undefined && { ativo: dto.ativo }),
        },
      });
    } catch (erro) {
      if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === 'P2002') {
        throw new ConflictException('Ja existe um produto com esse nome');
      }
      throw erro;
    }
  }
}
