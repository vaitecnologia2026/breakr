// Controller do Dashboard da Coordenadora de Marketing (Briefing Marketing — Secoes 5 e 6).
// Somente leitura. Acesso restrito ao nivel de gestao/coordenacao de marketing
// (Secao 11: membros do squad NAO veem o dashboard da coordenadora).
import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CargosGuard } from '../common/rbac/cargos.guard';
import { Cargos } from '../common/rbac/cargos.decorator';
import { Cargo } from '@breakr/shared';
import { DashboardMarketingService } from './dashboard-marketing.service';
import { ConfigAlertasDto } from './dto/config-alertas.dto';

// Coordenacao de marketing = gestao + CS/estrategista que planejam (mesmo conjunto
// usado nas campanhas de marketing).
const CARGOS_COORDENACAO = [
  Cargo.SUPERADMIN,
  Cargo.ADMIN,
  Cargo.ESTRATEGISTA,
  Cargo.CS,
] as const;

@Controller('dashboard-marketing')
@UseGuards(JwtAuthGuard, CargosGuard)
@Cargos(...CARGOS_COORDENACAO)
export class DashboardMarketingController {
  constructor(private readonly service: DashboardMarketingService) {}

  // GET /dashboard-marketing/filtros — opcoes de squad/cliente para os filtros.
  @Get('filtros')
  filtros() {
    return this.service.filtros();
  }

  // GET /dashboard-marketing/config — prazos/alertas configuraveis (Fatia 10).
  @Get('config')
  obterConfig() {
    return this.service.obterConfig();
  }

  // PATCH /dashboard-marketing/config — a coordenadora ajusta os prazos (Fatia 10).
  @Patch('config')
  atualizarConfig(@Body() dto: ConfigAlertasDto) {
    return this.service.atualizarConfig(dto);
  }

  // POST /dashboard-marketing/onboarding/:clienteId/vincular-squad — a coordenadora
  // vincula o squad ao cliente direto do dashboard (Fatia 9 — Secao 10).
  @Post('onboarding/:clienteId/vincular-squad')
  vincularSquad(
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
    @Body('squadId', ParseUUIDPipe) squadId: string,
  ) {
    return this.service.vincularSquad(clienteId, squadId);
  }

  // GET /dashboard-marketing?squadId=&clienteId= — 4 blocos + central de alertas.
  @Get()
  painel(@Query('squadId') squadId?: string, @Query('clienteId') clienteId?: string) {
    return this.service.painel({ squadId, clienteId });
  }
}
