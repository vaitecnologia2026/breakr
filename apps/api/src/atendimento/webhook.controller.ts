// Webhook Meta — sem JWT (chamado diretamente pela Meta).
import { Controller, Get, Post, Body, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AtendimentoService } from './atendimento.service';

@Controller('atendimento/webhooks')
export class AtendimentoWebhookController {
  constructor(private readonly svc: AtendimentoService) {}

  // Verificacao do webhook pela Meta (GET com hub.challenge).
  @Get('meta')
  verificar(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    const esperado = process.env.WA_WEBHOOK_VERIFY_TOKEN ?? 'breakr-webhook';
    if (mode === 'subscribe' && token === esperado) {
      res.status(200).send(challenge);
    } else {
      res.status(403).json({ message: 'Forbidden' });
    }
  }

  // Recepcao de mensagens inbound.
  @Post('meta')
  async receber(@Body() payload: unknown) {
    await this.svc.processarWebhookMeta(payload);
    return { ok: true };
  }
}
