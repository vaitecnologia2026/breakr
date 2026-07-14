// Guard das rotas do portal do cliente.
// Regra (compatibilidade preservada):
//  - Empresa SEM credenciais (portalSenhaHash nulo) => portal publico: libera
//    (comportamento historico, nada quebra para os links ja em uso).
//  - Empresa COM credenciais => exige o token do portal (header X-Portal-Token)
//    valido e emitido para aquele mesmo codigo.
// Usa um header proprio (X-Portal-Token) para nao colidir com o Authorization do
// usuario interno (injetado pelo axios no painel).
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import type { PortalTokenPayload } from './portal-acesso.service';

@Injectable()
export class PortalAcessoGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const codigo: string | undefined = req.params?.codigo;
    if (!codigo) return true; // sem codigo na rota: nada a proteger aqui.

    const cliente = await this.prisma.cliente.findUnique({
      where: { codigoUnico: codigo },
      select: { portalSenhaHash: true },
    });
    // Cliente inexistente: deixa passar para o service devolver 404 normal.
    if (!cliente || cliente.portalSenhaHash == null) return true; // publico.

    const header = req.headers['x-portal-token'];
    const token = typeof header === 'string' ? header : undefined;
    if (!token) {
      throw new UnauthorizedException('Login necessario para acessar este portal');
    }
    try {
      const payload = this.jwt.verify<PortalTokenPayload>(token);
      if (payload?.tipo === 'portal' && payload?.sub === codigo) return true;
      throw new UnauthorizedException('Token do portal invalido');
    } catch {
      throw new UnauthorizedException('Sessao do portal expirada ou invalida');
    }
  }
}
