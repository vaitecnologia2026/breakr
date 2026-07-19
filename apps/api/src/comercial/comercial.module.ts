// Modulo do comercial — pipeline de vendas (CRM, M11). Depende do motor de
// automacao para disparar o evento lead.ganho na conversao.
import { Module } from '@nestjs/common';
import { AutomacaoModule } from '../automacao/automacao.module';
import { TrafegoModule } from '../trafego/trafego.module';
import { ComercialService } from './comercial.service';
import { ComercialController } from './comercial.controller';
import { ComercialPublicoController } from './comercial-publico.controller';
import { ComercialConfigController } from './comercial-config.controller';
import { PipelinesService } from './pipelines.service';

@Module({
  imports: [AutomacaoModule, TrafegoModule],
  controllers: [ComercialController, ComercialPublicoController, ComercialConfigController],
  providers: [ComercialService, PipelinesService],
  exports: [ComercialService],
})
export class ComercialModule {}
