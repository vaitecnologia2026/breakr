// Servico de squads e seus membros — master-data do nucleo.
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Squad, SquadMembro } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CriarSquadDto } from './dto/criar-squad.dto';
import { AdicionarMembroDto } from './dto/adicionar-membro.dto';

// Inclui membros (usuario reduzido) + clientes ativos/em onboarding do squad.
const INCLUDE_MEMBROS = {
  membros: {
    include: {
      usuario: { select: { id: true, nome: true, cargo: true } },
    },
  },
  clientes: {
    where: { status: { in: ['ATIVO', 'ONBOARD'] as const } },
    select: { id: true },
  },
} satisfies Prisma.SquadInclude;

@Injectable()
export class SquadsService {
  constructor(private readonly prisma: PrismaService) {}

  // Lista squads com membros e contagem de clientes ativos/em onboarding.
  listar() {
    return this.prisma.squad.findMany({
      orderBy: { nome: 'asc' },
      include: INCLUDE_MEMBROS,
    });
  }

  // Squad de um cliente + membros por funcao — usado para auto-preencher a
  // criacao de conteudo/tarefa (escolher o cliente ja resolve o squad e quem faz).
  async obterDoCliente(clienteId: string) {
    const cliente = await this.prisma.cliente.findUnique({
      where: { id: clienteId },
      select: { squadId: true },
    });
    if (!cliente?.squadId) {
      return { squad: null, membros: [] };
    }
    const squad = await this.prisma.squad.findUnique({
      where: { id: cliente.squadId },
      include: { membros: { include: { usuario: { select: { id: true, nome: true, cargo: true } } } } },
    });
    if (!squad) {
      return { squad: null, membros: [] };
    }
    return {
      squad: { id: squad.id, nome: squad.nome },
      membros: squad.membros.map((m) => ({
        funcao: m.funcao,
        usuario: m.usuario,
      })),
    };
  }

  /**
   * Auto-balanceamento: atribui o cliente ao squad ATIVO menos carregado
   * (menos clientes). Empate -> primeiro por nome (deterministico). Idempotente:
   * se o cliente ja tem squad, mantem. Retorna o squad escolhido, ou null se nao
   * houver squad ativo. Usado pela acao `atribuir_squad` do motor (na ativacao).
   */
  async atribuirAutomatico(
    clienteId: string,
  ): Promise<{ squadId: string; squadNome: string } | null> {
    const cliente = await this.prisma.cliente.findUnique({ where: { id: clienteId } });
    if (!cliente) {
      throw new NotFoundException('Cliente nao encontrado');
    }
    // Ja tem squad — nao rebalanceia (nao "rouba" cliente de outro squad).
    if (cliente.squadId) {
      const atual = await this.prisma.squad.findUnique({ where: { id: cliente.squadId } });
      return atual ? { squadId: atual.id, squadNome: atual.nome } : null;
    }

    const squads = await this.prisma.squad.findMany({
      where: { ativo: true },
      include: { _count: { select: { clientes: true } } },
    });
    if (squads.length === 0) {
      return null;
    }
    squads.sort(
      (a, b) => a._count.clientes - b._count.clientes || a.nome.localeCompare(b.nome),
    );
    const escolhido = squads[0];
    await this.prisma.cliente.update({
      where: { id: clienteId },
      data: { squadId: escolhido.id },
    });
    return { squadId: escolhido.id, squadNome: escolhido.nome };
  }

  // Garante que o squad existe e o retorna.
  private async garantirSquad(id: string): Promise<Squad> {
    const squad = await this.prisma.squad.findUnique({ where: { id } });
    if (!squad) {
      throw new NotFoundException('Squad nao encontrado');
    }
    return squad;
  }

  // Cria um squad.
  async criar(dto: CriarSquadDto): Promise<Squad> {
    try {
      return await this.prisma.squad.create({ data: { nome: dto.nome } });
    } catch (erro) {
      if (
        erro instanceof Prisma.PrismaClientKnownRequestError &&
        erro.code === 'P2002'
      ) {
        throw new ConflictException('Ja existe um squad com esse nome');
      }
      throw erro;
    }
  }

  // Renomeia um squad.
  async atualizar(id: string, nome: string): Promise<Squad> {
    await this.garantirSquad(id);
    try {
      return await this.prisma.squad.update({ where: { id }, data: { nome } });
    } catch (erro) {
      if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === 'P2002') {
        throw new ConflictException('Ja existe um squad com esse nome');
      }
      throw erro;
    }
  }

  // Vincula um usuario ao squad com uma funcao.
  // Regras: 1 funcao por squad e 1 usuario por squad (@@unique).
  async adicionarMembro(
    squadId: string,
    dto: AdicionarMembroDto,
  ): Promise<SquadMembro> {
    await this.garantirSquad(squadId);

    const usuario = await this.prisma.usuario.findUnique({
      where: { id: dto.usuarioId },
    });
    if (!usuario) {
      throw new NotFoundException('Usuario nao encontrado');
    }

    try {
      return await this.prisma.squadMembro.create({
        data: {
          squadId,
          usuarioId: dto.usuarioId,
          funcao: dto.funcao,
        },
      });
    } catch (erro) {
      if (
        erro instanceof Prisma.PrismaClientKnownRequestError &&
        erro.code === 'P2002'
      ) {
        const alvo = erro.meta?.target;
        const campos = Array.isArray(alvo) ? alvo.join(',') : String(alvo ?? '');
        if (campos.includes('usuario')) {
          throw new ConflictException('Esse usuario ja faz parte do squad');
        }
        throw new ConflictException(
          'Ja existe um membro com essa funcao neste squad',
        );
      }
      throw erro;
    }
  }

  // Remove um membro do squad (validando que ele pertence a este squad).
  async removerMembro(squadId: string, membroId: string): Promise<void> {
    await this.garantirSquad(squadId);

    const membro = await this.prisma.squadMembro.findUnique({
      where: { id: membroId },
    });
    if (!membro || membro.squadId !== squadId) {
      throw new NotFoundException('Membro nao encontrado neste squad');
    }

    await this.prisma.squadMembro.delete({ where: { id: membroId } });
  }
}
