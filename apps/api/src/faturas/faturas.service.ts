// Servico de faturas/cobrancas (M13 — financeiro/BPO).
// Orquestra o trecho do pipeline de entrada que vai da 1a cobranca ate a
// liberacao do cliente: gera a cobranca (ASAAS) -> ao ser paga emite a NF
// (Speed), libera o onboarding e cria os projetos do plano, e dispara o motor.
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Fatura, Prisma, StatusFatura } from '@prisma/client';
import { Cargo } from '@breakr/shared';
import { PrismaService } from '../prisma/prisma.service';
import { CodigoUnicoService } from '../common/codigo-unico/codigo-unico.service';
import { dataIsoSaoPaulo } from '../common/data.util';
import {
  ASAAS_PORT,
  AsaasPort,
  SPEED_PORT,
  SpeedPort,
  WHATSAPP_PORT,
  WhatsappPort,
} from '../integracoes';
import { EngineService } from '../automacao/engine.service';
import { NotificacoesService } from '../notificacoes/notificacoes.service';
import { ProjetosService } from '../projetos/projetos.service';
import { OnboardingService } from '../onboarding/onboarding.service';

@Injectable()
export class FaturasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly codigoUnico: CodigoUnicoService,
    @Inject(ASAAS_PORT) private readonly asaas: AsaasPort,
    @Inject(SPEED_PORT) private readonly speed: SpeedPort,
    @Inject(WHATSAPP_PORT) private readonly whatsapp: WhatsappPort,
    private readonly engine: EngineService,
    private readonly projetos: ProjetosService,
    private readonly onboarding: OnboardingService,
    private readonly notificacoes: NotificacoesService,
  ) {}

  // Formata uma data como YYYY-MM-DD (formato esperado pelo ASAAS), no fuso de
  // Sao Paulo para nao adiantar o vencimento em 1 dia (ver data.util).
  private dataIso(d: Date): string {
    return dataIsoSaoPaulo(d);
  }

  // Gera a 1a cobranca (PIX) de um contrato no ASAAS e persiste a Fatura.
  async gerarCobranca(contratoId: string): Promise<Fatura> {
    const contrato = await this.prisma.contrato.findUnique({
      where: { id: contratoId },
      include: { cliente: true },
    });
    if (!contrato) {
      throw new NotFoundException('Contrato nao encontrado');
    }

    // Vencimento do contrato, ou +7 dias como fallback.
    const vencimento =
      contrato.vencimento ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Cria a cobranca no ASAAS (stub na Fase 1) — retorno e salvo no nosso banco.
    const cobranca = await this.asaas.criarCobranca({
      clienteId: contrato.cliente.id,
      valor: Number(contrato.valorMensal),
      vencimento: this.dataIso(vencimento),
      descricao: `Mensalidade ${contrato.cliente.nomeFantasia}`,
      formaPagamento: 'PIX',
    });

    const fatura = await this.prisma.fatura.create({
      data: {
        clienteId: contrato.clienteId,
        contratoId: contrato.id,
        valor: new Prisma.Decimal(contrato.valorMensal),
        vencimento,
        status: 'PENDENTE',
        asaasId: cobranca.id,
        meio: 'PIX',
        codigoUnico: this.codigoUnico.gerar('FAT'),
      },
    });

    // Notifica o motor e o time financeiro (pop-up em tempo real).
    await this.engine.dispatch('fatura.gerada', {
      faturaId: fatura.id,
      contratoId: contrato.id,
      clienteId: contrato.clienteId,
    });
    await this.notificacoes.notificarPorCargo(Cargo.FINANCEIRO, {
      titulo: 'Nova cobrança',
      mensagem: `Cobrança ${fatura.codigoUnico} de ${contrato.cliente.nomeFantasia} gerada (PIX).`,
      tipo: 'INFO',
      link: '/cobrancas',
    });

    return fatura;
  }

  // Confirma o pagamento de uma fatura e dispara a liberacao do cliente:
  // emite NF, cria onboarding + projetos do plano e notifica o financeiro.
  async marcarPaga(id: string): Promise<Fatura> {
    const fatura = await this.prisma.fatura.findUnique({
      where: { id },
      include: { cliente: { include: { plano: true } }, contrato: true },
    });
    if (!fatura) {
      throw new NotFoundException('Fatura nao encontrada');
    }

    // Idempotencia rapida: ja paga -> nada a reprocessar.
    if (fatura.status === StatusFatura.PAGA) {
      return fatura;
    }

    // Reivindica a fatura atomicamente: so a chamada que de fato troca o status
    // (count === 1) segue para o provisionamento. Isso evita que webhook ASAAS +
    // clique manual (ou retries concorrentes) emitam NF e criem onboarding/projetos
    // em duplicidade.
    const claim = await this.prisma.fatura.updateMany({
      where: { id, status: { not: StatusFatura.PAGA } },
      data: { status: StatusFatura.PAGA, pagaEm: new Date() },
    });
    if (claim.count === 0) {
      // Outra chamada concorrente ja reivindicou — devolve o estado atual.
      return this.obter(id);
    }

    try {
      // 1) Emite a NF (Speed) — idempotente: so emite se ainda nao houver nota.
      if (!fatura.notaFiscalId) {
        const nota = await this.speed.emitirNota({
          clienteId: fatura.cliente.id,
          valor: Number(fatura.valor),
          descricaoServico: `Serviços de marketing — ${fatura.cliente.plano?.nome ?? 'plano'}`,
        });
        await this.prisma.fatura.update({
          where: { id },
          data: { notaFiscalId: nota.id, notaFiscalUrl: nota.linkPdf },
        });
      }

      // 2) Libera o onboarding gamificado e cria os projetos do plano
      //    (onboarding.criar e criarProjetosDoPlano sao idempotentes).
      await this.onboarding.criar(fatura.cliente.id);
      await this.projetos.criarProjetosDoPlano(fatura.cliente.id);
    } catch (erro) {
      // Provisionamento falhou: devolve a fatura para reprocessamento futuro.
      // Sem isso, ela ficaria PAGA porem com o cliente nunca provisionado, e o
      // retry retornaria cedo na checagem de idempotencia. A NF eventualmente
      // ja emitida fica registrada e nao sera reemitida no proximo retry.
      await this.prisma.fatura.update({
        where: { id },
        data: { status: StatusFatura.PENDENTE, pagaEm: null },
      });
      throw erro;
    }

    // 3) Avisa o motor e o time financeiro — apenas apos provisionamento concluido.
    await this.engine.dispatch('fatura.paga', {
      faturaId: id,
      clienteId: fatura.cliente.id,
    });
    await this.notificacoes.notificarPorCargo(Cargo.FINANCEIRO, {
      titulo: 'Pagamento confirmado',
      mensagem: `Cobrança ${fatura.codigoUnico} paga — onboarding e projetos liberados.`,
      tipo: 'SUCESSO',
      link: '/cobrancas',
    });

    // 4) Cliente ativado: o motor reage (atribui o squad menos carregado e cria
    // o grupo no WhatsApp) via a regra "Ativacao do cliente".
    await this.engine.dispatch('cliente.ativado', {
      clienteId: fatura.cliente.id,
      codigoUnico: fatura.cliente.codigoUnico,
      clienteNome: fatura.cliente.nomeFantasia,
    });

    // Re-busca com relacoes para devolver o estado atualizado.
    return this.obter(id);
  }

  // Envia a cobranca ao cliente pelo WhatsApp (PIX em anexo).
  async enviarCobrancaWhatsapp(id: string): Promise<Fatura> {
    const fatura = await this.prisma.fatura.findUnique({
      where: { id },
      include: { cliente: true },
    });
    if (!fatura) {
      throw new NotFoundException('Fatura nao encontrada');
    }

    // TODO: telefone real do cliente (o Cliente ainda nao tem campo de telefone).
    await this.whatsapp.enviarMensagem({
      destino: '5599000000000',
      texto: `Olá! Sua cobrança ${fatura.codigoUnico} de R$ ${Number(fatura.valor).toFixed(2)} vence em ${this.dataIso(fatura.vencimento)}. PIX em anexo.`,
    });

    const atualizada = await this.prisma.fatura.update({
      where: { id },
      data: { enviadaWhatsapp: true },
    });

    await this.engine.dispatch('fatura.cobranca_enviada', { faturaId: id });

    return atualizada;
  }

  // Lista todas as faturas (mais recentes primeiro).
  listar(): Promise<Fatura[]> {
    return this.prisma.fatura.findMany({
      orderBy: { criadoEm: 'desc' },
      include: { cliente: { select: { nomeFantasia: true } } },
    });
  }

  // Lista as faturas de um cliente (mais recentes primeiro).
  listarPorCliente(clienteId: string): Promise<Fatura[]> {
    return this.prisma.fatura.findMany({
      where: { clienteId },
      orderBy: { criadoEm: 'desc' },
    });
  }

  // Detalhe de uma fatura (com cliente e contrato).
  async obter(id: string): Promise<Fatura> {
    const fatura = await this.prisma.fatura.findUnique({
      where: { id },
      include: { cliente: true, contrato: true },
    });
    if (!fatura) {
      throw new NotFoundException('Fatura nao encontrada');
    }
    return fatura;
  }
}
