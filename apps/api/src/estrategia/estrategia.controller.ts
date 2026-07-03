// Controller da estrategia (B6). Rotas internas (estrategista/CS/admin). A aprovacao
// e o ajuste pelo cliente ficam no PortalController (rota publica).
import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { StatusEstrategia } from '@prisma/client';
import { Cargo } from '@breakr/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CargosGuard } from '../common/rbac/cargos.guard';
import { Cargos } from '../common/rbac/cargos.decorator';
import { EstrategiaService } from './estrategia.service';
import { CriarEstrategiaDto } from './dto/criar-estrategia.dto';
import { AtualizarEstrategiaDto } from './dto/atualizar-estrategia.dto';

const TIME_ESTRATEGIA = [Cargo.SUPERADMIN, Cargo.ADMIN, Cargo.ESTRATEGISTA, Cargo.CS] as const;

@Controller('estrategias')
@UseGuards(JwtAuthGuard)
export class EstrategiaController {
  constructor(private readonly estrategia: EstrategiaService) {}

  @Get()
  listar(@Query('clienteId') clienteId?: string, @Query('status') status?: StatusEstrategia) {
    return this.estrategia.listar({ clienteId, status });
  }

  @Get(':id')
  obter(@Param('id', ParseUUIDPipe) id: string) {
    return this.estrategia.obter(id);
  }

  @Post()
  @UseGuards(CargosGuard)
  @Cargos(...TIME_ESTRATEGIA)
  criar(@Body() dto: CriarEstrategiaDto, @Request() req: any) {
    return this.estrategia.criar(dto, req.user?.id);
  }

  @Patch(':id')
  @UseGuards(CargosGuard)
  @Cargos(...TIME_ESTRATEGIA)
  atualizar(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AtualizarEstrategiaDto) {
    return this.estrategia.atualizar(id, dto);
  }

  @Post(':id/enviar')
  @UseGuards(CargosGuard)
  @Cargos(...TIME_ESTRATEGIA)
  enviar(@Param('id', ParseUUIDPipe) id: string) {
    return this.estrategia.enviar(id);
  }
}
