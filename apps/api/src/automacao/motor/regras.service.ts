// Dispatcher do motor: casa um evento de dominio com as regras ativas, avalia
// as condicoes e executa as acoes. Cada regra que dispara gera um JobExecution
// (observabilidade real — substitui o stub da Fase 0 e a tela de execucoes do n8n).
import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AcoesService } from './acoes.service';
import { Acao, Condicao, ContextoExecucao, ResultadoAcao, Trigger } from './tipos';

@Injectable()
export class RegrasService implements OnModuleInit {
  private readonly logger = new Logger(RegrasService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly acoes: AcoesService,
  ) {}

  // Na subida, garante que as regras de fabrica existem (idempotente por nome).
  async onModuleInit(): Promise<void> {
    await this.seedPadrao();
  }

  /**
   * Ponto de entrada do dispatcher. Busca regras ativas cujo trigger casa com o
   * evento, filtra pelas condicoes e executa as acoes de cada uma.
   */
  async executarEvento(evento: string, payload: Record<string, unknown>): Promise<void> {
    const ativas = await this.prisma.automacaoRule.findMany({ where: { ativa: true } });
    const candidatas = ativas.filter((r) =>
      this.triggerCasa(r.trigger as unknown as Trigger | null, evento),
    );
    if (candidatas.length === 0) {
      this.logger.debug(`Evento "${evento}": nenhuma regra ativa casou.`);
      return;
    }

    const ctx: ContextoExecucao = { evento, payload };
    for (const regra of candidatas) {
      const condicoes = (regra.condicoes as unknown as Condicao[] | null) ?? [];
      if (!this.condicoesPassam(condicoes, payload)) {
        this.logger.debug(`Regra "${regra.nome}": condicoes nao satisfeitas, pulando.`);
        continue;
      }
      await this.executarRegra(regra.id, regra.nome, (regra.acoes as unknown as Acao[]) ?? [], ctx);
    }
  }

  private async executarRegra(
    ruleId: string,
    nome: string,
    acoes: Acao[],
    ctx: ContextoExecucao,
  ): Promise<void> {
    const resultados: ResultadoAcao[] = [];
    for (const acao of acoes) {
      resultados.push(await this.acoes.executar(acao, ctx));
    }
    const comErro = resultados.filter((r) => !r.ok);
    await this.prisma.jobExecution.create({
      data: {
        ruleId,
        status: comErro.length ? 'ERRO' : 'SUCESSO',
        payload: ctx.payload as object,
        resultado: { evento: ctx.evento, acoes: resultados } as object,
        erro: comErro.length ? comErro.map((r) => r.erro).join('; ') : null,
      },
    });
    this.logger.log(
      `Regra "${nome}": ${resultados.length} acao(oes)${comErro.length ? `, ${comErro.length} com erro` : ' OK'}.`,
    );
  }

  // ----------------------------------------------------------
  // Matching + avaliacao de condicoes
  // ----------------------------------------------------------
  private triggerCasa(trigger: Trigger | null, evento: string): boolean {
    return !!trigger && trigger.evento === evento;
  }

  private condicoesPassam(condicoes: Condicao[], payload: Record<string, unknown>): boolean {
    return condicoes.every((c) => this.avaliar(c, payload));
  }

  private avaliar(c: Condicao, payload: Record<string, unknown>): boolean {
    const atual = payload[c.campo];
    switch (c.op) {
      case 'eq':
        return atual === c.valor;
      case 'neq':
        return atual !== c.valor;
      case 'gt':
        return Number(atual) > Number(c.valor);
      case 'gte':
        return Number(atual) >= Number(c.valor);
      case 'lt':
        return Number(atual) < Number(c.valor);
      case 'lte':
        return Number(atual) <= Number(c.valor);
      case 'in':
        return Array.isArray(c.valor) && (c.valor as unknown[]).includes(atual);
      case 'existe':
        return atual !== undefined && atual !== null;
      default:
        return false;
    }
  }

  // ----------------------------------------------------------
  // Painel (listar/alternar) + seed de fabrica
  // ----------------------------------------------------------
  listar() {
    return this.prisma.automacaoRule.findMany({ orderBy: { criadoEm: 'desc' } });
  }

  async alternarAtiva(id: string): Promise<{ id: string; ativa: boolean }> {
    const regra = await this.prisma.automacaoRule.findUnique({ where: { id } });
    if (!regra) throw new NotFoundException('Regra nao encontrada');
    const atualizada = await this.prisma.automacaoRule.update({
      where: { id },
      data: { ativa: !regra.ativa },
    });
    return { id: atualizada.id, ativa: atualizada.ativa };
  }

