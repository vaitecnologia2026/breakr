// Controller de eNPS (NPS interno).
import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Cargo } from '@breakr/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CargosGuard } from '../common/rbac/cargos.guard';
import { Cargos } from '../common/rbac/cargos.decorator';
import { EnpsService } from './enps.service';
import { ResponderEnpsDto } from './dto/responder-enps.dto';

@Controller('enps')
@UseGuards(JwtAuthGuard)
export class EnpsController {
  constructor(private readonly enps: EnpsService) {}

  // Qualquer autenticado responde (anônimo).
  @Post()
  responder(@Body() dto: ResponderEnpsDto) {
    return this.enps.responder(dto);
  }

  // Resultado agregado — só liderança.
  @Get('resultados')
  @UseGuards(CargosGuard)
  @Cargos(Cargo.SUPERADMIN, Cargo.ADMIN)
  resultados() {
    return this.enps.resultados();
  }
}
