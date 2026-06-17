// Controller de inventário interno.
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
import { InventarioService } from './inventario.service';
import { CriarItemDto } from './dto/criar-item.dto';

const GESTAO = [Cargo.SUPERADMIN, Cargo.ADMIN, Cargo.FINANCEIRO] as const;

@Controller('inventario')
@UseGuards(JwtAuthGuard)
export class InventarioController {
  constructor(private readonly inventario: InventarioService) {}

  @Get()
  listar() {
    return this.inventario.listar();
  }

  @Post()
  @UseGuards(CargosGuard)
  @Cargos(...GESTAO)
  criar(@Body() dto: CriarItemDto) {
    return this.inventario.criar(dto);
  }

  // Qualquer autenticado pode confirmar o recebimento do próprio item.
  @Patch(':id/receber')
  confirmarRecebimento(@Param('id', ParseUUIDPipe) id: string) {
    return this.inventario.confirmarRecebimento(id);
  }

  @Delete(':id')
  @UseGuards(CargosGuard)
  @Cargos(...GESTAO)
  remover(@Param('id', ParseUUIDPipe) id: string) {
    return this.inventario.remover(id);
  }
}
