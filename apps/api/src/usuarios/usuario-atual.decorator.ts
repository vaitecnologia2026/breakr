// Decorator de parametro — extrai o usuario autenticado de request.user.
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UsuarioPublico } from '@breakr/shared';

export const UsuarioAtual = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UsuarioPublico => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as UsuarioPublico;
  },
);
