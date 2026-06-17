// Scheduler de lembretes de cobrança. Roda diariamente às 9h e emite
// fatura.lembrete_vencimento para faturas PENDENTES que vencem em 7, 3 ou 1 dia.
// Equivale ao n8n "[Lembrancas ASAAS] Lembrancas de Cobrancas ASAAS".
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { StatusFatura } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { dataIsoSaoPaulo } from '../common/data.util';
import { EngineService } from './engine.service';

const DIAS_ALERTA = [7, 3, 1];

@Injectable()
export class CobrancasSchedulerService {
  private readonly logger = new Logger(CobrancasSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: EngineService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async verificarVencimentos(): Promise<void> {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    for (const dias of DIAS_ALERTA) {
      const alvo = new Date(hoje);
      alvo.setDate(alvo.getDate() + dias);
      const proximo = new Date(alvo);
      proximo.setDate(proximo.getDate() + 1);

      const faturas = await this.prisma.fatura.findMany({
        where: {
          status: StatusFatura.PENDENTE,
          vencimento: { gte: alvo, lt: proximo },
        },
        include: { cliente: { select: { nomeFantasia: true } } },
      });

      for (const fatura of faturas) {
        await this.engine.dispatch('fatura.lembrete_vencimento', {
          faturaId: fatura.id,
          codigoUnico: fatura.codigoUnico,
          valor: Number(fatura.valor).toFixed(2),
          vencimento: dataIsoSaoPaulo(fatura.vencimento),
          diasRestantes: dias,
          clienteId: fatura.clienteId,
          clienteNome: fatura.cliente.nomeFantasia,
        });
        this.logger.log(
          `Lembrete emitido: fatura ${fatura.codigoUnico} de ${fatura.cliente.nomeFantasia} (${dias}d)`,
        );
      }
    }
  }
}
