// Controller da integracao Meta Ads (M17 Fase 2). Conectar conta, criar/gerenciar
// campanhas e ler resultados. Leitura (status/campanhas/insights) para qualquer
// autenticado do time; escrita (criar/mover status) so gestao/trafego.
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Cargo } from '@breakr/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CargosGuard } from '../common/rbac/cargos.guard';
import { Cargos } from '../common/rbac/cargos.decorator';
import { MetaAdsService } from './meta-ads.service';

const CARGOS_TRAFEGO = [
  Cargo.SUPERADMIN,
  Cargo.ADMIN,
  Cargo.GESTOR_TRAFEGO,
  Cargo.ESTRATEGISTA,
] as const;

@Controller('trafego/meta')
@UseGuards(JwtAuthGuard)
export class MetaAdsController {
  constructor(private readonly meta: MetaAdsService) {}

  // GET /trafego/meta/status — valida a conexao (token + conta).
  @Get('status')
  status() {
    return this.meta.status();
  }

  // GET /trafego/meta/campanhas — lista as campanhas reais da conta.
  @Get('campanhas')
  listar() {
    return this.meta.listarCampanhas();
  }

  // GET /trafego/meta/insights — resultados da conta ou de uma campanha.
  @Get('insights')
  insights(
    @Query('campanhaId') campanhaId?: string,
    @Query('nivel') nivel?: string,
    @Query('desde') desde?: string,
    @Query('ate') ate?: string,
  ) {
    return this.meta.insights({ campanhaId, nivel, desde, ate });
  }

  // GET /trafego/meta/contas — lista as contas de anuncio do token (act_...).
  @Get('contas')
  contas() {
    return this.meta.listarContasAnuncio();
  }

  // GET /trafego/meta/paginas — lista as paginas do token (Page ID).
  @Get('paginas')
  paginas() {
    return this.meta.listarPaginas();
  }

  // GET /trafego/meta/token-debug — diagnostica o token (tipo/validade/scopes).
  @Get('token-debug')
  tokenDebug(@Query('token') token?: string) {
    return this.meta.diagnosticarToken(token);
  }

  // GET /trafego/meta/insights-serie — serie diaria (grafico gasto x receita).
  @Get('insights-serie')
  insightsSerie(@Query('desde') desde?: string, @Query('ate') ate?: string) {
    return this.meta.insightsSerie({ desde, ate });
  }

  // GET /trafego/meta/campanhas/:id/adsets — conjuntos de anuncio da campanha.
  @Get('campanhas/:id/adsets')
  adsets(@Param('id') id: string) {
    return this.meta.listarAdsets(id);
  }

  // GET /trafego/meta/campanhas/:id/ads — anuncios da campanha (ou de um adset).
  @Get('campanhas/:id/ads')
  ads(@Param('id') id: string, @Query('adsetId') adsetId?: string) {
    return this.meta.listarAds({ campanhaId: id, adsetId });
  }

  // GET /trafego/meta/publicos — publicos personalizados (Gestao de Publicos).
  @Get('publicos')
  publicos() {
    return this.meta.listarPublicos();
  }

  // GET /trafego/meta/criativos — criativos da conta (Laboratorio de Criativos).
  @Get('criativos')
  criativos() {
    return this.meta.listarCriativos();
  }

  // POST /trafego/meta/campanhas — cria campanha (criada PAUSADA por padrao).
  @Post('campanhas')
  @UseGuards(CargosGuard)
  @Cargos(...CARGOS_TRAFEGO)
  criar(
    @Body()
    dto: {
      nome: string;
      objetivo?: string;
      status?: string;
      orcamentoDiario?: number;
      categoriasEspeciais?: string[];
    },
  ) {
    return this.meta.criarCampanha(dto);
  }

  // PATCH /trafego/meta/campanhas/:id/status — pausa/ativa/arquiva a campanha.
  @Patch('campanhas/:id/status')
  @UseGuards(CargosGuard)
  @Cargos(...CARGOS_TRAFEGO)
  moverStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.meta.moverStatus(id, body.status);
  }

  // PATCH /trafego/meta/campanhas/:id/orcamento — ajusta o orcamento diario (R$).
  @Patch('campanhas/:id/orcamento')
  @UseGuards(CargosGuard)
  @Cargos(...CARGOS_TRAFEGO)
  ajustarOrcamento(@Param('id') id: string, @Body() body: { orcamentoDiario: number }) {
    return this.meta.ajustarOrcamento(id, body.orcamentoDiario);
  }
}
