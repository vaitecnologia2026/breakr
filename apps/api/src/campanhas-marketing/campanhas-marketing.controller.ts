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

// Cargos que gerenciam a producao de marketing (coordenacao + CS que planeja).
const CARGOS_GESTAO = [Cargo.SUPERADMIN, Cargo.ADMIN, Cargo.ESTRATEGISTA, Cargo.CS] as const;

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

  // GET /campanhas-marketing/:id — detalhe com materiais (qualquer autenticado).
  @Get(':id')
  obter(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.obter(id);
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
