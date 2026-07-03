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
  async login(identificador: string, senha: string, ip?: string): Promise<LoginResponse> {
    // Aceita e-mail (admin@breakr.com) ou usuario simples (admin). Sem "@",
    // resolve pelo prefixo do e-mail (ex.: "admin" -> "admin@...").
    const ident = identificador.trim().toLowerCase();
    let usuario = await this.prisma.usuario.findUnique({ where: { email: ident } });
    if (!usuario && !ident.includes('@')) {
      usuario = await this.prisma.usuario.findFirst({
        where: { email: { startsWith: `${ident}@` } },
        orderBy: { criadoEm: 'asc' },
      });
    }

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

    // Registra o acesso (não bloqueia o login se falhar).
    try {
      await this.prisma.usuario.update({
        where: { id: usuario.id },
        data: { ultimoLoginEm: new Date() },
      });
      await this.prisma.auditLog.create({
        data: {
          ator: usuario.email,
          acao: 'LOGIN',
          entidade: 'auth',
          dados: { nome: usuario.nome, cargo: usuario.cargo, ip: ip ?? null },
        },
      });
    } catch {
      /* logging de acesso é best-effort */
    }

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

  // Lista os acessos (logins) recentes — para a tela de auditoria do admin.
  async listarAcessos(limit = 50) {
    return this.prisma.auditLog.findMany({
      where: { acao: 'LOGIN' },
      orderBy: { criadoEm: 'desc' },
      take: Math.min(limit, 200),
    });
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
