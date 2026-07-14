// Servico de acesso (login) do cliente ao portal.
// O portal (/portal/:codigo) e publico por padrao (link nao-adivinhavel). Quando
// a empresa tem usuario+senha definidos (tela "Usuarios"), passa a exigir login:
// este servico valida as credenciais e emite um token curto (JWT) usado pelo
// front nas chamadas do portal daquela empresa. NAO altera o fluxo das empresas
// sem credenciais (continuam publicas).
import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

// Payload do token do portal (distinto do token de usuario interno pelo campo tipo).
export interface PortalTokenPayload {
  sub: string; // codigoUnico da empresa
  tipo: 'portal';
}

@Injectable()
export class PortalAcessoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  // Diz se a empresa exige login no portal (tem credenciais definidas).
  async status(codigo: string): Promise<{ requerLogin: boolean; nome: string }> {
    const cliente = await this.prisma.cliente.findUnique({
      where: { codigoUnico: codigo },
      select: { nomeFantasia: true, portalSenhaHash: true },
    });
    if (!cliente) throw new NotFoundException('Portal nao encontrado');
    return { requerLogin: cliente.portalSenhaHash != null, nome: cliente.nomeFantasia };
  }

  // Valida usuario+senha e devolve um token do portal (12h) quando corretos.
  async login(
    codigo: string,
    usuario: string,
    senha: string,
  ): Promise<{ token: string }> {
    const cliente = await this.prisma.cliente.findUnique({
      where: { codigoUnico: codigo },
      select: { portalUsuario: true, portalSenhaHash: true },
    });
    if (!cliente) throw new NotFoundException('Portal nao encontrado');
    if (!cliente.portalUsuario || !cliente.portalSenhaHash) {
      throw new UnauthorizedException('Acesso ao portal nao configurado');
    }
    const usuarioOk =
      (usuario ?? '').trim().toLowerCase() === cliente.portalUsuario.toLowerCase();
    const senhaOk = await bcrypt.compare(senha ?? '', cliente.portalSenhaHash);
    if (!usuarioOk || !senhaOk) {
      throw new UnauthorizedException('Usuario ou senha invalidos');
    }
    const payload: PortalTokenPayload = { sub: codigo, tipo: 'portal' };
    const token = this.jwt.sign(payload, { expiresIn: '12h' });
    return { token };
  }
}
