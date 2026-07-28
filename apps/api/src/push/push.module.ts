import { Module } from '@nestjs/common';
import { PushService } from './push.service';
import { PushController } from './push.controller';

@Module({
  providers: [PushService],
  controllers: [PushController],
  // Exporta o service para que outros modulos (ex.: Notificacoes) disparem push
  // ao criar uma notificacao.
  exports: [PushService],
})
export class PushModule {}
