// Endpoints de qualidade e rework — acesso restrito a usuarios internos (JWT).
import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { Cargo } from '@breakr/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CargosGuard } from '../common/rbac/cargos.guard';
import { Cargos } from '../common/rbac/cargos.decorator';
import { QualidadeService } from './qualidade.service';

@UseGuards(JwtAuthGuard)
@Controller('qualidade')
export class QualidadeController {
  constructor(private readonly svc: QualidadeService) {}

  @Get('dashboard')
  dashboard() {
    return this.svc.dashboard();
  }

  @Get('rework')
  listarRework(
    @Query('origem') origem?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.svc.listarRework({
      origem: origem === 'EXTERNO' || origem === 'INTERNO'
        ? (origem as 'EXTERNO' | 'INTERNO')
        : undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('carga-designer')
  cargaDesigner() {
    return this.svc.cargaDesigner();
  }

  @Get('rework-detalhado')
  reworkDetalhado() {
    return this.svc.reworkDetalhado();
  }

  // --- Critérios de avaliação (CSAT) configuráveis ---
  @Get('criterios')
  listarCriterios(@Query('tipo') tipo?: string) {
    return this.svc.listarCriterios(tipo);
  }

  @Post('criterios')
  @UseGuards(CargosGuard)
  @Cargos(Cargo.SUPERADMIN, Cargo.ADMIN)
  criarCriterio(@Body() dto: { tipo: string; label: string; ordem?: number }) {
    return this.svc.criarCriterio(dto);
  }

  @Delete('criterios/:id')
  @UseGuards(CargosGuard)
  @Cargos(Cargo.SUPERADMIN, Cargo.ADMIN)
  removerCriterio(@Param('id', ParseUUIDPipe) id: string) {
    return this.svc.removerCriterio(id);
  }
}
