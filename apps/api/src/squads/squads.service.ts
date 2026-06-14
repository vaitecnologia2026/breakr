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

// Inclui os membros com o usuario reduzido (id, nome, cargo).
const INCLUDE_MEMBROS = {
  membros: {
    include: {
      usuario: { select: { id: true, nome: true, cargo: true } },
    },
  },
} satisfies Prisma.SquadInclude;

@Injectable()
export class SquadsService {
  constructor(private readonly prisma: PrismaService) {}

  // Lista squads com membros e o usuario de cada membro.
  listar() {
    return this.prisma.squad.findMany({
      orderBy: { nome: 'asc' },
      include: INCLUDE_MEMBROS,
    });
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
