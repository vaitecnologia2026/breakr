// Módulo de webhooks externos — sem autenticação JWT.
// Importa PrismaModule e AutomacaoModule sem criar ciclo de dependência.
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AutomacaoModule } from '../automacao/automacao.module';
import { ContratosModule } from '../contratos/contratos.module';
import { WebhooksController } from './webhooks.controller';

@Module({
  imports: [PrismaModule, AutomacaoModule, ContratosModule],
  controllers: [WebhooksController],
})
export class WebhooksModule {}
