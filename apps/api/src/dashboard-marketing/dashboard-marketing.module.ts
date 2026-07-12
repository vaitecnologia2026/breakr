// Modulo do Dashboard da Coordenadora de Marketing (Briefing Marketing — Secoes 5 e 6).
// Somente leitura. PrismaModule e global (nao precisa importar).
import { Module } from '@nestjs/common';
import { DashboardMarketingService } from './dashboard-marketing.service';
import { DashboardMarketingController } from './dashboard-marketing.controller';

@Module({
  controllers: [DashboardMarketingController],
  providers: [DashboardMarketingService],
})
export class DashboardMarketingModule {}
