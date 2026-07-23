// Controller do catálogo de Tipos de Tarefa × Etapas (Marketing).
// Leitura para qualquer autenticado; escrita restrita à gestão/estratégia.
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Cargo } from '@breakr/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CargosGuard } from '../common/rbac/cargos.guard';
import { Cargos } from '../common/rbac/cargos.decorator';
import { TiposTarefaService } from './tipos-tarefa.service';
import { CriarTipoTarefaDto } from './dto/criar-tipo-tarefa.dto';
import { AtualizarTipoTarefaDto } from './dto/atualizar-tipo-tarefa.dto';
import { AtualizarEtapaDto } from './dto/atualizar-etapa.dto';

// Configuração de tipos de tarefa é rotina de gestão/estratégia de marketing.
const CARGOS_GESTAO = [Cargo.SUPERADMIN, Cargo.ADMIN, Cargo.ESTRATEGISTA, Cargo.CS];

@Controller('tipos-tarefa')
@UseGuards(JwtAuthGuard)
export class TiposTarefaController {
  constructor(private readonly svc: TiposTarefaService) {}

  // GET /tipos-tarefa — lista os tipos com a matriz de etapas.
  @Get()
  listar() {
    return this.svc.listar();
  }

  // GET /tipos-tarefa/:id — detalhe de um tipo.
  @Get(':id')
  obter(@Param('id', ParseUUIDPipe) id: string) {
    return this.svc.obter(id);
  }

  // POST /tipos-tarefa — cria um tipo (semeia as 9 etapas).
  @Post()
  @UseGuards(CargosGuard)
  @Cargos(...CARGOS_GESTAO)
  criar(@Body() dto: CriarTipoTarefaDto, @Request() req: any) {
    return this.svc.criar(dto, req.user?.id);
  }

  // PATCH /tipos-tarefa/:id — edita atributos do tipo.
  @Patch(':id')
  @UseGuards(CargosGuard)
  @Cargos(...CARGOS_GESTAO)
  atualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AtualizarTipoTarefaDto,
  ) {
    return this.svc.atualizar(id, dto);
  }

  // PATCH /tipos-tarefa/:id/etapa — configura uma etapa da matriz.
  @Patch(':id/etapa')
  @UseGuards(CargosGuard)
  @Cargos(...CARGOS_GESTAO)
  atualizarEtapa(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AtualizarEtapaDto,
  ) {
    return this.svc.atualizarEtapa(id, dto);
  }

  // DELETE /tipos-tarefa/:id — remove o tipo (etapas em cascata).
  @Delete(':id')
  @UseGuards(CargosGuard)
  @Cargos(...CARGOS_GESTAO)
  remover(@Param('id', ParseUUIDPipe) id: string) {
    return this.svc.remover(id);
  }
}
