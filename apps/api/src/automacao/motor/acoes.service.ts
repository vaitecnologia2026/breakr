// Catalogo de acoes internas do motor. Cada acao e um handler registrado por
// um `tipo` string; uma regra lista as acoes que executa. Extensivel: registrar
// uma acao nova = adicionar uma entrada no catalogo (sem mexer no dispatcher).
import { Inject, Injectable, Logger } from '@nestjs/common';
import { FuncaoSquad } from '@prisma/client';
import { Cargo } from '@breakr/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { dataIsoSaoPaulo } from '../../common/data.util';
import { NotificacoesService } from '../../notificacoes/notificacoes.service';
import { SquadsService } from '../../squads/squads.service';
import {
  ASAAS_PORT, AsaasPort,
  AUTENTIQUE_PORT, AutentiquePort,
  GOOGLE_MEET_PORT, GoogleMeetPort,
  WHATSAPP_PORT, WhatsappPort,
} from '../../integracoes';
import { Acao, ContextoExecucao, ResultadoAcao } from './tipos';

type Handler = (
  params: Record<string, unknown>,
  ctx: ContextoExecucao,
) => Promise<unknown>;

@Injectable()
export class AcoesService {
  private readonly logger = new Logger(AcoesService.name);
  private readonly catalogo = new Map<string, Handler>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificacoes: NotificacoesService,
    private readonly squads: SquadsService,
    @Inject(WHATSAPP_PORT) private readonly whatsapp: WhatsappPort,
    @Inject(ASAAS_PORT) private readonly asaas: AsaasPort,
    @Inject(AUTENTIQUE_PORT) private readonly autentique: AutentiquePort,
    @Inject(GOOGLE_MEET_PORT) private readonly googleMeet: GoogleMeetPort,
  ) {
    this.registrarPadrao();
  }

  /** Tipos de acao disponiveis — o front usa para montar regras. */
  tiposDisponiveis(): string[] {
    return Array.from(this.catalogo.keys());
  }

  /**
   * Executa uma acao. Um erro vira ResultadoAcao.ok=false (nao derruba a regra
   * inteira aqui — o dispatcher decide o status final da execucao).
   */
  async executar(acao: Acao, ctx: ContextoExecucao): Promise<ResultadoAcao> {
    const handler = this.catalogo.get(acao.tipo);
    if (!handler) {
      return { tipo: acao.tipo, ok: false, erro: `Acao desconhecida: ${acao.tipo}` };
    }
    try {
      const detalhe = await handler(acao.params ?? {}, ctx);
      return { tipo: acao.tipo, ok: true, detalhe };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Acao "${acao.tipo}" falhou: ${msg}`);
      return { tipo: acao.tipo, ok: false, erro: msg };
    }
  }

  // ----------------------------------------------------------
  // Catalogo padrao (internas). Integracoes externas entram aqui depois
  // (ex.: 'enviar_whatsapp', 'emitir_nota') reusando os adapters/ports.
  // ----------------------------------------------------------
  private registrarPadrao(): void {
    // log: apenas registra uma mensagem (util p/ depurar/auditar regras).
    this.catalogo.set('log', async (params, ctx) => {
      const mensagem = this.interpolar(String(params.mensagem ?? ''), ctx.payload);
      this.logger.log(`[regra:log] ${mensagem}`);
      return { mensagem };
    });

    // notificar_cargo: pop-up/realtime para todos os usuarios de um cargo.
    this.catalogo.set('notificar_cargo', async (params, ctx) => {
      const cargo = String(params.cargo) as Cargo;
      const r = await this.notificacoes.notificarPorCargo(cargo, {
        titulo: this.interpolar(String(params.titulo ?? 'Aviso'), ctx.payload),
        mensagem: this.interpolar(String(params.mensagem ?? ''), ctx.payload),
        tipo: params.tipo ? String(params.tipo) : 'INFO',
        link: params.link ? this.interpolar(String(params.link), ctx.payload) : undefined,
      });
      return { cargo, enviadas: r.enviadas };
    });

    // atualizar_contrato: aplica `data` ao contrato do payload (ex.: mudar status).
    this.catalogo.set('atualizar_contrato', async (params, ctx) => {
      const contratoId = String(ctx.payload.contratoId ?? '');
      if (!contratoId) throw new Error('payload.contratoId ausente');
      const data = (params.data ?? {}) as Record<string, unknown>;
      // Whitelist: a regra (JSON) so pode alterar campos seguros. Sem isso, quem
      // edita regras poderia escrever colunas arbitrarias (valorMensal, clienteId).
      const CAMPOS_PERMITIDOS = ['status'];
      const dados: Record<string, unknown> = {};
      for (const campo of CAMPOS_PERMITIDOS) {
        if (data[campo] !== undefined) dados[campo] = data[campo];
      }
      const ignorados = Object.keys(data).filter((k) => !CAMPOS_PERMITIDOS.includes(k));
      if (ignorados.length) {
        this.logger.warn(
          `atualizar_contrato: campos nao permitidos ignorados: ${ignorados.join(', ')}`,
        );
      }
      const atualizado = await this.prisma.contrato.update({
        where: { id: contratoId },
        data: dados as never,
      });
      return { contratoId, status: atualizado.status };
    });

    // atribuir_squad: aloca o cliente do payload no squad ativo menos carregado.
    this.catalogo.set('atribuir_squad', async (_params, ctx) => {
      const clienteId = String(ctx.payload.clienteId ?? '');
      if (!clienteId) throw new Error('payload.clienteId ausente');
      const r = await this.squads.atribuirAutomatico(clienteId);
      return r ?? { atribuido: false, motivo: 'nenhum squad ativo' };
    });

    // enviar_criativo_whatsapp: envia a peca para o grupo WA do cliente quando vai
    // para APROVACAO_CLIENTE. Equivale ao n8n "[ClickUp] Envio de Criativos para
    // Aprovação em Grupos". Requer payload.conteudoId e cliente.whatsappGrupoId.
    this.catalogo.set('enviar_criativo_whatsapp', async (_params, ctx) => {
      const conteudoId = String(ctx.payload.conteudoId ?? '');
      if (!conteudoId) throw new Error('payload.conteudoId ausente');
      const conteudo = await this.prisma.conteudo.findUnique({
        where: { id: conteudoId },
        include: { cliente: { select: { nomeFantasia: true, whatsappGrupoId: true } } },
      });
      if (!conteudo) throw new Error('Conteudo nao encontrado');
      const grupoId = conteudo.cliente.whatsappGrupoId;
      if (!grupoId) {
        this.logger.warn(`Cliente sem grupo WhatsApp; criativo ${conteudoId} nao enviado.`);
        return { enviado: false, motivo: 'cliente sem grupo WhatsApp' };
      }
      const texto =
        `Peca aguardando aprovacao\n\n` +
        `Cliente: ${conteudo.cliente.nomeFantasia}\n` +
        `Titulo: ${conteudo.titulo}\n` +
        `Tipo: ${conteudo.tipo}\n` +
        `Codigo: ${conteudo.codigoUnico}\n\n` +
        `Acesse o portal Breakr para aprovar ou solicitar ajustes.`;
      const r = await this.whatsapp.enviarMensagem({ destino: grupoId, texto });
      return { enviado: true, waMessageId: r.id };
    });

    // enviar_copy_whatsapp: envia texto de copy (aprovado ou rascunho) para o grupo
    // do cliente. Equivale ao n8n "[Aprovacao Copy] Envio de Copy para Grupos".
    this.catalogo.set('enviar_copy_whatsapp', async (params, ctx) => {
      const conteudoId = String(ctx.payload.conteudoId ?? params.conteudoId ?? '');
      const destino = String(ctx.payload.grupoId ?? params.destino ?? '');
      if (!destino) throw new Error('payload.grupoId ou params.destino ausente');
      const texto = conteudoId
        ? await this.prisma.conteudo
            .findUnique({ where: { id: conteudoId }, select: { titulo: true, codigoUnico: true } })
            .then(
              (c) =>
                c ? `Copy para aprovacao:\n\n${c.titulo}\n\nCodigo: ${c.codigoUnico}` : 'Copy sem titulo',
            )
        : this.interpolar(String(params.mensagem ?? ''), ctx.payload);
      const r = await this.whatsapp.enviarMensagem({ destino, texto });
      return { enviado: true, waMessageId: r.id };
    });

    // enviar_boas_vindas_whatsapp: mensagem de boas-vindas no grupo do cliente.
    // Equivale ao trecho do n8n "Liberar Onboarding" que envia link do grupo ao socio.
    this.catalogo.set('enviar_boas_vindas_whatsapp', async (params, ctx) => {
      const clienteId = String(ctx.payload.clienteId ?? '');
      if (!clienteId) throw new Error('payload.clienteId ausente');
      const cliente = await this.prisma.cliente.findUnique({
        where: { id: clienteId },
        select: { nomeFantasia: true, whatsappGrupoId: true },
      });
      if (!cliente?.whatsappGrupoId) {
        return { enviado: false, motivo: 'cliente sem grupo WhatsApp cadastrado' };
      }
      const mensagem = this.interpolar(
        String(
          params.mensagem ??
            'Olá, {{clienteNome}}! Seja bem-vindo(a) à Breakr! Estamos prontos para começar. Qualquer dúvida, fale aqui no grupo.',
        ),
        { ...ctx.payload, clienteNome: cliente.nomeFantasia },
      );
      const r = await this.whatsapp.enviarMensagem({
        destino: cliente.whatsappGrupoId,
        texto: mensagem,
      });
      return { enviado: true, waMessageId: r.id };
    });

    // enviar_lembrete_pagamento: envia lembrete de fatura vencendo para o grupo do cliente.
    // Equivale ao n8n "[Lembrancas ASAAS] Lembrancas de Cobrancas ASAAS".
    this.catalogo.set('enviar_lembrete_pagamento', async (params, ctx) => {
      const faturaId = String(ctx.payload.faturaId ?? '');
      if (!faturaId) throw new Error('payload.faturaId ausente');
      const fatura = await this.prisma.fatura.findUnique({
        where: { id: faturaId },
        include: { cliente: { select: { nomeFantasia: true, whatsappGrupoId: true } } },
      });
      if (!fatura) throw new Error('Fatura nao encontrada');
      if (!fatura.cliente.whatsappGrupoId) {
        return { enviado: false, motivo: 'cliente sem grupo WhatsApp' };
      }
      const dias = params.diasAntes ? Number(params.diasAntes) : 3;
      const mensagem =
        `Olá! Lembramos que sua fatura da Breakr (R$ ${Number(fatura.valor).toFixed(2)}) ` +
        `vence em ${dias} dia(s). Código: ${fatura.codigoUnico}. Confira seu e-mail para o link de pagamento.`;
      const r = await this.whatsapp.enviarMensagem({
        destino: fatura.cliente.whatsappGrupoId,
        texto: mensagem,
      });
      return { enviado: true, waMessageId: r.id };
    });

    // formatar_nome_conteudo: normaliza o codigoUnico de um conteudo conforme a
    // nomenclatura padrao Breakr. Equivale ao n8n "[Nomenclatura] Campanhas".
    this.catalogo.set('formatar_nome_conteudo', async (_params, ctx) => {
      const conteudoId = String(ctx.payload.conteudoId ?? '');
      if (!conteudoId) throw new Error('payload.conteudoId ausente');
      const c = await this.prisma.conteudo.findUnique({
        where: { id: conteudoId },
        include: { cliente: { select: { nomeFantasia: true } } },
      });
      if (!c) throw new Error('Conteudo nao encontrado');
      const sigla = c.cliente.nomeFantasia.slice(0, 3).toUpperCase();
      const mes = new Date().toISOString().slice(0, 7).replace('-', '');
      const novoNome = `${sigla}-${c.tipo}-${mes}-${c.codigoUnico}`;
      await this.prisma.conteudo.update({ where: { id: conteudoId }, data: { codigoUnico: novoNome } });
      return { codigoAnterior: c.codigoUnico, codigoNovo: novoNome };
    });

    // criar_cobranca_asaas: gera boleto/PIX no Asaas e persiste o id externo na Fatura.
    // Requer payload.faturaId + params.asaasClienteId (id do cliente no Asaas).
    // Params opcionais: formaPagamento (BOLETO|PIX|CREDIT_CARD), diasVencimento (padrão 5).
    // Nota: asaasClienteId é cadastrado manualmente no Asaas e informado na configuração da regra.
    this.catalogo.set('criar_cobranca_asaas', async (params, ctx) => {
      const faturaId = String(ctx.payload.faturaId ?? '');
      if (!faturaId) throw new Error('payload.faturaId ausente');
      const asaasClienteId = String(params.asaasClienteId ?? ctx.payload.asaasClienteId ?? '');
      if (!asaasClienteId) throw new Error('params.asaasClienteId ausente — informe o id do cliente no Asaas na configuracao da regra');

      const fatura = await this.prisma.fatura.findUnique({ where: { id: faturaId } });
      if (!fatura) throw new Error('Fatura nao encontrada');
      if (fatura.asaasId) {
        return { jaExistia: true, asaasId: fatura.asaasId };
      }

      const dias = params.diasVencimento ? Number(params.diasVencimento) : 5;
      const vencimento = new Date();
      vencimento.setDate(vencimento.getDate() + dias);

      const forma = (params.formaPagamento as 'BOLETO' | 'PIX' | 'CREDIT_CARD') ?? 'BOLETO';
      const cobranca = await this.asaas.criarCobranca({
        clienteId: asaasClienteId,
        valor: Number(fatura.valor),
        vencimento: dataIsoSaoPaulo(vencimento),
        descricao: `Fatura Breakr ${fatura.codigoUnico}`,
        formaPagamento: forma,
      });

      await this.prisma.fatura.update({
        where: { id: faturaId },
        data: { asaasId: cobranca.id, meio: forma },
      });

      return {
        asaasId: cobranca.id,
        linkBoleto: cobranca.linkBoleto,
        pixCopiaECola: cobranca.pixCopiaECola,
        vencimento: cobranca.vencimento,
      };
    });

    // enviar_contrato_autentique: envia o PDF do contrato para assinatura eletrônica.
    // Persiste autentiqueId + muda status para AGUARDANDO_ASSINATURA.
    // Requer payload.contratoId. O contrato deve ter docUrl preenchida.
    this.catalogo.set('enviar_contrato_autentique', async (params, ctx) => {
      const contratoId = String(ctx.payload.contratoId ?? '');
      if (!contratoId) throw new Error('payload.contratoId ausente');
      const contrato = await this.prisma.contrato.findUnique({
        where: { id: contratoId },
        include: { cliente: { select: { nomeFantasia: true } } },
      });
      if (!contrato) throw new Error('Contrato nao encontrado');
      if (!contrato.docUrl) throw new Error('Contrato sem docUrl — faça upload do PDF primeiro');
      if (contrato.autentiqueId) {
        return { jaEnviado: true, autentiqueId: contrato.autentiqueId };
      }

      // email do signatário vem de params (configurável na regra) ou do payload.
      // Cliente não tem campo email no schema — deve ser passado na configuração da regra.
      const emailCliente = String(params.emailCliente ?? ctx.payload.emailCliente ?? '');
      const nomeCliente = String(params.nomeCliente ?? contrato.cliente.nomeFantasia);
      const signatarios = emailCliente
        ? [{ nome: nomeCliente, email: emailCliente }]
        : [];

      if (signatarios.length === 0) throw new Error('params.emailCliente ausente — informe o e-mail do signatário na configuração da regra');

      const doc = await this.autentique.enviarParaAssinatura({
        nomeDocumento: `Contrato Breakr — ${contrato.cliente.nomeFantasia} (${contrato.codigoUnico})`,
        pdfUrl: contrato.docUrl,
        signatarios,
      });

      await this.prisma.contrato.update({
        where: { id: contratoId },
        data: { autentiqueId: doc.id, status: 'AGUARDANDO_ASSINATURA' },
      });

      return { autentiqueId: doc.id, linkAssinatura: doc.linkAssinatura, status: doc.status };
    });

    // criar_meet_comercial: cria reunião Google Meet para o lead e salva link na observacao.
    // Params: titulo (opcional), duracaoMinutos (padrão 60), inicio (ISO datetime, padrão +1 dia 10h).
    // Requer payload.leadId.
    this.catalogo.set('criar_meet_comercial', async (params, ctx) => {
      const leadId = String(ctx.payload.leadId ?? '');
      if (!leadId) throw new Error('payload.leadId ausente');
      const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
      if (!lead) throw new Error('Lead nao encontrado');

      const inicio = String(params.inicio ?? (() => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        d.setHours(10, 0, 0, 0);
        return d.toISOString();
      })());

      const titulo = this.interpolar(
        String(params.titulo ?? 'Demo Breakr — {{leadNome}}'),
        { ...ctx.payload, leadNome: lead.nome },
      );
      const convidados = lead.email ? [lead.email] : [];

      const result = await this.googleMeet.criarMeet({
        titulo,
        inicio,
        duracaoMinutos: params.duracaoMinutos ? Number(params.duracaoMinutos) : 60,
        convidados,
      });

      const obs = `[Meet] ${result.meetLink} | ${new Date(inicio).toLocaleString('pt-BR')}`;
      await this.prisma.lead.update({
        where: { id: leadId },
        data: { observacao: lead.observacao ? `${lead.observacao}\n${obs}` : obs },
      });

      return { meetLink: result.meetLink, eventoId: result.eventoId };
    });

    // analisar_meta_ads: aciona sugestao de IA sobre metricas de campanha.
    // Stub ate credencial Meta Ads; com IaService ativo gera sugestoes.
    this.catalogo.set('analisar_meta_ads', async (_params, ctx) => {
      const campanhaId = String(ctx.payload.campanhaId ?? '');
      if (!campanhaId) return { analisado: false, motivo: 'payload.campanhaId ausente' };
      const c = await this.prisma.campanha.findUnique({ where: { id: campanhaId } });
      if (!c) return { analisado: false, motivo: 'campanha nao encontrada' };
      this.logger.log(
        `[analisar_meta_ads] campanha ${c.codigoUnico}: ${c.impressoes} imp / ${c.cliques} cliques`,
      );
      return {
        analisado: true,
        resumo: `${c.impressoes} impressoes, ${c.cliques} cliques, ${c.conversoes} conversoes`,
      };
    });

    // criar_grupo_whatsapp: cria o grupo do cliente (stub) e guarda o id no cliente.
    this.catalogo.set('criar_grupo_whatsapp', async (params, ctx) => {
      const clienteId = String(ctx.payload.clienteId ?? '');
      if (!clienteId) throw new Error('payload.clienteId ausente');
      const cliente = await this.prisma.cliente.findUnique({ where: { id: clienteId } });
      if (!cliente) throw new Error('cliente nao encontrado');
      // Idempotente: ja tem grupo -> nao recria.
      if (cliente.whatsappGrupoId) {
        return { jaExistia: true, waGroupId: cliente.whatsappGrupoId };
      }
      const nome = this.interpolar(
        String(params.nome ?? 'Breakr x {{clienteNome}}'),
        ctx.payload,
      );
      // TODO: participantes reais (telefone do cliente + CS) quando houver.
      const grupo = await this.whatsapp.criarGrupo({ nome, participantes: [] });
      await this.prisma.cliente.update({
        where: { id: clienteId },
        data: { whatsappGrupoId: grupo.waGroupId },
      });
      return { waGroupId: grupo.waGroupId, nome: grupo.nome };
    });

    // notificar_cs_onboarding: avisa o CS do squad do cliente para iniciar o
    // onboarding com SLA de 3h (passo final da ativacao do cliente).
    this.catalogo.set('notificar_cs_onboarding', async (_params, ctx) => {
      const clienteId = String(ctx.payload.clienteId ?? '');
      if (!clienteId) throw new Error('payload.clienteId ausente');
      const cliente = await this.prisma.cliente.findUnique({
        where: { id: clienteId },
        select: { squadId: true, nomeFantasia: true },
      });
      if (!cliente?.squadId) return { notificado: false, motivo: 'cliente sem squad' };
      const cs = await this.prisma.squadMembro.findFirst({
        where: { squadId: cliente.squadId, funcao: FuncaoSquad.CS },
        select: { usuarioId: true },
      });
      if (!cs) return { notificado: false, motivo: 'squad sem CS' };
      await this.notificacoes.criar(cs.usuarioId, {
        titulo: 'Novo cliente — inicie o onboarding (SLA 3h)',
        mensagem: `${cliente.nomeFantasia} foi ativado. Inicie o onboarding em até 3 horas.`,
        tipo: 'ALERTA',
        link: '/onboarding',
      });
      return { notificado: true, csId: cs.usuarioId };
    });

    // registrar_rework_interno: registra rework INTERNO quando um designer/revisor
    // devolve uma peca para PRODUCAO apos revisao interna (nao pelo cliente).
    // Requer payload.conteudoId e payload.responsavelId (quem gerou o rework).
    // Params opcionais: comentario.
    this.catalogo.set('registrar_rework_interno', async (params, ctx) => {
      const conteudoId = String(ctx.payload.conteudoId ?? '');
      const responsavelId = String(ctx.payload.responsavelId ?? '');
      if (!conteudoId) throw new Error('payload.conteudoId ausente');

      const conteudo = await this.prisma.conteudo.findUnique({
        where: { id: conteudoId },
        select: { id: true, status: true },
      });
      if (!conteudo) throw new Error('Conteudo nao encontrado');

      await this.prisma.$transaction([
        this.prisma.reworkLog.create({
          data: {
            conteudoId,
            statusDe: conteudo.status,
            statusPara: 'PRODUCAO',
            origem: 'INTERNO',
            comentario: params.comentario ? String(params.comentario) : undefined,
          },
        }),
        this.prisma.conteudo.update({
          where: { id: conteudoId },
          data: {
            status: 'PRODUCAO',
            reworkCount: { increment: 1 },
          },
        }),
      ]);

      return { registrado: true, conteudoId };
    });
  }

  // Substitui {{campo}} (ou {{a.b}}) pelo valor no payload.
  private interpolar(texto: string, payload: Record<string, unknown>): string {
    return texto.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, caminho: string) => {
      const v = this.valorPorCaminho(payload, caminho);
      return v === undefined || v === null ? '' : String(v);
    });
  }

  private valorPorCaminho(obj: Record<string, unknown>, caminho: string): unknown {
    return caminho.split('.').reduce<unknown>((acc, parte) => {
      if (acc && typeof acc === 'object' && parte in (acc as Record<string, unknown>)) {
        return (acc as Record<string, unknown>)[parte];
      }
      return undefined;
    }, obj);
  }
}
