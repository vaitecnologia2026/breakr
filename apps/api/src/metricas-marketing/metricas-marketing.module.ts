// Modulo de Metricas de Marketing (Briefing Marketing — Secao 7). Somente leitura.
// PrismaModule e global.
import { Module } from '@nestjs/common';
import { MetricasMarketingService } from './metricas-marketing.service';
import { MetricasMarketingController } from './metricas-marketing.controller';

@Module({
  controllers: [MetricasMarketingController],
  providers: [MetricasMarketingService],
})
export class MetricasMarketingModule {}
