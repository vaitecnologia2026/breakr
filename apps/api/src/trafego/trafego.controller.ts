// Controller de tráfego pago (M17).
import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Cargo } from '@breakr/shared';
import { StatusCampanha } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CargosGuard } from '../common/rbac/cargos.guard';
import { Cargos } from '../common/rbac/cargos.decorator';
import { TrafegoService } from './trafego.service';
import { CriarCampanhaDto } from './dto/criar-campanha.dto';
import { AtualizarMetricasDto } from './dto/atualizar-metricas.dto';
import { MoverStatusCampanhaDto } from './dto/mover-status-campanha.dto';

const CARGOS_TRAFEGO = [
  Cargo.SUPERADMIN,
  Cargo.ADMIN,
  Cargo.GESTOR_TRAFEGO,
  Cargo.ESTRATEGISTA,
] as const;

@Controller('trafego/campanhas')
@UseGuards(JwtAuthGuard)
export class TrafegoController {
  constructor(private readonly trafego: TrafegoService) {}

  @Get()
  listar(
    @Query('clienteId') clienteId?: string,
    @Query('status') status?: StatusCampanha,
  ) {
    return this.trafego.listar({ clienteId, status });
  }

  @Get(':id')
  obter(@Param('id', ParseUUIDPipe) id: string) {
    return this.trafego.obter(id);
  }

  @Post()
  @UseGuards(CargosGuard)
  @Cargos(...CARGOS_TRAFEGO)
  criar(@Body() dto: CriarCampanhaDto) {
    return this.trafego.criar(dto);
  }

  @Patch(':id/metricas')
  @UseGuards(CargosGuard)
  @Cargos(...CARGOS_TRAFEGO)
  atualizarMetricas(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AtualizarMetricasDto) {
    return this.trafego.atualizarMetricas(id, dto);
  }

  @Patch(':id/status')
  @UseGuards(CargosGuard)
  @Cargos(...CARGOS_TRAFEGO)
  moverStatus(@Param('id', ParseUUIDPipe) id: string, @Body() dto: MoverStatusCampanhaDto) {
    return this.trafego.moverStatus(id, dto.status);
  }

  // IA assistiva: gera sugestões de otimização para a campanha.
  @Post(':id/sugestoes')
  @UseGuards(CargosGuard)
  @Cargos(...CARGOS_TRAFEGO)
  sugerir(@Param('id', ParseUUIDPipe) id: string) {
    return this.trafego.sugerir(id);
  }
}

// Controller de relatórios — separado do de campanhas para não poluir o path
// trafego/campanhas com rotas de cliente. Equivale ao n8n "[Reportei] Envio de
// Relatórios pelo WhatsApp": gestor dispara o POST e o motor gera + envia via WA.
@Controller('trafego/relatorios')
@UseGuards(JwtAuthGuard)
export class RelatoriosTrafegoController {
  constructor(private readonly trafego: TrafegoService) {}

  // POST /trafego/relatorios/:clienteId — gera e envia relatório mensal via WhatsApp.
  @Post(':clienteId')
  @UseGuards(CargosGuard)
  @Cargos(...CARGOS_TRAFEGO)
  gerarRelatorio(@Param('clienteId', ParseUUIDPipe) clienteId: string) {
    return this.trafego.gerarRelatorio(clienteId);
  }
}
