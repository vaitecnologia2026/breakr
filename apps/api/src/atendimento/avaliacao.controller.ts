// Avaliação do atendimento (CSAT) — fluxo PÚBLICO: o cliente acessa via link
// enviado após a resolução. Sem JWT.
import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { AtendimentoService } from './atendimento.service';

@Controller('atendimento/avaliacao')
export class AtendimentoAvaliacaoController {
  constructor(private readonly svc: AtendimentoService) {}

  @Get(':id')
  dados(@Param('id') id: string) {
    return this.svc.dadosAvaliacao(id);
  }

  @Post(':id')
  avaliar(@Param('id') id: string, @Body() body: { nota: number; comentario?: string }) {
    return this.svc.avaliar(id, Number(body.nota), body.comentario);
  }
}
