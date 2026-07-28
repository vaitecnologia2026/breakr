import { Module } from '@nestjs/common';
import { NotificacoesService } from './notificacoes.service';
import { NotificacoesController } from './notificacoes.controller';
import { NotificacoesGateway } from './notificacoes.gateway';
import { PushModule } from '../push/push.module';

@Module({
  imports: [PushModule],
  providers: [NotificacoesService, NotificacoesGateway],
  controllers: [NotificacoesController],
  // Exporta o service (outros modulos, ex.: motor, podem notificar) e o gateway
  // (caso algum modulo precise emitir em tempo real diretamente).
  exports: [NotificacoesService, NotificacoesGateway],
})
export class NotificacoesModule {}
