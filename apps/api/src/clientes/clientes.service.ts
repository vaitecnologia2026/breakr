// Servico de clientes — master-data do nucleo.
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
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
        nomeFantasia: this.padronizarNome(dto.nomeFantasia),
        cnpj: dto.cnpj,
        tag: dto.tag,
        email: dto.email,
        telefone: dto.telefone,
        planoId: dto.planoId,
        squadId: dto.squadId,
        status: ClienteStatus.NOVO,
        codigoUnico: this.codigoUnico.gerar('CLI'),
      },
    });
  }

  // Atualiza campos do cliente (so os enviados).
  async atualizar(id: string, dto: AtualizarClienteDto): Promise<Cliente> {
    const atual = await this.buscarPorId(id);
    // Plano obrigatorio antes de confirmar a producao (req. l.54): mover o cliente
    // para producao (ONBOARD/ATIVO/RENOVACAO) exige plano definido — ele determina
    // os projetos a criar e o valor da fatura. Na criacao o plano pode ficar em aberto.
    const STATUS_PRODUCAO: ClienteStatus[] = [
      ClienteStatus.ONBOARD,
      ClienteStatus.ATIVO,
      ClienteStatus.RENOVACAO,
    ];
    if (dto.status && STATUS_PRODUCAO.includes(dto.status)) {
      const planoEfetivo = dto.planoId ?? atual.planoId;
      if (!planoEfetivo) {
        throw new BadRequestException(
          'Selecione o plano do cliente antes de confirmar a producao (o plano define os projetos e o valor da fatura).',
        );
      }
    }
    return this.prisma.cliente.update({
      where: { id },
      data: {
        nomeFantasia:
          dto.nomeFantasia !== undefined ? this.padronizarNome(dto.nomeFantasia) : undefined,
        cnpj: dto.cnpj,
        tag: dto.tag,
        email: dto.email,
        telefone: dto.telefone,
        status: dto.status,
        squadId: dto.squadId,
        planoId: dto.planoId,
        linkAreaMembros: dto.linkAreaMembros,
      },
    });
  }

  // Padroniza o nome do cliente em title case (primeira letra de cada palavra em
  // maiuscula) — req. l.55: o cliente padroniza manualmente e "tem horror de letra
  // minuscula"; o sistema faz isso automaticamente. Preserva o restante de cada
  // palavra para nao destruir siglas/acronimos ja em maiuscula (ex.: "JD Burger").
  private padronizarNome(nome: string): string {
    return nome
      .trim()
      .split(/\s+/)
      .map((p) => (p.length > 0 ? p.charAt(0).toUpperCase() + p.slice(1) : p))
      .join(' ');
  }
}
