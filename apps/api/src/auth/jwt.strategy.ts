// Estrategia Passport-JWT — valida o token e injeta o usuario na request.
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';
import { UsuarioPublico, Cargo } from '@breakr/shared';

/// Conteudo assinado dentro do JWT.
export interface JwtPayload {
  sub: string; // id do usuario
  email: string;
  cargo: Cargo;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET', 'troque-isto-em-producao'),
    });
  }

  // O retorno vira `request.user`. Recarregamos o usuario para refletir estado atual.
  async validate(payload: JwtPayload): Promise<UsuarioPublico> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: payload.sub },
    });

    if (!usuario || !usuario.ativo) {
      throw new UnauthorizedException('Usuario inexistente ou inativo');
    }

    return {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      cargo: usuario.cargo as Cargo,
    };
  }
}
