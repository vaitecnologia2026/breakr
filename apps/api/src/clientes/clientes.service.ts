// Servico de clientes — master-data do nucleo.
import { Injectable, NotFoundException } from '@nestjs/common';
import { Cliente } from '@prisma/client';
import { ClienteStatus } from '@breakr/shared';
import { PrismaService } from '../prisma/prisma.service';
import { CodigoUnicoService } from '../common/codigo-unico/codigo-unico.service';
import { CriarClienteDto } from './dto/criar-cliente.dto';
import { AtualizarClienteDto } from './dto/atualizar-cliente.dto';

@Injectable()
export class ClientesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly codigoUnico: CodigoUnicoService,
  ) {}

  // Lista todos os clientes (mais recentes primeiro) com progresso de onboarding.
  listar() {
    return this.prisma.cliente.findMany({
      orderBy: { criadoEm: 'desc' },
      include: {
        squad: true,
        plano: true,
        onboarding: { select: { progresso: true, concluido: true } },
      },
    });
  }

  // Busca um cliente pelo id.
  async buscarPorId(id: string): Promise<Cliente> {
    const cliente = await this.prisma.cliente.findUnique({
      where: { id },
      include: { squad: true, plano: true },
    });
    if (!cliente) {
      throw new NotFoundException('Cliente nao encontrado');
    }
    return cliente;
  }

  // Cria cliente com status NOVO e codigo unico gerado (prefixo CLI).
  criar(dto: CriarClienteDto): Promise<Cliente> {
    return this.prisma.cliente.create({
      data: {
        nomeFantasia: dto.nomeFantasia,
        cnpj: dto.cnpj,
        tag: dto.tag,
        planoId: dto.planoId,
        status: ClienteStatus.NOVO,
        codigoUnico: this.codigoUnico.gerar('CLI'),
      },
    });
  }

  // Atualiza campos do cliente (so os enviados).
  async atualizar(id: string, dto: AtualizarClienteDto): Promise<Cliente> {
    await this.buscarPorId(id);
    return this.prisma.cliente.update({
      where: { id },
      data: {
        nomeFantasia: dto.nomeFantasia,
        cnpj: dto.cnpj,
        tag: dto.tag,
        status: dto.status,
        squadId: dto.squadId,
        planoId: dto.planoId,
      },
    });
  }
}
