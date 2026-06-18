import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { IaModule } from '../ia/ia.module';
import { AtendimentoController } from './atendimento.controller';
import { AtendimentoWebhookController } from './webhook.controller';
import { AtendimentoService } from './atendimento.service';

@Module({
  imports: [PrismaModule, IaModule],
  controllers: [AtendimentoController, AtendimentoWebhookController],
  providers: [AtendimentoService],
  exports: [AtendimentoService],
})
export class AtendimentoModule {}
