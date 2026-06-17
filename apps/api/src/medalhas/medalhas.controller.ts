// Controller de medalhas (gamificação).
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Cargo } from '@breakr/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CargosGuard } from '../common/rbac/cargos.guard';
import { Cargos } from '../common/rbac/cargos.decorator';
import { MedalhasService } from './medalhas.service';
import { CriarMedalhaDto } from './dto/criar-medalha.dto';

const GESTAO = [Cargo.SUPERADMIN, Cargo.ADMIN, Cargo.CS] as const;

@Controller('medalhas')
@UseGuards(JwtAuthGuard, CargosGuard)
@Cargos(...GESTAO)
export class MedalhasController {
  constructor(private readonly medalhas: MedalhasService) {}

  @Get()
  listar() {
    return this.medalhas.listar();
  }

  @Get('cliente/:clienteId')
  doCliente(@Param('clienteId', ParseUUIDPipe) clienteId: string) {
    return this.medalhas.doCliente(clienteId);
  }

  @Post()
  criar(@Body() dto: CriarMedalhaDto) {
    return this.medalhas.criar(dto);
  }

  @Delete(':id')
  remover(@Param('id', ParseUUIDPipe) id: string) {
    return this.medalhas.remover(id);
  }

  // POST /medalhas/:id/conceder?clienteId=...
  @Post(':id/conceder')
  conceder(@Param('id', ParseUUIDPipe) id: string, @Query('clienteId', ParseUUIDPipe) clienteId: string) {
    return this.medalhas.conceder(id, clienteId);
  }

  @Delete(':id/conceder')
  revogar(@Param('id', ParseUUIDPipe) id: string, @Query('clienteId', ParseUUIDPipe) clienteId: string) {
    return this.medalhas.revogar(id, clienteId);
  }
}
