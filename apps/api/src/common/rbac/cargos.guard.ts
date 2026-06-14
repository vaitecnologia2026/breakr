import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Cargo, UsuarioPublico } from '@breakr/shared';
import { CARGOS_KEY } from './cargos.decorator';

/**
 * Guard de RBAC por cargo. So bloqueia quando ha @Cargos na rota.
 * Deve rodar DEPOIS do JwtAuthGuard (que injeta request.user) — por isso e
 * aplicado a nivel de metodo, enquanto o JwtAuthGuard fica no controller.
 * SUPERADMIN sempre passa.
 */
@Injectable()
export class CargosGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requeridos = this.reflector.getAllAndOverride<Cargo[]>(CARGOS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Sem @Cargos => rota nao restrita por cargo.
    if (!requeridos || requeridos.length === 0) return true;

    const usuario = context.switchToHttp().getRequest().user as
      | UsuarioPublico
      | undefined;

    if (!usuario) throw new ForbiddenException('Nao autenticado');
    if (usuario.cargo === Cargo.SUPERADMIN) return true;
    if (!requeridos.includes(usuario.cargo)) {
      throw new ForbiddenException('Cargo sem permissao para esta acao');
    }
    return true;
  }
}
