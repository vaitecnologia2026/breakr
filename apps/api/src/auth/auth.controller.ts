// Controller de autenticacao.
import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards, Req } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { Request } from 'express';
import { Cargo } from '@breakr/shared';
import { AuthService, TrocarSenhaResult } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { LoginResponse, UsuarioPublico } from '@breakr/shared';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CargosGuard } from '../common/rbac/cargos.guard';
import { Cargos } from '../common/rbac/cargos.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // POST /auth/login → { token, usuario }
  // Rate-limit anti-força-bruta: 8 tentativas/min por IP.
  @Post('login')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 8, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Req() req: Request): Promise<LoginResponse> {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip;
    return this.authService.login(dto.email, dto.senha, ip);
  }

  // GET /auth/acessos — logins recentes (auditoria, só gestão).
  @Get('acessos')
  @UseGuards(JwtAuthGuard, CargosGuard)
  @Cargos(Cargo.SUPERADMIN, Cargo.ADMIN)
  acessos() {
    return this.authService.listarAcessos();
  }

  @Post('trocar-senha')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async trocarSenha(
    @Req() req: Request & { user: UsuarioPublico },
    @Body() body: { senhaAtual: string; senhaNova: string },
  ): Promise<TrocarSenhaResult> {
    return this.authService.trocarSenha(req.user.id, body.senhaAtual, body.senhaNova);
  }
}
