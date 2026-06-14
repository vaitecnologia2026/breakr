// Modulo de faturas/cobrancas (M13). Depende das integracoes (ASAAS/Speed/
// WhatsApp), do motor, das notificacoes e dos modulos de projetos/onboarding
// que sao liberados quando uma fatura e paga.
import { Module } from '@nestjs/common';
import { IntegracoesModule } from '../integracoes';
import { AutomacaoModule } from '../automacao/automacao.module';
import { NotificacoesModule } from '../notificacoes/notificacoes.module';
import { ProjetosModule } from '../projetos/projetos.module';
import { OnboardingModule } from '../onboarding/onboarding.module';
import { FaturasService } from './faturas.service';
import { FaturasController } from './faturas.controller';

@Module({
  imports: [
    IntegracoesModule,
    AutomacaoModule,
    NotificacoesModule,
    ProjetosModule,
    OnboardingModule,
  ],
  controllers: [FaturasController],
  providers: [FaturasService],
  exports: [FaturasService],
})
export class FaturasModule {}
