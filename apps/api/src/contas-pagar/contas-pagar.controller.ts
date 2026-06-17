// Controller de contas a pagar (financeiro).
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Cargo } from '@breakr/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CargosGuard } from '../common/rbac/cargos.guard';
import { Cargos } from '../common/rbac/cargos.decorator';
import { ContasPagarService } from './contas-pagar.service';
import { CriarContaDto } from './dto/criar-conta.dto';

const FIN = [Cargo.SUPERADMIN, Cargo.ADMIN, Cargo.FINANCEIRO] as const;

@Controller('contas-pagar')
@UseGuards(JwtAuthGuard, CargosGuard)
@Cargos(...FIN)
export class ContasPagarController {
  constructor(private readonly contas: ContasPagarService) {}

  @Get()
  listar() {
    return this.contas.listar();
  }

  @Get('resumo')
  resumo() {
    return this.contas.resumo();
  }

  @Post()
  criar(@Body() dto: CriarContaDto) {
    return this.contas.criar(dto);
  }

  @Patch(':id/pago')
  marcarPago(@Param('id', ParseUUIDPipe) id: string, @Body() body: { pago?: boolean }) {
    return this.contas.marcarPago(id, body.pago ?? true);
  }

  @Delete(':id')
  remover(@Param('id', ParseUUIDPipe) id: string) {
    return this.contas.remover(id);
  }
}
