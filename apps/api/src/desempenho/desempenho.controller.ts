// Controller de avaliações de desempenho.
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
import { Cargo, UsuarioPublico } from '@breakr/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CargosGuard } from '../common/rbac/cargos.guard';
import { Cargos } from '../common/rbac/cargos.decorator';
import { UsuarioAtual } from '../usuarios/usuario-atual.decorator';
import { DesempenhoService } from './desempenho.service';
import { CriarDesempenhoDto } from './dto/criar-desempenho.dto';

const LIDERANCA = [Cargo.SUPERADMIN, Cargo.ADMIN] as const;

@Controller('desempenho')
@UseGuards(JwtAuthGuard)
export class DesempenhoController {
  constructor(private readonly desempenho: DesempenhoService) {}

  // Minhas avaliações (qualquer autenticado vê as próprias).
  @Get('meus')
  meus(@UsuarioAtual() usuario: UsuarioPublico) {
    return this.desempenho.meus(usuario.id);
  }

  @Get()
  @UseGuards(CargosGuard)
  @Cargos(...LIDERANCA)
  listar(@Query('colaboradorId') colaboradorId?: string) {
    return this.desempenho.listar(colaboradorId);
  }

  @Post()
  @UseGuards(CargosGuard)
  @Cargos(...LIDERANCA)
  criar(@Body() dto: CriarDesempenhoDto, @UsuarioAtual() usuario: UsuarioPublico) {
    return this.desempenho.criar(dto, usuario.id);
  }

  @Delete(':id')
  @UseGuards(CargosGuard)
  @Cargos(...LIDERANCA)
  remover(@Param('id', ParseUUIDPipe) id: string) {
    return this.desempenho.remover(id);
  }
}
