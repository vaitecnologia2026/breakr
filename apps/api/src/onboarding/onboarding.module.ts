// Modulo de onboarding gamificado (liberado pelo pagamento da 1a fatura).
import { Module } from '@nestjs/common';
import { IntegracoesModule } from '../integracoes';
import { OnboardingService } from './onboarding.service';
import { OnboardingController } from './onboarding.controller';

@Module({
  imports: [IntegracoesModule],
  controllers: [OnboardingController],
  providers: [OnboardingService],
  exports: [OnboardingService],
})
export class OnboardingModule {}
