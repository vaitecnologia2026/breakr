import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { UsuarioPublico, Cargo } from '@breakr/shared';

export interface UsuarioListado extends UsuarioPublico {
  ativo: boolean;
  criadoEm: Date;
}

export interface CriarUsuarioDto {
  nome: string;
  email: string;
  senha: string;
  cargo: Cargo;
}

export interface AtualizarUsuarioDto {
  nome?: string;
  cargo?: Cargo;
  ativo?: boolean;
}

@Injectable()
export class UsuariosService {
  constructor(private readonly prisma: PrismaService) {}

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

  async criar(dto: CriarUsuarioDto): Promise<UsuarioListado> {
    const existe = await this.prisma.usuario.findUnique({ where: { email: dto.email } });
    if (existe) throw new ConflictException('E-mail ja cadastrado');
    const senhaHash = await bcrypt.hash(dto.senha, 10);
    const usuario = await this.prisma.usuario.create({
      data: { nome: dto.nome, email: dto.email, senhaHash, cargo: dto.cargo, ativo: true },
    });
    return { id: usuario.id, nome: usuario.nome, email: usuario.email, cargo: usuario.cargo as Cargo, ativo: usuario.ativo, criadoEm: usuario.criadoEm };
  }

  async atualizar(id: string, dto: AtualizarUsuarioDto): Promise<UsuarioListado> {
    const existe = await this.prisma.usuario.findUnique({ where: { id } });
    if (!existe) throw new NotFoundException('Usuario nao encontrado');
    const dados: Record<string, unknown> = {};
    if (dto.nome) dados.nome = dto.nome;
    if (dto.cargo) dados.cargo = dto.cargo;
    if (dto.ativo !== undefined) dados.ativo = dto.ativo;
    const usuario = await this.prisma.usuario.update({ where: { id }, data: dados });
    return { id: usuario.id, nome: usuario.nome, email: usuario.email, cargo: usuario.cargo as Cargo, ativo: usuario.ativo, criadoEm: usuario.criadoEm };
  }
}
