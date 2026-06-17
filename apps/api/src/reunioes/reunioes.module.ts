// Módulo de reuniões internas do time.
import { Module } from '@nestjs/common';
import { IntegracoesModule } from '../integracoes';
import { ReunioesService } from './reunioes.service';
import { ReunioesController } from './reunioes.controller';
import { ReunioesSchedulerService } from './reunioes-scheduler.service';

@Module({
  imports: [IntegracoesModule],
  controllers: [ReunioesController],
  providers: [ReunioesService, ReunioesSchedulerService],
})
export class ReunioesModule {}
