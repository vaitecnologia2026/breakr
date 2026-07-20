// Controller de Carta Oferta (Admin/Superadmin). Modelos parametrizáveis +
// geração/gestão das cartas por candidato. Aditivo — inspirado no InHire.
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
import { CartaOfertaService } from './carta-oferta.service';
import { CriarTemplateCartaDto } from './dto/criar-template-carta.dto';
import { GerarCartaDto } from './dto/gerar-carta.dto';
import { PreviaCartaDto } from './dto/previa-carta.dto';
import { AtualizarStatusCartaDto } from './dto/atualizar-status-carta.dto';

@Controller('carta-oferta')
@UseGuards(JwtAuthGuard, CargosGuard)
@Cargos(Cargo.SUPERADMIN, Cargo.ADMIN)
export class CartaOfertaController {
  constructor(private readonly service: CartaOfertaService) {}

  // ── Modelos ──
  @Get('templates')
  listarTemplates() {
    return this.service.listarTemplates();
  }

  @Post('templates')
  criarTemplate(@Body() dto: CriarTemplateCartaDto) {
    return this.service.criarTemplate(dto);
  }

  @Patch('templates/:id')
  atualizarTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CriarTemplateCartaDto,
  ) {
    return this.service.atualizarTemplate(id, dto);
  }

  @Delete('templates/:id')
  removerTemplate(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.removerTemplate(id);
  }

  // Extrai as variáveis {{campo}} de um conteúdo (para a UI montar o formulário).
  @Post('variaveis')
  variaveis(@Body('conteudo') conteudo: string) {
    return this.service.extrairVariaveis(conteudo ?? '');
  }

  // Prévia renderizada em memória (não persiste).
  @Post('previa')
  previa(@Body() dto: PreviaCartaDto) {
    return this.service.previa(dto.conteudo, dto.valores);
  }

  // ── Cartas geradas ──
  @Get()
  listarCartas(@Query('candidatoId') candidatoId?: string) {
    return this.service.listarCartas(candidatoId);
  }

  @Post('gerar')
  gerarCarta(@Body() dto: GerarCartaDto) {
    return this.service.gerarCarta(dto);
  }

  @Patch(':id/status')
  atualizarStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AtualizarStatusCartaDto,
  ) {
    return this.service.atualizarStatusCarta(id, dto.status);
  }
}
