import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';
import { Cargo, UsuarioPublico } from '@breakr/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsuarioAtual } from '../usuarios/usuario-atual.decorator';
import { Cargos } from '../common/rbac/cargos.decorator';
import { CargosGuard } from '../common/rbac/cargos.guard';
import { NotificacoesService } from './notificacoes.service';

class BroadcastDto {
  @IsString() titulo!: string;
  @IsString() mensagem!: string;
  @IsOptional() @IsString() tipo?: string;
  @IsOptional() @IsString() link?: string;
}

@Controller('notificacoes')
@UseGuards(JwtAuthGuard) // popula request.user em todas as rotas abaixo
export class NotificacoesController {
  constructor(private readonly service: NotificacoesService) {}

  /** Minhas notificacoes (50 mais recentes). */
  @Get()
  minhas(@UsuarioAtual() u: UsuarioPublico) {
    return this.service.listar(u.id);
  }

  /** Contador de nao lidas (para o sininho). */
  @Get('nao-lidas')
  async naoLidas(@UsuarioAtual() u: UsuarioPublico) {
    return { total: await this.service.contarNaoLidas(u.id) };
  }

  /** Marca todas como lidas. */
  @Patch('lidas')
  marcarTodas(@UsuarioAtual() u: UsuarioPublico) {
    return this.service.marcarTodasLidas(u.id);
  }

  /** Marca uma como lida (so o dono). */
  @Patch(':id/lida')
  marcarLida(@UsuarioAtual() u: UsuarioPublico, @Param('id') id: string) {
    return this.service.marcarLida(u.id, id);
  }

  /** Comunicado geral — restrito a ADMIN/SUPERADMIN (demonstra o RBAC). */
  @Post('broadcast')
  @UseGuards(CargosGuard)
  @Cargos(Cargo.ADMIN, Cargo.SUPERADMIN)
  broadcast(@Body() dto: BroadcastDto) {
    return this.service.broadcast(dto);
  }
}
