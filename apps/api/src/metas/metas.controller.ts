// Controller de metas trimestrais (OKRs).
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Cargo } from '@breakr/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CargosGuard } from '../common/rbac/cargos.guard';
import { Cargos } from '../common/rbac/cargos.decorator';
import { MetasService } from './metas.service';
import { CriarMetaDto } from './dto/criar-meta.dto';
import { AtualizarMetaDto } from './dto/atualizar-meta.dto';

// Liderança define/edita metas; todos visualizam.
const LIDERANCA = [Cargo.SUPERADMIN, Cargo.ADMIN] as const;

@Controller('metas')
@UseGuards(JwtAuthGuard)
export class MetasController {
  constructor(private readonly metas: MetasService) {}

  @Get()
  listar(@Query('periodo') periodo?: string) {
    return this.metas.listar(periodo);
  }

  @Post()
  @UseGuards(CargosGuard)
  @Cargos(...LIDERANCA)
  criar(@Body() dto: CriarMetaDto) {
    return this.metas.criar(dto);
  }

  @Patch(':id')
  @UseGuards(CargosGuard)
  @Cargos(...LIDERANCA)
  atualizar(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AtualizarMetaDto) {
    return this.metas.atualizar(id, dto);
  }

  @Delete(':id')
  @UseGuards(CargosGuard)
  @Cargos(...LIDERANCA)
  remover(@Param('id', ParseUUIDPipe) id: string) {
    return this.metas.remover(id);
  }
}
