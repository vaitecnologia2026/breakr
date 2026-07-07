// Endpoints da integração VAI CRM — acesso restrito (JWT do Breakr).
//
// ADITIVO: prefixo próprio "/atendimento/crm" para não colidir com as rotas
// já existentes de atendimento (inbox local). Nada aqui altera o inbox local.
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { VaiCrmService } from './vai-crm.service';

@UseGuards(JwtAuthGuard)
@Controller('atendimento/crm')
export class VaiCrmController {
  constructor(private readonly svc: VaiCrmService) {}

  @Get('status')
  status() {
    return this.svc.status();
  }

  @Get('chats')
  chats(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.svc.listarChats({
      status,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search,
    });
  }

  @Get('tab-counts')
  tabCounts() {
    return this.svc.tabCounts();
  }

  @Get('chats/:id')
  obter(@Param('id') id: string) {
    return this.svc.obterChat(id);
  }

  @Get('chats/:id/messages')
  mensagens(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.svc.mensagens(id, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post('chats/:id/messages')
  enviar(@Param('id') id: string, @Body() body: { content: string }) {
    return this.svc.enviarMensagem(id, body.content);
  }

  @Post('chats/:id/start-service')
  iniciar(@Param('id') id: string) {
    return this.svc.iniciarAtendimento(id);
  }

  @Post('chats/:id/close')
  encerrar(
    @Param('id') id: string,
    @Body() body: { reasonId?: string; notes?: string },
  ) {
    return this.svc.encerrar(id, body?.reasonId, body?.notes);
  }

  @Post('chats/:id/reopen')
  reabrir(@Param('id') id: string) {
    return this.svc.reabrir(id);
  }
}
