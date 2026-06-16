// Endpoints de atendimento WhatsApp — acesso restrito (JWT).
import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AtendimentoService } from './atendimento.service';

@UseGuards(JwtAuthGuard)
@Controller('atendimento')
export class AtendimentoController {
  constructor(private readonly svc: AtendimentoService) {}

  @Get()
  listar() {
    return this.svc.listar();
  }

  @Get('config')
  getConfig() {
    return this.svc.getConfig();
  }

  @Get(':id')
  obter(@Param('id') id: string) {
    return this.svc.obter(id);
  }

  @Post()
  criar(
    @Body() body: { clienteId?: string; waTelefone?: string; assunto?: string },
  ) {
    return this.svc.criar(body.clienteId, body.waTelefone, body.assunto);
  }

  @Post(':id/aceitar')
  aceitar(
    @Param('id') id: string,
    @Req() req: { user: { sub: string } },
  ) {
    return this.svc.aceitar(id, req.user.sub);
  }

  @Post(':id/resolver')
  resolver(@Param('id') id: string) {
    return this.svc.resolver(id);
  }

  @Post(':id/reabrir')
  reabrir(@Param('id') id: string) {
    return this.svc.reabrir(id);
  }

  @Post(':id/mensagens')
  enviar(
    @Param('id') id: string,
    @Body() body: { texto: string },
  ) {
    return this.svc.enviarMensagem(id, body.texto);
  }

  @Put('config')
  salvarConfig(
    @Body()
    body: {
      phoneNumberId?: string;
      accessToken?: string;
      webhookVerifyToken?: string;
      waBaId?: string;
      ativo?: boolean;
    },
  ) {
    return this.svc.salvarConfig(body);
  }
}
