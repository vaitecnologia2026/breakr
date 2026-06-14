// Controller de usuarios.
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsuarioAtual } from './usuario-atual.decorator';
import { UsuarioPublico } from '@breakr/shared';

@Controller('usuarios')
export class UsuariosController {
  // GET /usuarios/me — retorna o usuario do token (rota protegida).
  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@UsuarioAtual() usuario: UsuarioPublico): UsuarioPublico {
    return usuario;
  }
}
