// Motor de automação próprio — dispatcher de eventos inline.
// Cada chamada a dispatch() executa as regras ativas no mesmo processo,
// sem fila externa. Sem Redis, sem BullMQ, sem infraestrutura adicional.
// Observabilidade: cada regra disparada grava um JobExecution no banco.
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegrasService } from './motor/regras.service';

export interface AutomacaoJob {
  evento: string;
  payload: Record<string, unknown>;
  ruleId?: string;
}

@Injectable()
export class EngineService {
  private readonly logger = new Logger(EngineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly regras: RegrasService,
  ) {}

  /**
   * Dispara um evento de domínio. Executa todas as regras ativas que casam
   * com o evento de forma inline (síncrona dentro do processo NestJS).
   * Erros em regras individuais são capturados e logados — nunca derrubam
   * a operação que originou o evento.
   */
  async dispatch(evento: string, payload: Record<string, unknown>, ruleId?: string): Promise<void> {
    this.logger.debug(`dispatch("${evento}") — inline.`);
    try {
      await this.regras.executarEvento(evento, payload);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Erro ao executar regras do evento "${evento}": ${msg}`);
    }
  }

  /**
   * Registra ou atualiza uma regra de automação no banco.
   * Usado pelo painel de automações para criar/editar regras customizadas.
   */
  async registerRule(rule: {
    id?: string;
    nome: string;
    ativa?: boolean;
    trigger: unknown;
    condicoes?: unknown;
    acoes: unknown;
    parametros?: unknown;
  }): Promise<{ id: string }> {
    const dados = {
      nome: rule.nome,
      ativa: rule.ativa ?? true,
      trigger: rule.trigger as object,
      condicoes: (rule.condicoes ?? undefined) as object | undefined,
      acoes: rule.acoes as object,
      parametros: (rule.parametros ?? undefined) as object | undefined,
    };

    const registro = rule.id
      ? await this.prisma.automacaoRule.update({ where: { id: rule.id }, data: dados })
      : await this.prisma.automacaoRule.create({ data: dados });

    this.logger.log(`Regra registrada: ${registro.nome} (${registro.id})`);
    return { id: registro.id };
  }

  /** Sempre true — motor inline nunca fica "desabilitado". */
  estaHabilitado(): boolean {
    return true;
  }
}
