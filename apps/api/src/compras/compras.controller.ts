// Controller de compras — solicitacoes de compra (Operacoes, M20).
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
import { StatusCompra } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CargosGuard } from '../common/rbac/cargos.guard';
import { Cargos } from '../common/rbac/cargos.decorator';
import { Cargo, UsuarioPublico } from '@breakr/shared';
import { UsuarioAtual } from '../usuarios/usuario-atual.decorator';
import { ComprasService } from './compras.service';
import { CriarCompraDto } from './dto/criar-compra.dto';
import { MoverStatusCompraDto } from './dto/mover-status-compra.dto';

@Controller('compras')
@UseGuards(JwtAuthGuard)
export class ComprasController {
  constructor(private readonly comprasService: ComprasService) {}

  // GET /compras — lista as solicitacoes (filtro opcional por status; qualquer
  // autenticado).
  @Get()
  listar(@Query('status') status?: StatusCompra) {
    return this.comprasService.listar({ status });
  }

  // GET /compras/:id — detalhe de uma solicitacao.
  @Get(':id')
  obter(@Param('id', ParseUUIDPipe) id: string) {
    return this.comprasService.obter(id);
  }

  // POST /compras — qualquer usuário autenticado pode solicitar (o solicitante é
  // sempre o usuário logado). A aprovação (mudança de status) continua restrita.
  @Post()
  criar(@Body() dto: CriarCompraDto, @UsuarioAtual() usuario: UsuarioPublico) {
    return this.comprasService.criar({ ...dto, solicitanteId: usuario.id });
  }

  // PATCH /compras/:id/status — move a solicitacao de status no fluxo.
  @Patch(':id/status')
  @UseGuards(CargosGuard)
  @Cargos(Cargo.SUPERADMIN, Cargo.ADMIN, Cargo.FINANCEIRO)
  moverStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MoverStatusCompraDto,
  ) {
    return this.comprasService.moverStatus(id, dto.status);
  }
}
