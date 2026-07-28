// Rotas de push do app mobile. O app registra o token FCM apos o usuario aceitar
// a permissao de notificacoes, e o remove no logout.
import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { UsuarioPublico } from '@breakr/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsuarioAtual } from '../usuarios/usuario-atual.decorator';
import { PushService } from './push.service';

class SubscribeDto {
  @IsString() @MinLength(10) token!: string;
  @IsOptional() @IsIn(['android', 'ios', 'web']) plataforma?: string;
}

class UnsubscribeDto {
  @IsString() @MinLength(10) token!: string;
}

@Controller('push')
@UseGuards(JwtAuthGuard) // popula request.user em todas as rotas abaixo
export class PushController {
  constructor(private readonly service: PushService) {}

  /** Registra o token FCM do dispositivo atual para o usuario logado. */
  @Post('subscribe')
  subscribe(@UsuarioAtual() u: UsuarioPublico, @Body() dto: SubscribeDto) {
    return this.service.registrarToken(u.id, dto.token, dto.plataforma ?? 'android');
  }

  /** Remove o token (logout / troca de conta no mesmo aparelho). */
  @Post('unsubscribe')
  unsubscribe(@Body() dto: UnsubscribeDto) {
    return this.service.removerToken(dto.token);
  }
}
