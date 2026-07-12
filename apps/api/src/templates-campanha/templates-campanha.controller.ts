// Controller de templates de campanha + geracao em lote (Briefing Marketing — Secao 4).
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
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CargosGuard } from '../common/rbac/cargos.guard';
import { Cargos } from '../common/rbac/cargos.decorator';
import { Cargo } from '@breakr/shared';
import { TemplatesCampanhaService } from './templates-campanha.service';
import { CriarTemplateDto } from './dto/criar-template.dto';
import { AtualizarTemplateDto } from './dto/atualizar-template.dto';
import { CriarTemplateMaterialDto, AtualizarTemplateMaterialDto } from './dto/material-template.dto';
import { GerarLoteDto, PreviewLoteDto } from './dto/gerar-lote.dto';

const CARGOS_GESTAO = [Cargo.SUPERADMIN, Cargo.ADMIN, Cargo.ESTRATEGISTA, Cargo.CS] as const;

@Controller('templates-campanha')
@UseGuards(JwtAuthGuard)
export class TemplatesCampanhaController {
  constructor(private readonly service: TemplatesCampanhaService) {}

  @Get()
  listar(@Query('incluirArquivados') incluirArquivados?: string) {
    return this.service.listar(incluirArquivados === 'true');
  }

  // Rotas de material do template — antes de :id.
  @Patch('materiais/:materialId')
  @UseGuards(CargosGuard)
  @Cargos(...CARGOS_GESTAO)
  atualizarMaterial(
    @Param('materialId', ParseUUIDPipe) materialId: string,
    @Body() dto: AtualizarTemplateMaterialDto,
  ) {
    return this.service.atualizarMaterial(materialId, dto);
  }

  @Delete('materiais/:materialId')
  @UseGuards(CargosGuard)
  @Cargos(...CARGOS_GESTAO)
  removerMaterial(@Param('materialId', ParseUUIDPipe) materialId: string) {
    return this.service.removerMaterial(materialId);
  }

  @Get(':id')
  obter(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.obter(id);
  }

  @Post()
  @UseGuards(CargosGuard)
  @Cargos(...CARGOS_GESTAO)
  criar(@Body() dto: CriarTemplateDto) {
    return this.service.criar(dto);
  }

  @Patch(':id')
  @UseGuards(CargosGuard)
  @Cargos(...CARGOS_GESTAO)
  atualizar(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AtualizarTemplateDto) {
    return this.service.atualizar(id, dto);
  }

  @Delete(':id')
  @UseGuards(CargosGuard)
  @Cargos(...CARGOS_GESTAO)
  remover(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remover(id);
  }

  @Post(':id/duplicar')
  @UseGuards(CargosGuard)
  @Cargos(...CARGOS_GESTAO)
  duplicar(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.duplicar(id);
  }

  @Post(':id/materiais')
  @UseGuards(CargosGuard)
  @Cargos(...CARGOS_GESTAO)
  adicionarMaterial(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CriarTemplateMaterialDto,
  ) {
    return this.service.adicionarMaterial(id, dto);
  }

  // Preview do lote (somente leitura — qualquer autenticado).
  @Post(':id/preview')
  preview(@Param('id', ParseUUIDPipe) id: string, @Body() dto: PreviewLoteDto) {
    return this.service.preview(id, dto);
  }

  // Geracao em lote (escrita — coordenacao/CS).
  @Post(':id/gerar')
  @UseGuards(CargosGuard)
  @Cargos(...CARGOS_GESTAO)
  gerar(@Param('id', ParseUUIDPipe) id: string, @Body() dto: GerarLoteDto) {
    return this.service.gerar(id, dto);
  }
}
