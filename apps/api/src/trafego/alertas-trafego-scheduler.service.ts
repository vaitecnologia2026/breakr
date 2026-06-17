// Scheduler de alertas de tráfego. Roda diariamente e notifica o gestor de
// tráfego sobre campanhas fora do threshold (CTR baixo, gasto sem conversão).
// Trabalha sobre as métricas já cadastradas — não depende da Meta API.
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Cargo } from '@breakr/shared';
import { NotificacoesService } from '../notificacoes/notificacoes.service';
import { TrafegoService } from './trafego.service';

@Injectable()
export class AlertasTrafegoSchedulerService {
  private readonly logger = new Logger(AlertasTrafegoSchedulerService.name);

  constructor(
    private readonly trafego: TrafegoService,
    private readonly notificacoes: NotificacoesService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async verificarAlertas(): Promise<void> {
    const alertas = await this.trafego.alertas();
    if (alertas.length === 0) return;

    await this.notificacoes.notificarPorCargo(Cargo.GESTOR_TRAFEGO, {
      titulo: `${alertas.length} campanha(s) precisam de atenção`,
      mensagem: alertas
        .slice(0, 5)
        .map((a) => `${a.cliente} — ${a.nome}: ${a.motivo}`)
        .join(' | '),
      tipo: 'ALERTA',
      link: '/trafego',
    });
    this.logger.log(`Alertas de tráfego emitidos: ${alertas.length}`);
  }
}
