// Servico de usuarios.
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsuarioPublico, Cargo } from '@breakr/shared';

@Injectable()
export class UsuariosService {
  constructor(private readonly prisma: PrismaService) {}

  // Retorna a versao publica de um usuario pelo id.
  async buscarPublicoPorId(id: string): Promise<UsuarioPublico> {
    const usuario = await this.prisma.usuario.findUnique({ where: { id } });
    if (!usuario) {
      throw new NotFoundException('Usuario nao encontrado');
    }
    return {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      cargo: usuario.cargo as Cargo,
    };
  }
}
