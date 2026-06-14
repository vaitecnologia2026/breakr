// Modulo do comercial — pipeline de vendas (CRM, M11). Depende do motor de
// automacao para disparar o evento lead.ganho na conversao.
import { Module } from '@nestjs/common';
import { AutomacaoModule } from '../automacao/automacao.module';
import { ComercialService } from './comercial.service';
import { ComercialController } from './comercial.controller';

@Module({
  imports: [AutomacaoModule],
  controllers: [ComercialController],
  providers: [ComercialService],
  exports: [ComercialService],
})
export class ComercialModule {}
