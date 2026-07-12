// Controller de Metricas de Marketing (Briefing Marketing — Secao 7). Somente
// leitura, restrito ao nivel de coordenacao/gestao (mesmo conjunto do dashboard).
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CargosGuard } from '../common/rbac/cargos.guard';
import { Cargos } from '../common/rbac/cargos.decorator';
import { Cargo } from '@breakr/shared';
import { MetricasMarketingService } from './metricas-marketing.service';

const CARGOS_COORDENACAO = [Cargo.SUPERADMIN, Cargo.ADMIN, Cargo.ESTRATEGISTA, Cargo.CS] as const;

@Controller('metricas-marketing')
@UseGuards(JwtAuthGuard, CargosGuard)
@Cargos(...CARGOS_COORDENACAO)
export class MetricasMarketingController {
  constructor(private readonly service: MetricasMarketingService) {}

  @Get('filtros')
  filtros() {
    return this.service.filtros();
  }

  @Get()
  metricas(
    @Query('squadId') squadId?: string,
    @Query('clienteId') clienteId?: string,
    @Query('meses') meses?: string,
  ) {
    return this.service.metricas({ squadId, clienteId, meses: meses ? Number(meses) : undefined });
  }
}
