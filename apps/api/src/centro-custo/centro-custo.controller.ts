// Controller de centro de custo — so financeiro/admin/superadmin (req. l.469-476,
// l.598: "Só financeiro, admin e superadmin acessam ... centro de custos completo").
import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CargosGuard } from '../common/rbac/cargos.guard';
import { Cargos } from '../common/rbac/cargos.decorator';
import { Cargo } from '@breakr/shared';
import { CentroCustoService } from './centro-custo.service';
import { CriarCentroCustoDto, AtualizarCentroCustoDto } from './dto/centro-custo.dto';

@Controller('centro-custo')
@UseGuards(JwtAuthGuard, CargosGuard)
@Cargos(Cargo.SUPERADMIN, Cargo.ADMIN, Cargo.FINANCEIRO)
export class CentroCustoController {
  constructor(private readonly service: CentroCustoService) {}

  @Get()
  listar() {
    return this.service.listar();
  }

  // Gasto x teto por centro (agregado das Compras).
  @Get('resumo')
  resumo() {
    return this.service.resumo();
  }

  @Post()
  criar(@Body() dto: CriarCentroCustoDto) {
    return this.service.criar(dto);
  }

  @Patch(':id')
  atualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AtualizarCentroCustoDto,
  ) {
    return this.service.atualizar(id, dto);
  }
}
