// Modulo do portal do cliente (publico, read-only).
import { Module } from '@nestjs/common';
import { NotificacoesModule } from '../notificacoes/notificacoes.module';
import { PortalService } from './portal.service';
import { PortalController } from './portal.controller';

@Module({
  imports: [NotificacoesModule],
  controllers: [PortalController],
  providers: [PortalService],
})
export class PortalModule {}
