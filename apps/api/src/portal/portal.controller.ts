// Portal do cliente — PUBLICO (sem JwtAuthGuard). O cliente final acessa pelo
// codigo unico, que funciona como slug nao-adivinhavel.
// SEGURANCA: na producao trocar por magic-link/token assinado; aqui devolvemos
// apenas dados operacionais do proprio cliente e validamos a posse da peca.
import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { PortalService } from './portal.service';
import { AprovarConteudoDto } from './dto/aprovar-conteudo.dto';
import { AjusteConteudoDto } from './dto/ajuste-conteudo.dto';
import { SubmeterDemandaDto } from './dto/submeter-demanda.dto';
import { AprovarEstrategiaDto } from './dto/aprovar-estrategia.dto';
import { AprovarMaterialDto } from './dto/aprovar-material.dto';
import { ReprovarMaterialDto } from './dto/reprovar-material.dto';

@Controller('portal')
export class PortalController {
  constructor(private readonly portal: PortalService) {}

  // GET /portal/:codigo/relatorio.pdf — relatorio de resultados do cliente em PDF
  // (Secao 12, item 12). Antes de :codigo para nao colidir com o slug.
  @Get(':codigo/relatorio.pdf')
  @Header('Content-Type', 'application/pdf')
  async relatorioPdf(@Param('codigo') codigo: string, @Res() res: Response) {
    const { buffer, nomeArquivo } = await this.portal.gerarRelatorioPdf(codigo);
    res.setHeader('Content-Disposition', `attachment; filename="${nomeArquivo}"`);
    res.send(buffer);
  }

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

  // POST /portal/:codigo/material/:id/aprovar — cliente aprova o material da campanha
  // (com ou sem ressalvas). Briefing Marketing — Secao 9, Modulo 1.
  @Post(':codigo/material/:id/aprovar')
  aprovarMaterial(
    @Param('codigo') codigo: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AprovarMaterialDto,
  ) {
    return this.portal.aprovarMaterial(codigo, id, dto);
  }

  // POST /portal/:codigo/material/:id/reprovar — cliente reprova o material (volta
  // para ajuste; comentario obrigatorio). Briefing Marketing — Secao 9, Modulo 1.
  @Post(':codigo/material/:id/reprovar')
  reprovarMaterial(
    @Param('codigo') codigo: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReprovarMaterialDto,
  ) {
    return this.portal.reprovarMaterial(codigo, id, dto);
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
