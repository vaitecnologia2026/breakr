// Controller de NPS de cliente — Sucesso do Cliente (CS) + gestao.
import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CargosGuard } from '../common/rbac/cargos.guard';
import { Cargos } from '../common/rbac/cargos.decorator';
import { Cargo } from '@breakr/shared';
import { NpsClienteService } from './nps-cliente.service';
import { RegistrarNpsDto } from './dto/nps-cliente.dto';

@Controller('nps-cliente')
@UseGuards(JwtAuthGuard, CargosGuard)
@Cargos(Cargo.SUPERADMIN, Cargo.ADMIN, Cargo.CS)
export class NpsClienteController {
  constructor(private readonly service: NpsClienteService) {}

  @Get()
  listar(@Query('clienteId') clienteId?: string) {
    return this.service.listar(clienteId);
  }

  @Get('resumo')
  resumo() {
    return this.service.resumoPorSquad();
  }

  @Post()
  registrar(@Body() dto: RegistrarNpsDto) {
    return this.service.registrar(dto);
  }
}
