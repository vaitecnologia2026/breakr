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
import { SubmeterDemandaDto } from './dto/submeter-demanda.dto';
import { AprovarEstrategiaDto } from './dto/aprovar-estrategia.dto';

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

  // POST /portal/:codigo/demanda — cliente submete uma nova solicitacao de conteudo.
  @Post(':codigo/demanda')
  submeterDemanda(
    @Param('codigo') codigo: string,
    @Body() dto: SubmeterDemandaDto,
  ) {
    return this.portal.submeterDemanda(codigo, dto);
  }

  // POST /portal/:codigo/aula/:id/concluir — cliente marca uma aula como assistida.
  @Post(':codigo/aula/:id/concluir')
  concluirAula(
    @Param('codigo') codigo: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.portal.marcarAulaConcluida(codigo, id);
  }

  // POST /portal/:codigo/estrategia/:id/aprovar — cliente aprova a estratégia (B6).
  @Post(':codigo/estrategia/:id/aprovar')
  aprovarEstrategia(
    @Param('codigo') codigo: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AprovarEstrategiaDto,
  ) {
    return this.portal.aprovarEstrategia(codigo, id, dto);
  }

  // POST /portal/:codigo/estrategia/:id/ajuste — cliente pede ajuste na estratégia (B6).
  @Post(':codigo/estrategia/:id/ajuste')
  ajusteEstrategia(
    @Param('codigo') codigo: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AjusteConteudoDto,
  ) {
    return this.portal.solicitarAjusteEstrategia(codigo, id, dto);
  }

  // POST /portal/:codigo/pesquisas/:id/responder — cliente responde uma pesquisa (l.46).
  @Post(':codigo/pesquisas/:id/responder')
  responderPesquisa(
    @Param('codigo') codigo: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('nota') nota?: number,
    @Body('comentario') comentario?: string,
  ) {
    return this.portal.responderPesquisa(codigo, id, { nota, comentario });
  }
}
