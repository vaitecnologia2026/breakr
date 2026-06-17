// Scheduler que mantém a reunião presencial fixa do 2º sábado do mês.
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ReunioesService } from './reunioes.service';

@Injectable()
export class ReunioesSchedulerService {
  private readonly logger = new Logger(ReunioesSchedulerService.name);

  constructor(private readonly reunioes: ReunioesService) {}

  // Roda diariamente (idempotente) — garante a reunião do mês corrente.
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async garantir(): Promise<void> {
    const r = await this.reunioes.garantirReuniaoSabado();
    this.logger.log(`Reunião presencial mensal garantida (${r.id}).`);
  }
}
