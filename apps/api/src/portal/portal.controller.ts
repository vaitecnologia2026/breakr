// Portal do cliente — PUBLICO (sem JwtAuthGuard). O cliente final acessa pelo
// codigo unico, que funciona como slug nao-adivinhavel.
// SEGURANCA: na producao trocar por magic-link/token assinado; aqui devolvemos
// apenas dados operacionais do proprio cliente (ver PortalService).
import { Controller, Get, Param } from '@nestjs/common';
import { PortalService } from './portal.service';

@Controller('portal')
export class PortalController {
  constructor(private readonly portal: PortalService) {}

  // GET /portal/:codigo — visao read-only do cliente.
  @Get(':codigo')
  obter(@Param('codigo') codigo: string) {
    return this.portal.obterPorCodigo(codigo);
  }
}
