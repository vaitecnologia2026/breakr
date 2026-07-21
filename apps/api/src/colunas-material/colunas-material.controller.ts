// Controller das colunas do board de Campanhas de Marketing (config GLOBAL).
// Listar: qualquer autenticado (o board precisa). Criar/editar/excluir: ADMIN/
// SUPERADMIN (a mudanca afeta TODAS as campanhas).
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
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CargosGuard } from '../common/rbac/cargos.guard';
import { Cargos } from '../common/rbac/cargos.decorator';
import { Cargo } from '@breakr/shared';
import { ColunasMaterialService } from './colunas-material.service';
import { CriarColunaDto } from './dto/criar-coluna.dto';
import { AtualizarColunaDto } from './dto/atualizar-coluna.dto';

@Controller('colunas-material')
@UseGuards(JwtAuthGuard)
export class ColunasMaterialController {
  constructor(private readonly service: ColunasMaterialService) {}

  @Get()
  listar() {
    return this.service.listar();
  }

  @Post()
  @UseGuards(CargosGuard)
  @Cargos(Cargo.SUPERADMIN, Cargo.ADMIN)
  criar(@Body() dto: CriarColunaDto) {
    return this.service.criar(dto);
  }

  @Patch(':id')
  @UseGuards(CargosGuard)
  @Cargos(Cargo.SUPERADMIN, Cargo.ADMIN)
  atualizar(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AtualizarColunaDto) {
    return this.service.atualizar(id, dto);
  }

  @Delete(':id')
  @UseGuards(CargosGuard)
  @Cargos(Cargo.SUPERADMIN, Cargo.ADMIN)
  remover(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remover(id);
  }
}
