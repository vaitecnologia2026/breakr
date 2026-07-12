// Modulo de campanhas de marketing (producao) — Briefing Marketing (Secao 3).
// PrismaModule e CommonModule (CodigoUnicoService) sao globais.
import { Module } from '@nestjs/common';
import { CampanhasMarketingService } from './campanhas-marketing.service';
import { CampanhasMarketingController } from './campanhas-marketing.controller';

@Module({
  controllers: [CampanhasMarketingController],
  providers: [CampanhasMarketingService],
})
export class CampanhasMarketingModule {}
