// Controller de configuracao do comercial: pipelines, etapas e etiquetas (CRM RD).
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
import { PipelinesService } from './pipelines.service';
import {
  CriarPipelineDto,
  AtualizarPipelineDto,
  EtapaDto,
  AtualizarEtapaDto,
  ReordenarEtapasDto,
  CriarEtiquetaDto,
} from './dto/pipeline.dto';

const ESCRITA = [Cargo.SUPERADMIN, Cargo.ADMIN, Cargo.COMERCIAL, Cargo.CS];

@Controller('comercial')
@UseGuards(JwtAuthGuard)
export class ComercialConfigController {
  constructor(private readonly service: PipelinesService) {}

  // ── Pipelines ──────────────────────────────────────────────────────────────
  @Get('pipelines')
  listarPipelines() {
    return this.service.listarPipelines();
  }

  @Post('pipelines')
  @UseGuards(CargosGuard)
  @Cargos(...ESCRITA)
  criarPipeline(@Body() dto: CriarPipelineDto) {
    return this.service.criarPipeline(dto);
  }

  @Patch('pipelines/:id')
  @UseGuards(CargosGuard)
  @Cargos(...ESCRITA)
  atualizarPipeline(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AtualizarPipelineDto) {
    return this.service.atualizarPipeline(id, dto);
  }

  @Delete('pipelines/:id')
  @UseGuards(CargosGuard)
  @Cargos(...ESCRITA)
  excluirPipeline(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.excluirPipeline(id);
  }

  // ── Etapas ─────────────────────────────────────────────────────────────────
  @Post('pipelines/:id/etapas')
  @UseGuards(CargosGuard)
  @Cargos(...ESCRITA)
  criarEtapa(@Param('id', ParseUUIDPipe) id: string, @Body() dto: EtapaDto) {
    return this.service.criarEtapa(id, dto);
  }

  @Patch('pipelines/:id/etapas/ordem')
  @UseGuards(CargosGuard)
  @Cargos(...ESCRITA)
  reordenarEtapas(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ReordenarEtapasDto) {
    return this.service.reordenarEtapas(id, dto.ids);
  }

  @Patch('etapas/:id')
  @UseGuards(CargosGuard)
  @Cargos(...ESCRITA)
  atualizarEtapa(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AtualizarEtapaDto) {
    return this.service.atualizarEtapa(id, dto);
  }

  @Delete('etapas/:id')
  @UseGuards(CargosGuard)
  @Cargos(...ESCRITA)
  excluirEtapa(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.excluirEtapa(id);
  }

  // ── Etiquetas ──────────────────────────────────────────────────────────────
  @Get('etiquetas')
  listarEtiquetas() {
    return this.service.listarEtiquetas();
  }

  @Post('etiquetas')
  @UseGuards(CargosGuard)
  @Cargos(...ESCRITA)
  criarEtiqueta(@Body() dto: CriarEtiquetaDto) {
    return this.service.criarEtiqueta(dto);
  }

  @Delete('etiquetas/:id')
  @UseGuards(CargosGuard)
  @Cargos(...ESCRITA)
  excluirEtiqueta(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.excluirEtiqueta(id);
  }
}
