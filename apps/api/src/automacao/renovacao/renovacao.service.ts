// Rotina de renovacao de contratos. Roda no agendador (cron) e, para cada
// contrato proximo do vencimento, DISPARA um evento de dominio — quem decide o
// que fazer e a regra "Renovacao automatica 45 dias" no motor. O agendador so
// detecta a janela; a acao fica configuravel (igual ao que o n8n fazia).
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { StatusContrato } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EngineService } from '../engine.service';

// Antecedencia (em dias) para sinalizar a renovacao.
const JANELA_DIAS = 45;
const MS_POR_DIA = 1000 * 60 * 60 * 24;

@Injectable()
export class RenovacaoService {
  private readonly logger = new Logger(RenovacaoService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: EngineService,
  ) {}

  // Todo dia as 8h. In-process (nao depende do Redis) — a deteccao da janela
  // nao pode falhar por causa da fila.
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async rotinaDiaria(): Promise<void> {
    const n = await this.rodarAgora();
    this.logger.log(`Rotina de renovacao: ${n} contrato(s) sinalizado(s).`);
  }

  /**
   * Varre contratos EM_VIGOR com vencimento dentro da janela e dispara o evento
   * `contrato.renovacao_proxima` para cada um. Exposto para disparo manual
   * (painel/testes). Idempotente: ao virar RENOVACAO o contrato sai do filtro.
   */
  async rodarAgora(): Promise<number> {
    const limite = new Date();
    limite.setDate(limite.getDate() + JANELA_DIAS);

    const contratos = await this.prisma.contrato.findMany({
      where: {
        status: StatusContrato.EM_VIGOR,
        renovacaoAutomatica: true,
        vencimento: { lte: limite },
      },
      include: { cliente: { select: { nomeFantasia: true } } },
    });

    for (const c of contratos) {
      const diasRestantes = c.vencimento
        ? Math.max(0, Math.ceil((c.vencimento.getTime() - Date.now()) / MS_POR_DIA))
        : 0;
      await this.engine.dispatch('contrato.renovacao_proxima', {
        contratoId: c.id,
        clienteId: c.clienteId,
        codigoUnico: c.codigoUnico,
        clienteNome: c.cliente?.nomeFantasia ?? '',
        vencimento: c.vencimento ? c.vencimento.toISOString().slice(0, 10) : '',
        diasRestantes,
      });
    }
    return contratos.length;
  }
}
