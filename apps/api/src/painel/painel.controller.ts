// Painel inicial — resumo agregado para a tela "Hoje & Atrasados".
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PainelService } from './painel.service';

@Controller('painel')
@UseGuards(JwtAuthGuard)
export class PainelController {
  constructor(private readonly painel: PainelService) {}

  // GET /painel/resumo — contadores e acoes necessarias (qualquer autenticado).
  @Get('resumo')
  resumo() {
    return this.painel.resumo();
  }

  // GET /painel/inbox — itens pendentes detalhados (listas, nao contadores).
  @Get('inbox')
  inbox() {
    return this.painel.inbox();
  }
}
