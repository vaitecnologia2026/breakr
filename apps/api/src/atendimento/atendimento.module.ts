import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { IaModule } from '../ia/ia.module';
import { AtendimentoController } from './atendimento.controller';
import { AtendimentoWebhookController } from './webhook.controller';
import { AtendimentoAvaliacaoController } from './avaliacao.controller';
import { AtendimentoService } from './atendimento.service';
import { VaiCrmController } from './vai-crm.controller';
import { VaiCrmService } from './vai-crm.service';

@Module({
  imports: [PrismaModule, IaModule],
  controllers: [
    AtendimentoController,
    AtendimentoWebhookController,
    AtendimentoAvaliacaoController,
    VaiCrmController,
  ],
  providers: [AtendimentoService, VaiCrmService],
  exports: [AtendimentoService],
})
export class AtendimentoModule {}
