// Servico de autenticacao — valida credenciais e emite JWT.
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginResponse, Cargo } from '@breakr/shared';
import { JwtPayload } from './jwt-auth.guard';

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
}
