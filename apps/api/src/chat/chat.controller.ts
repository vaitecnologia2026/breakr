import { Body, Controller, Get, Param, Post, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ChatService } from './chat.service';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Get('canais')
  listarCanais() {
    return this.chat.listarCanais();
  }

  @Post('canais')
  criarCanal(@Body() dto: { nome: string; descricao?: string }) {
    return this.chat.criarCanal(dto.nome, dto.descricao);
  }

  @Get('canais/:id/mensagens')
  listarMensagens(
    @Param('id') id: string,
    @Query('depois') depois?: string,
  ) {
    return this.chat.listarMensagens(id, depois);
  }

  @Post('canais/:id/mensagens')
  enviarMensagem(
    @Param('id') canalId: string,
    @Body() dto: { conteudo: string },
    @Request() req: any,
  ) {
    return this.chat.enviarMensagem(canalId, dto.conteudo, req.user?.id);
  }

  // ----------------------- Mensagens diretas (DM 1:1) — B7 -----------------------

  @Get('dm/contatos')
  listarContatos(@Request() req: any) {
    return this.chat.listarContatos(req.user?.id);
  }

  @Get('dm/conversas')
  listarConversasDiretas(@Request() req: any) {
    return this.chat.listarConversasDiretas(req.user?.id);
  }

  @Get('dm/:usuarioId/mensagens')
  listarMensagensDiretas(
    @Param('usuarioId') outroId: string,
    @Query('depois') depois: string | undefined,
    @Request() req: any,
  ) {
    return this.chat.listarMensagensDiretas(req.user?.id, outroId, depois);
  }

  @Post('dm/:usuarioId/mensagens')
  enviarMensagemDireta(
    @Param('usuarioId') paraId: string,
    @Body() dto: { texto: string },
    @Request() req: any,
  ) {
    return this.chat.enviarMensagemDireta(req.user?.id, paraId, dto.texto);
  }
}
