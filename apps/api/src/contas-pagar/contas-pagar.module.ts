// Módulo de contas a pagar (financeiro interno).
import { Module } from '@nestjs/common';
import { ContasPagarService } from './contas-pagar.service';
import { ContasPagarController } from './contas-pagar.controller';

@Module({
  controllers: [ContasPagarController],
  providers: [ContasPagarService],
})
export class ContasPagarModule {}
