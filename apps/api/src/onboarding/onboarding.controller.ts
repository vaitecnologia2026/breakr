// Controller de onboarding gamificado.
import { Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OnboardingService } from './onboarding.service';

@Controller('onboarding')
@UseGuards(JwtAuthGuard)
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  // GET /onboarding/cliente/:id — checklist do cliente (ou null).
  @Get('cliente/:id')
  obterPorCliente(@Param('id', ParseUUIDPipe) id: string) {
    return this.onboardingService.obterPorCliente(id);
  }

  // POST /onboarding/etapa/:stepId/concluir — marca uma etapa como concluida.
  @Post('etapa/:stepId/concluir')
  concluirEtapa(@Param('stepId', ParseUUIDPipe) stepId: string) {
    return this.onboardingService.concluirEtapa(stepId);
  }
}
