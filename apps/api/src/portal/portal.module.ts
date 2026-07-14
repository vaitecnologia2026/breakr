// Modulo do portal do cliente (publico, read-only).
import { Module } from '@nestjs/common';
import { NotificacoesModule } from '../notificacoes/notificacoes.module';
import { PortalService } from './portal.service';
import { PortalController } from './portal.controller';
import { PortalRelatorioPdfService } from './portal-relatorio-pdf.service';
import { PortalAcessoService } from './portal-acesso.service';
import { PortalAcessoGuard } from './portal-acesso.guard';

@Module({
  imports: [NotificacoesModule],
  controllers: [PortalController],
  providers: [
    PortalService,
    PortalRelatorioPdfService,
    PortalAcessoService,
    PortalAcessoGuard,
  ],
})
export class PortalModule {}
