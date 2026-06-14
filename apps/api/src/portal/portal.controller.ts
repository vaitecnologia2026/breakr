// Portal do cliente — PUBLICO (sem JwtAuthGuard). O cliente final acessa pelo
// codigo unico, que funciona como slug nao-adivinhavel.
// SEGURANCA: na producao trocar por magic-link/token assinado; aqui devolvemos
// apenas dados operacionais do proprio cliente e validamos a posse da peca.
import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { PortalService } from './portal.service';
import { AprovarConteudoDto } from './dto/aprovar-conteudo.dto';
import { AjusteConteudoDto } from './dto/ajuste-conteudo.dto';

@Controller('portal')
export class PortalController {
  constructor(private readonly portal: PortalService) {}

  // GET /portal/:codigo — visao read-only do cliente.
  @Get(':codigo')
  obter(@Param('codigo') codigo: string) {
    return this.portal.obterPorCodigo(codigo);
  }

  // POST /portal/:codigo/conteudo/:id/aprovar — cliente aprova e avalia a peca.
  @Post(':codigo/conteudo/:id/aprovar')
  aprovar(
    @Param('codigo') codigo: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AprovarConteudoDto,
  ) {
    return this.portal.aprovar(codigo, id, dto);
  }

  // POST /portal/:codigo/conteudo/:id/ajuste — cliente pede ajuste (rework).
  @Post(':codigo/conteudo/:id/ajuste')
  ajuste(
    @Param('codigo') codigo: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AjusteConteudoDto,
  ) {
    return this.portal.solicitarAjuste(codigo, id, dto);
  }
}
