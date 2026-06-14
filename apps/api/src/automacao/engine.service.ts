// ============================================================
// Motor de Automacao proprio — ESQUELETO (Fase 0).
// Ref.: docs/escopo/03-motor-de-automacao.md
//
// IMPORTANTE: este e apenas o esqueleto da Fase 0. A logica completa
// (dispatcher casando eventos com regras, condicoes/switch, catalogo de
// acoes internas + adapters de integracao, retry/loop/delay, idempotencia,
// dead-letter e painel de execucoes) chega na FASE 1 — ver doc 03.
//
// Aqui montamos a espinha dorsal: uma fila BullMQ "automacao" sobre Redis e
// um Worker stub que apenas registra a execucao em JobExecution. A API NAO
// pode cair se o Redis estiver ausente — por isso toda a inicializacao e
// envolta em try/catch e degrada para modo "desabilitado".
// ============================================================
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker, Job, QueueOptions, WorkerOptions } from 'bullmq';
import IORedis, { Redis } from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';
import { RegrasService } from './motor/regras.service';

// Nome unico da fila do motor.
const NOME_FILA = 'automacao';

// Estrutura do job enfileirado (payload generico na Fase 0).
export interface AutomacaoJob {
  evento: string; // ex.: 'contrato.assinado', 'fatura.paga'
  payload: Record<string, unknown>;
  ruleId?: string; // regra associada, quando houver
}

@Injectable()
export class EngineService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EngineService.name);

  private connection?: Redis;
  private queue?: Queue<AutomacaoJob>;
  private worker?: Worker<AutomacaoJob>;

  // Quando false, o motor opera em modo degradado (Redis indisponivel).
  private habilitado = false;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly regras: RegrasService,
  ) {}

  // ----------------------------------------------------------
  // Ciclo de vida
  // ----------------------------------------------------------
  async onModuleInit(): Promise<void> {
    const redisUrl = this.config.get<string>('REDIS_URL');
    if (!redisUrl) {
      this.logger.warn(
        'REDIS_URL nao configurada — motor de automacao DESABILITADO (modo degradado).',
      );
      return;
    }

    try {
      // maxRetriesPerRequest: null e requisito do BullMQ para a conexao.
      // lazyConnect evita lancar erro sincrono no construtor.
      this.connection = new IORedis(redisUrl, {
        maxRetriesPerRequest: null,
        lazyConnect: true,
      });

      // Loga falhas de conexao sem derrubar o processo.
      this.connection.on('error', (err) => {
        this.logger.error(`Erro de conexao com o Redis: ${err.message}`);
      });

      await this.connection.connect();

      // 'as any' contorna o conflito de tipos entre o ioredis do topo e o
      // embutido no bullmq (mesma lib, versoes duplicadas no monorepo).
      const queueOptions: QueueOptions = { connection: this.connection as any };
      this.queue = new Queue<AutomacaoJob>(NOME_FILA, queueOptions);

      // Worker stub: na Fase 0 apenas registra a execucao. A execucao real
      // dos steps da regra (condicao -> acao -> acao) entra na Fase 1.
      const workerOptions: WorkerOptions = { connection: this.connection as any };
      this.worker = new Worker<AutomacaoJob>(
        NOME_FILA,
        async (job) => this.processarJob(job),
        workerOptions,
      );

      this.worker.on('failed', (job, err) => {
        this.logger.error(`Job ${job?.id} falhou: ${err.message}`);
      });

      this.habilitado = true;
      this.logger.log('Motor de automacao inicializado (fila + worker prontos).');
    } catch (err) {
      // Tolerar Redis ausente: a API continua de pe, sem motor.
      this.habilitado = false;
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Falha ao iniciar o motor de automacao (Redis indisponivel?): ${msg}. ` +
          'API segue ativa em modo degradado.',
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.worker?.close();
      await this.queue?.close();
      this.connection?.disconnect();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Erro ao encerrar o motor de automacao: ${msg}`);
    }
  }

  // ----------------------------------------------------------
  // API publica do motor (stubs da Fase 0)
  // ----------------------------------------------------------

  /**
   * Registra/atualiza uma regra de automacao.
   * STUB Fase 0: apenas persiste a estrutura da regra. O dispatcher que casa
   * eventos com regras ativas sera implementado na Fase 1 (doc 03).
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
      // Campos Json do schema; cast para o tipo aceito pelo Prisma.
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

  /**
   * Dispara um evento de dominio: enfileira um job na fila "automacao".
   * STUB Fase 0: enfileira sem casar com regras nem rodar acoes — isso vem
   * na Fase 1. Se o Redis estiver indisponivel, apenas loga e ignora (a
   * regra de negocio nao deve quebrar por causa do motor).
   */
  async dispatch(evento: string, payload: Record<string, unknown>, ruleId?: string): Promise<void> {
    // Sem Redis: roda o dispatcher de regras inline (sincrono). A automacao nao
    // pode sumir so porque a fila caiu — perde-se retry/async, nao a logica.
    if (!this.habilitado || !this.queue) {
      this.logger.debug(`dispatch("${evento}") em modo inline (sem fila).`);
      await this.regras.executarEvento(evento, payload);
      return;
    }

    // Com Redis: enfileira; o worker chama o dispatcher (com retry/backoff).
    try {
      await this.queue.add(evento, { evento, payload, ruleId }, {
        // Retry exponencial — base da confiabilidade exigida no doc 03.
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: 1000,
        removeOnFail: false, // mantem falhas para inspecao (dead-letter)
      });
      this.logger.debug(`Evento enfileirado: ${evento}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Falha ao enfileirar "${evento}": ${msg}. Tentando inline.`);
      await this.regras.executarEvento(evento, payload).catch(() => undefined);
    }
  }

  // Indica se o motor esta operacional (util para health/diagnostico).
  estaHabilitado(): boolean {
    return this.habilitado;
  }

  // ----------------------------------------------------------
  // Worker (processamento) — STUB Fase 0
  // ----------------------------------------------------------
  private async processarJob(job: Job<AutomacaoJob>): Promise<void> {
    const { evento, payload } = job.data;
    this.logger.log(`Processando job ${job.id} — evento "${evento}".`);
    // Delega ao dispatcher: casa o evento com as regras ativas, roda as acoes e
    // grava um JobExecution por regra disparada. Se lancar, o BullMQ aplica o retry.
    await this.regras.executarEvento(evento, payload);
  }
}
