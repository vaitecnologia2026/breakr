// Controller de processos jurídicos (contencioso). Acesso restrito ao jurídico.
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
import { ProcessosJuridicosService } from './processos-juridicos.service';
import { CriarProcessoDto } from './dto/criar-processo.dto';
import { AtualizarProcessoDto } from './dto/atualizar-processo.dto';

const JUR = [Cargo.SUPERADMIN, Cargo.ADMIN, Cargo.JURIDICO] as const;

@Controller('processos-juridicos')
@UseGuards(JwtAuthGuard, CargosGuard)
@Cargos(...JUR)
export class ProcessosJuridicosController {
  constructor(private readonly processos: ProcessosJuridicosService) {}

  @Get()
  listar() {
    return this.processos.listar();
  }

  @Post()
  criar(@Body() dto: CriarProcessoDto) {
    return this.processos.criar(dto);
  }

  @Patch(':id')
  atualizar(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AtualizarProcessoDto) {
    return this.processos.atualizar(id, dto);
  }

  @Delete(':id')
  remover(@Param('id', ParseUUIDPipe) id: string) {
    return this.processos.remover(id);
  }
}
