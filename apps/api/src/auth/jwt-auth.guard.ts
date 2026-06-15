// Guard JWT nativo — sem passport. Extrai o Bearer token, verifica com
// JwtService e carrega o usuário do banco. Popula request.user.
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { UsuarioPublico, Cargo } from '@breakr/shared';

export interface JwtPayload {
  sub: string;
  email: string;
  cargo: Cargo;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const token = this.extrairToken(req);
    if (!token) throw new UnauthorizedException('Token ausente');

    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException('Token inválido ou expirado');
    }

    const usuario = await this.prisma.usuario.findUnique({
      where: { id: payload.sub },
    });
    if (!usuario || !usuario.ativo) {
      throw new UnauthorizedException('Usuário inexistente ou inativo');
    }

    const usuarioPublico: UsuarioPublico = {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      cargo: usuario.cargo as Cargo,
    };
    (req as Request & { user: UsuarioPublico }).user = usuarioPublico;
    return true;
  }

  private extrairToken(req: Request): string | null {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) return null;
    return auth.slice(7);
  }
}