  // Regras que ja nascem com o sistema. Idempotente: nao recria se o nome existir.
  private async seedPadrao(): Promise<void> {
    await this.garantirRegra({
      nome: 'Renovacao automatica 45 dias',
      trigger: { evento: 'contrato.renovacao_proxima' },
      condicoes: [],
      acoes: [
        { tipo: 'atualizar_contrato', params: { data: { status: 'RENOVACAO' } } },
        {
          tipo: 'notificar_cargo',
          params: {
            cargo: 'CS',
            titulo: 'Renovacao em 45 dias',
            mensagem:
              'Contrato {{codigoUnico}} de {{clienteNome}} vence em {{vencimento}} ({{diasRestantes}} dias). Iniciar renovacao.',
            tipo: 'ALERTA',
            link: '/contratos',
          },
        },
      ],
    });

    await this.garantirRegra({
      nome: 'Ativacao do cliente: squad + grupo',
      trigger: { evento: 'cliente.ativado' },
      condicoes: [],
      acoes: [
        { tipo: 'atribuir_squad' },
        { tipo: 'criar_grupo_whatsapp', params: { nome: 'Breakr x {{clienteNome}}' } },
        { tipo: 'notificar_cs_onboarding' },
      ],
    });

    // Equivale ao n8n "[Site Breakr] Leads do Site":
    //   notifica equipe COMERCIAL sempre que um lead chega pelo site.
    await this.garantirRegra({
      nome: 'Notificacao de lead do site',
      trigger: { evento: 'lead.site_capturado' },
      condicoes: [],
      acoes: [
        {
          tipo: 'notificar_cargo',
          params: {
            cargo: 'COMERCIAL',
            titulo: 'Novo lead do site',
            mensagem:
              'Lead {{nome}} ({{empresa}}) entrou pelo site. Telefone: {{telefone}}. Contato: {{email}}.',
            tipo: 'INFO',
            link: '/comercial',
          },
        },
      ],
    });

    // Equivale ao n8n "[ClickUp] Envio de Criativos para Aprovação em Grupos":
    //   quando uma peca vai para APROVACAO_CLIENTE, manda para o grupo WA do cliente.
    await this.garantirRegra({
      nome: 'Envio de criativo para aprovacao em grupo',
      trigger: { evento: 'conteudo.status_alterado' },
      condicoes: [{ campo: 'status', op: 'eq', valor: 'APROVACAO_CLIENTE' }],
      acoes: [{ tipo: 'enviar_criativo_whatsapp' }],
    });

    // Lead interno capturado → notifica equipe comercial (complementa o lead.site_capturado,
    // que notifica somente leads do site; este notifica leads cadastrados manualmente).
    await this.garantirRegra({
      nome: 'Notificacao de lead interno capturado',
      trigger: { evento: 'lead.capturado' },
      condicoes: [],
      acoes: [
        {
          tipo: 'notificar_cargo',
          params: {
            cargo: 'COMERCIAL',
            titulo: 'Novo lead capturado',
            mensagem:
              'Lead {{nome}} ({{empresa}}) entrou via {{origem}}. Telefone: {{telefone}}.',
            tipo: 'INFO',
            link: '/comercial',
          },
        },
      ],
    });

    // Lead ganho → notifica CS para assumir o cliente.
    // Equivale ao n8n "[Pipedrive] Lead ganho → transição de responsável".
    await this.garantirRegra({
      nome: 'Notificacao de lead ganho para CS',
      trigger: { evento: 'lead.ganho' },
      condicoes: [],
      acoes: [
        {
          tipo: 'notificar_cargo',
          params: {
            cargo: 'CS',
            titulo: 'Lead ganho — novo cliente!',
            mensagem:
              'O lead {{nome}} ({{empresa}}) foi convertido. Iniciar onboarding e apresentação.',
            tipo: 'SUCESSO',
            link: '/clientes',
          },
        },
      ],
    });

    // Contrato criado → alerta financeiro para revisar antes de enviar.
    await this.garantirRegra({
      nome: 'Revisao interna de contrato criado',
      trigger: { evento: 'contrato.criado' },
      condicoes: [],
      acoes: [
        {
          tipo: 'notificar_cargo',
          params: {
            cargo: 'FINANCEIRO',
            titulo: 'Novo contrato para revisao',
            mensagem:
              'Contrato {{codigoUnico}} de {{clienteNome}} criado. Revise e envie para assinatura.',
            tipo: 'ALERTA',
            link: '/contratos',
          },
        },
      ],
    });

    // Novo contrato criado → financeiro/jurídico prioriza (notificação em tempo real).
    await this.garantirRegra({
      nome: 'Novo contrato para revisar',
      trigger: { evento: 'contrato.criado' },
      condicoes: [],
      acoes: [
        {
          tipo: 'notificar_cargo',
          params: {
            cargo: 'FINANCEIRO',
            titulo: 'Novo contrato para fazer',
            mensagem: 'Novo contrato criado — priorize a revisão e liberação para assinatura.',
            tipo: 'ALERTA',
            link: '/contratos',
          },
        },
      ],
    });

    // Contrato assinado → financeiro deve ativar cobrança no Asaas.
    await this.garantirRegra({
      nome: 'Ativar cobranca apos assinatura',
      trigger: { evento: 'contrato.assinado' },
      condicoes: [],
      acoes: [
        {
          tipo: 'notificar_cargo',
          params: {
            cargo: 'FINANCEIRO',
            titulo: 'Contrato assinado — ativar cobranca',
            mensagem:
              'Contrato {{codigoUnico}} assinado por {{clienteNome}}. Configure a assinatura no Asaas.',
            tipo: 'SUCESSO',
            link: '/contratos',
          },
        },
      ],
    });

    // Contrato em vigor → CS assume o acompanhamento.
    await this.garantirRegra({
      nome: 'CS assume cliente com contrato em vigor',
      trigger: { evento: 'contrato.em_vigor' },
      condicoes: [],
      acoes: [
        {
          tipo: 'notificar_cargo',
          params: {
            cargo: 'CS',
            titulo: 'Contrato em vigor — acompanhar cliente',
            mensagem:
              'Contrato {{codigoUnico}} de {{clienteNome}} entrou em vigor em {{inicioVigencia}}.',
            tipo: 'INFO',
            link: '/clientes',
          },
        },
      ],
    });

    // Fatura gerada → notifica financeiro para acompanhar pagamento.
    // Equivale ao n8n "[Lembrancas ASAAS] Lembrancas de Cobrancas ASAAS".
    await this.garantirRegra({
      nome: 'Lembrete interno de fatura gerada',
      trigger: { evento: 'fatura.gerada' },
      condicoes: [],
      acoes: [
        {
          tipo: 'notificar_cargo',
          params: {
            cargo: 'FINANCEIRO',
            titulo: 'Fatura gerada',
            mensagem:
              'Fatura {{codigoUnico}} de R$ {{valor}} para {{clienteNome}} vence em {{vencimento}}.',
            tipo: 'INFO',
            link: '/financeiro',
          },
        },
      ],
    });

    // Campanha criada → notifica gestor de tráfego para configurar no Meta Ads.
    await this.garantirRegra({
      nome: 'Gestor de trafego notificado de nova campanha',
      trigger: { evento: 'campanha.criada' },
      condicoes: [],
      acoes: [
        {
          tipo: 'notificar_cargo',
          params: {
            cargo: 'GESTOR_TRAFEGO',
            titulo: 'Nova campanha criada',
            mensagem:
              'Campanha "{{nome}}" para {{clienteNome}} criada. Configure e ative no painel de tráfego.',
            tipo: 'INFO',
            link: '/trafego',
          },
        },
      ],
    });

    // Fatura prestes a vencer → envia lembrete no grupo WhatsApp do cliente.
    // Equivale ao n8n "[Lembrancas ASAAS] Lembrancas de Cobrancas ASAAS".
    await this.garantirRegra({
      nome: 'Lembrete de vencimento de fatura no WhatsApp',
      trigger: { evento: 'fatura.lembrete_vencimento' },
      condicoes: [],
      acoes: [{ tipo: 'enviar_lembrete_pagamento', params: {} }],
    });

    // Conteudo aprovado → notifica producao para publicar.
    await this.garantirRegra({
      nome: 'Publicacao apos aprovacao de conteudo',
      trigger: { evento: 'conteudo.status_alterado' },
      condicoes: [{ campo: 'status', op: 'eq', valor: 'APROVADO' }],
      acoes: [
        {
          tipo: 'notificar_cargo',
          params: {
            cargo: 'PRODUCAO',
            titulo: 'Conteudo aprovado — publicar',
            mensagem:
              'A peca "{{titulo}}" ({{codigoUnico}}) foi aprovada. Agendar publicacao conforme calendario.',
            tipo: 'SUCESSO',
            link: '/conteudo',
          },
        },
      ],
    });
  }

  private async garantirRegra(def: {
    nome: string;
    trigger: Trigger;
    condicoes: Condicao[];
    acoes: Acao[];
  }): Promise<void> {
    const existe = await this.prisma.automacaoRule.findFirst({ where: { nome: def.nome } });
    if (existe) return;
    await this.prisma.automacaoRule.create({
      data: {
        nome: def.nome,
        ativa: true,
        trigger: def.trigger as object,
        condicoes: def.condicoes as object,
        acoes: def.acoes as object,
      },
    });
    this.logger.log(`Regra de fabrica criada: ${def.nome}`);
  }
}
