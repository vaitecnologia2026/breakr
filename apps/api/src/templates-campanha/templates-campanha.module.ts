// Modulo de templates de campanha + geracao em lote (Briefing Marketing — Secao 4).
// PrismaModule e CommonModule (CodigoUnicoService) sao globais.
import { Module } from '@nestjs/common';
import { TemplatesCampanhaService } from './templates-campanha.service';
import { TemplatesCampanhaController } from './templates-campanha.controller';

@Module({
  controllers: [TemplatesCampanhaController],
  providers: [TemplatesCampanhaService],
})
export class TemplatesCampanhaModule {}
