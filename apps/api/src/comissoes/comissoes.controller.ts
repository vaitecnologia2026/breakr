// Controller de comissoes apuradas (Area administrativa).
// Somente leitura — expoe a apuracao das comissoes de vendas ja pagas.
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CargosGuard } from '../common/rbac/cargos.guard';
import { Cargos } from '../common/rbac/cargos.decorator';
import { Cargo } from '@breakr/shared';
import { ComissoesService } from './comissoes.service';

@Controller('comissoes')
@UseGuards(JwtAuthGuard, CargosGuard)
@Cargos(Cargo.SUPERADMIN, Cargo.ADMIN, Cargo.FINANCEIRO)
export class ComissoesController {
  constructor(private readonly comissoes: ComissoesService) {}

  // GET /comissoes/apuradas?mes=YYYY-MM — comissoes das vendas pagas no mes.
  @Get('apuradas')
  apuradas(@Query('mes') mes?: string) {
    return this.comissoes.apuradas(mes);
  }
}
