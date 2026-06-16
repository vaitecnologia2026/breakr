import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AtendimentoController } from './atendimento.controller';
import { AtendimentoWebhookController } from './webhook.controller';
import { AtendimentoService } from './atendimento.service';

@Module({
  imports: [PrismaModule],
  controllers: [AtendimentoController, AtendimentoWebhookController],
  providers: [AtendimentoService],
  exports: [AtendimentoService],
})
export class AtendimentoModule {}
