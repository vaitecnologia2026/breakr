// Servico de autenticacao — valida credenciais e emite JWT.
import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginResponse, Cargo } from '@breakr/shared';
import { JwtPayload } from './jwt-auth.guard';

export interface TrocarSenhaResult { ok: boolean }

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  // Valida email + senha (bcrypt) e retorna o contrato LoginResponse do @breakr/shared.
  async login(email: string, senha: string): Promise<LoginResponse> {
    const usuario = await this.prisma.usuario.findUnique({ where: { email } });

    // Mensagem generica para nao revelar se o e-mail existe.
    const credenciaisInvalidas = new UnauthorizedException('Credenciais invalidas');
    if (!usuario || !usuario.ativo) {
      throw credenciaisInvalidas;
    }

    const senhaConfere = await bcrypt.compare(senha, usuario.senhaHash);
    if (!senhaConfere) {
      throw credenciaisInvalidas;
    }

    const payload: JwtPayload = {
      sub: usuario.id,
      email: usuario.email,
      cargo: usuario.cargo as Cargo,
    };
    const token = await this.jwt.signAsync(payload);

    return {
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        cargo: usuario.cargo as Cargo,
      },
    };
  }

  async trocarSenha(userId: string, senhaAtual: string, senhaNova: string): Promise<TrocarSenhaResult> {
    if (!senhaNova || senhaNova.length < 8) {
      throw new BadRequestException('A nova senha deve ter ao menos 8 caracteres.');
    }
    const usuario = await this.prisma.usuario.findUnique({ where: { id: userId } });
    if (!usuario) throw new UnauthorizedException('Usuário não encontrado');

    const confere = await bcrypt.compare(senhaAtual, usuario.senhaHash);
    if (!confere) throw new UnauthorizedException('Senha atual incorreta');

    const novoHash = await bcrypt.hash(senhaNova, 10);
    await this.prisma.usuario.update({ where: { id: userId }, data: { senhaHash: novoHash } });
    return { ok: true };
  }
}
