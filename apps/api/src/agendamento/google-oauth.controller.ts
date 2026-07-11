// Endpoints do fluxo OAuth do Google Agenda (admin). Gera a URL de consentimento
// e recebe o "code" do callback para guardar o refresh token.
import { BadRequestException, Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Cargo } from '@breakr/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CargosGuard } from '../common/rbac/cargos.guard';
import { Cargos } from '../common/rbac/cargos.decorator';
import { GoogleAgendaService } from './google-agenda.service';

@Controller('agendamento/google/oauth')
@UseGuards(JwtAuthGuard, CargosGuard)
@Cargos(Cargo.SUPERADMIN, Cargo.ADMIN)
export class GoogleOAuthController {
  constructor(private readonly googleAgenda: GoogleAgendaService) {}

  // URL para redirecionar o admin ao consentimento do Google.
  @Get('url')
  async url() {
    return { url: await this.googleAgenda.gerarUrlConsentimento() };
  }

  // Troca o "code" recebido no callback por tokens e guarda o refresh token.
  @Post('callback')
  async callback(@Body('code') code: string) {
    if (!code) throw new BadRequestException('code ausente');
    return { ok: true, ...(await this.googleAgenda.conectarComCodigo(code)) };
  }
}
