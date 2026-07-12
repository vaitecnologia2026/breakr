// Controller de campanhas de marketing (producao) — Briefing Marketing (Secao 3).
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
import { CampanhasMarketingService } from './campanhas-marketing.service';
import { CriarCampanhaDto } from './dto/criar-campanha.dto';
import { AtualizarCampanhaDto } from './dto/atualizar-campanha.dto';
import { CriarMaterialDto } from './dto/criar-material.dto';
import { AtualizarMaterialDto } from './dto/atualizar-material.dto';
import { EnviarAprovacaoInternaDto } from './dto/enviar-aprovacao-interna.dto';
import { DecidirAprovacaoInternaDto } from './dto/decidir-aprovacao-interna.dto';

// Cargos que gerenciam a producao de marketing (coordenacao + CS que planeja).
const CARGOS_GESTAO = [Cargo.SUPERADMIN, Cargo.ADMIN, Cargo.ESTRATEGISTA, Cargo.CS] as const;
// Departamentos que dao o aval interdepartamental (Secao 8): Gestao (ADMIN) e Financeiro.
const CARGOS_APROVACAO_INTERNA = [Cargo.SUPERADMIN, Cargo.ADMIN, Cargo.FINANCEIRO] as const;

@Controller('campanhas-marketing')
@UseGuards(JwtAuthGuard)
export class CampanhasMarketingController {
  constructor(private readonly service: CampanhasMarketingService) {}

  // GET /campanhas-marketing — lista (qualquer autenticado).
  @Get()
  listar() {
    return this.service.listar();
  }

  // Rotas de material vem ANTES de :id para nao colidir com o param.
  @Patch('materiais/:materialId')
  @UseGuards(CargosGuard)
  @Cargos(...CARGOS_GESTAO)
  atualizarMaterial(
    @Param('materialId', ParseUUIDPipe) materialId: string,
    @Body() dto: AtualizarMaterialDto,
  ) {
    return this.service.atualizarMaterial(materialId, dto);
  }

  @Delete('materiais/:materialId')
  @UseGuards(CargosGuard)
  @Cargos(...CARGOS_GESTAO)
  removerMaterial(@Param('materialId', ParseUUIDPipe) materialId: string) {
    return this.service.removerMaterial(materialId);
  }

  // GET /campanhas-marketing/aprovacoes-internas — campanhas em aprovacao interna
  // (Secao 8). Antes de :id para nao colidir com o param. Qualquer autenticado le.
  @Get('aprovacoes-internas')
  listarAprovacoesInternas() {
    return this.service.listarAprovacoesInternas();
  }

  // GET /campanhas-marketing/:id — detalhe com materiais (qualquer autenticado).
  @Get(':id')
  obter(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.obter(id);
  }

  // POST /campanhas-marketing/:id/aprovacao-interna/enviar — coordenacao envia a
  // campanha para validacao de um departamento (Gestao/Financeiro).
  @Post(':id/aprovacao-interna/enviar')
  @UseGuards(CargosGuard)
  @Cargos(...CARGOS_GESTAO)
  enviarAprovacaoInterna(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: EnviarAprovacaoInternaDto,
  ) {
    return this.service.enviarAprovacaoInterna(id, dto);
  }

  // POST /campanhas-marketing/:id/aprovacao-interna/decidir — o departamento da o
  // aval / sugere ajuste / reprova (Secao 8).
  @Post(':id/aprovacao-interna/decidir')
  @UseGuards(CargosGuard)
  @Cargos(...CARGOS_APROVACAO_INTERNA)
  decidirAprovacaoInterna(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DecidirAprovacaoInternaDto,
  ) {
    return this.service.decidirAprovacaoInterna(id, dto);
  }

  // POST /campanhas-marketing — cria campanha.
  @Post()
  @UseGuards(CargosGuard)
  @Cargos(...CARGOS_GESTAO)
  criar(@Body() dto: CriarCampanhaDto) {
    return this.service.criar(dto);
  }

  // PATCH /campanhas-marketing/:id — atualiza campanha.
  @Patch(':id')
  @UseGuards(CargosGuard)
  @Cargos(...CARGOS_GESTAO)
  atualizar(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AtualizarCampanhaDto) {
    return this.service.atualizar(id, dto);
  }

  // DELETE /campanhas-marketing/:id — remove campanha.
  @Delete(':id')
  @UseGuards(CargosGuard)
  @Cargos(...CARGOS_GESTAO)
  remover(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remover(id);
  }

  // POST /campanhas-marketing/:id/materiais — adiciona material.
  @Post(':id/materiais')
  @UseGuards(CargosGuard)
  @Cargos(...CARGOS_GESTAO)
  adicionarMaterial(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CriarMaterialDto,
  ) {
    return this.service.adicionarMaterial(id, dto);
  }
}
