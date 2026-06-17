import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { UsuarioPublico, Cargo } from '@breakr/shared';
import { CriarUsuarioDto } from './dto/criar-usuario.dto';
import { AtualizarUsuarioDto } from './dto/atualizar-usuario.dto';

export interface UsuarioListado extends UsuarioPublico {
  ativo: boolean;
  criadoEm: Date;
}

// Cargos com poder administrativo: so um SUPERADMIN pode conceder ou alterar.
const CARGOS_ELEVADOS: Cargo[] = [Cargo.SUPERADMIN, Cargo.ADMIN];

@Injectable()
export class UsuariosService {
  constructor(private readonly prisma: PrismaService) {}

  private ehElevado(cargo: string): boolean {
    return CARGOS_ELEVADOS.includes(cargo as Cargo);
  }

  async buscarPublicoPorId(id: string): Promise<UsuarioPublico> {
    const usuario = await this.prisma.usuario.findUnique({ where: { id } });
    if (!usuario) throw new NotFoundException('Usuario nao encontrado');
    return { id: usuario.id, nome: usuario.nome, email: usuario.email, cargo: usuario.cargo as Cargo };
  }

  async listarTodos(): Promise<UsuarioListado[]> {
    const lista = await this.prisma.usuario.findMany({
      orderBy: [{ ativo: 'desc' }, { nome: 'asc' }],
    });
    return lista.map((u) => ({
      id: u.id,
      nome: u.nome,
      email: u.email,
      cargo: u.cargo as Cargo,
      ativo: u.ativo,
      criadoEm: u.criadoEm,
    }));
  }

  async criar(dto: CriarUsuarioDto, ator: UsuarioPublico): Promise<UsuarioListado> {
    // Apenas SUPERADMIN pode criar usuarios com cargo elevado (ADMIN/SUPERADMIN).
    if (this.ehElevado(dto.cargo) && ator.cargo !== Cargo.SUPERADMIN) {
      throw new ForbiddenException('Apenas SUPERADMIN pode atribuir cargos elevados');
    }
    const existe = await this.prisma.usuario.findUnique({ where: { email: dto.email } });
    if (existe) throw new ConflictException('E-mail ja cadastrado');
    const senhaHash = await bcrypt.hash(dto.senha, 10);
    const usuario = await this.prisma.usuario.create({
      data: { nome: dto.nome, email: dto.email, senhaHash, cargo: dto.cargo, ativo: true },
    });
    return { id: usuario.id, nome: usuario.nome, email: usuario.email, cargo: usuario.cargo as Cargo, ativo: usuario.ativo, criadoEm: usuario.criadoEm };
  }

  async atualizar(
    id: string,
    dto: AtualizarUsuarioDto,
    ator: UsuarioPublico,
  ): Promise<UsuarioListado> {
    const existe = await this.prisma.usuario.findUnique({ where: { id } });
    if (!existe) throw new NotFoundException('Usuario nao encontrado');

    const ehProprio = id === ator.id;
    const atorSuperadmin = ator.cargo === Cargo.SUPERADMIN;

    // Ninguem altera o proprio cargo nem se autodesativa (evita lockout/escalada).
    if (ehProprio && dto.cargo !== undefined && dto.cargo !== existe.cargo) {
      throw new ForbiddenException('Voce nao pode alterar o proprio cargo');
    }
    if (ehProprio && dto.ativo === false) {
      throw new ForbiddenException('Voce nao pode desativar a si mesmo');
    }
    // So SUPERADMIN mexe em usuarios elevados ou concede cargo elevado.
    if (!atorSuperadmin && this.ehElevado(existe.cargo)) {
      throw new ForbiddenException('Apenas SUPERADMIN pode alterar usuarios elevados');
    }
    if (!atorSuperadmin && dto.cargo !== undefined && this.ehElevado(dto.cargo)) {
      throw new ForbiddenException('Apenas SUPERADMIN pode atribuir cargos elevados');
    }

    const dados: Record<string, unknown> = {};
    if (dto.nome) dados.nome = dto.nome;
    if (dto.cargo) dados.cargo = dto.cargo;
    if (dto.ativo !== undefined) dados.ativo = dto.ativo;
    const usuario = await this.prisma.usuario.update({ where: { id }, data: dados });
    return { id: usuario.id, nome: usuario.nome, email: usuario.email, cargo: usuario.cargo as Cargo, ativo: usuario.ativo, criadoEm: usuario.criadoEm };
  }
}
