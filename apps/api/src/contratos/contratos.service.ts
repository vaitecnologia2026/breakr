// Servico de contratos (M12) — porta de entrada do pipeline.
// Fluxo: cria (RASCUNHO) -> envia p/ assinatura (Autentique) -> assinado cai
// em EM_REVISAO (revisao da Franciela) -> EM_VIGOR dispara a 1a cobranca.
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Contrato, Prisma } from '@prisma/client';
import { Cargo } from '@breakr/shared';
import { PrismaService } from '../prisma/prisma.service';
import { CodigoUnicoService } from '../common/codigo-unico/codigo-unico.service';
import { AUTENTIQUE_PORT, AutentiquePort } from '../integracoes';
import { EngineService } from '../automacao/engine.service';
import { NotificacoesService } from '../notificacoes/notificacoes.service';
import { FaturasService } from '../faturas/faturas.service';
import { CriarContratoDto } from './dto/criar-contrato.dto';

@Injectable()
export class ContratosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly codigoUnico: CodigoUnicoService,
    @Inject(AUTENTIQUE_PORT) private readonly autentique: AutentiquePort,
    private readonly engine: EngineService,
    private readonly faturas: FaturasService,
    private readonly notificacoes: NotificacoesService,
  ) {}

  // Cria um contrato em RASCUNHO. O valor vem do DTO ou, na falta, do plano.
  async criar(dto: CriarContratoDto): Promise<Contrato> {
    const cliente = await this.prisma.cliente.findUnique({
      where: { id: dto.clienteId },
    });
    if (!cliente) {
      throw new NotFoundException('Cliente nao encontrado');
    }

    // Plano: o do DTO tem prioridade; senao o do cliente.
    const planoId = dto.planoId ?? cliente.planoId ?? undefined;

    // Valor mensal: do DTO se enviado; senao busca o valor do plano.
    let valorMensal: Prisma.Decimal;
    if (dto.valorMensal !== undefined) {
      valorMensal = new Prisma.Decimal(dto.valorMensal);
    } else {
      const plano = planoId
        ? await this.prisma.plano.findUnique({ where: { id: planoId } })
        : null;
      if (!plano) {
        throw new NotFoundException(
          'Valor do contrato nao informado e nenhum plano disponivel para deriva-lo',
        );
      }
      valorMensal = new Prisma.Decimal(plano.valor);
    }

    const contrato = await this.prisma.contrato.create({
      data: {
        clienteId: dto.clienteId,
        planoId,
        valorMensal,
        status: 'RASCUNHO',
        codigoUnico: this.codigoUnico.gerar('CTR'),
        ...(dto.vencimento !== undefined && {
          vencimento: new Date(dto.vencimento),
        }),
        renovacaoAutomatica: dto.renovacaoAutomatica ?? true,
      },
    });

    await this.engine.dispatch('contrato.criado', {
      contratoId: contrato.id,
      clienteId: dto.clienteId,
    });

    return contrato;
  }

  // Envia o contrato para assinatura no Autentique (stub na Fase 1).
  async enviarParaAssinatura(id: string): Promise<Contrato> {
    const contrato = await this.prisma.contrato.findUnique({
      where: { id },
      include: { cliente: true },
    });
    if (!contrato) {
      throw new NotFoundException('Contrato nao encontrado');
    }

    // Retorno (id do doc, link de assinatura) e salvo no nosso banco.
    const doc = await this.autentique.enviarParaAssinatura({
      nomeDocumento: `Contrato ${contrato.codigoUnico} — ${contrato.cliente.nomeFantasia}`,
      // TODO: e-mail real do signatario do cliente.
      signatarios: [
        { nome: contrato.cliente.nomeFantasia, email: 'contato@cliente.com' },
      ],
    });

    const atualizado = await this.prisma.contrato.update({
      where: { id },
      data: {
        autentiqueId: doc.id,
        docUrl: doc.linkAssinatura,
        status: 'AGUARDANDO_ASSINATURA',
      },
    });

    await this.engine.dispatch('contrato.enviado_assinatura', { contratoId: id });

    return atualizado;
  }

  // Marca o contrato como assinado -> cai em EM_REVISAO (revisao interna antes
  // de vigorar). Simula o webhook do Autentique. Notifica o financeiro.
  async marcarAssinado(id: string): Promise<Contrato> {
    const existente = await this.prisma.contrato.findUnique({
      where: { id },
      include: { cliente: true },
    });
    if (!existente) {
      throw new NotFoundException('Contrato nao encontrado');
    }

    const contrato = await this.prisma.contrato.update({
      where: { id },
      data: { status: 'EM_REVISAO' },
    });

    await this.engine.dispatch('contrato.assinado', { contratoId: id });
    await this.notificacoes.notificarPorCargo(Cargo.FINANCEIRO, {
      titulo: 'Contrato para revisão',
      mensagem: `Contrato ${existente.codigoUnico} de ${existente.cliente.nomeFantasia} assinado — revisar antes de entrar em vigor.`,
      tipo: 'ALERTA',
      link: '/contratos',
    });

    return contrato;
  }

  // Coloca o contrato EM_VIGOR e dispara a 1a cobranca. Define dataInicio e,
  // se ainda nao houver, vencimento = inicio + 30 dias.
  async colocarEmVigor(id: string): Promise<Contrato> {
    const existente = await this.prisma.contrato.findUnique({
      where: { id },
    });
    if (!existente) {
      throw new NotFoundException('Contrato nao encontrado');
    }
    // Guarda: nao revigora um contrato ja em vigor (evita 2a cobranca).
    if (existente.status === 'EM_VIGOR') {
      return existente;
    }

    const dataInicio = new Date();
    const vencimento =
      existente.vencimento ??
      new Date(dataInicio.getTime() + 30 * 24 * 60 * 60 * 1000);

    const contrato = await this.prisma.contrato.update({
      where: { id },
      data: { status: 'EM_VIGOR', dataInicio, vencimento },
    });

    // Contrato vigente dispara a primeira cobranca do cliente.
    await this.faturas.gerarCobranca(id);
    await this.engine.dispatch('contrato.em_vigor', { contratoId: id });

    return contrato;
  }

  // Lista todos os contratos (mais recentes primeiro).
  listar(): Promise<Contrato[]> {
    return this.prisma.contrato.findMany({
      orderBy: { criadoEm: 'desc' },
      include: { cliente: { select: { nomeFantasia: true } } },
    });
  }

  // Detalhe de um contrato.
  async obter(id: string): Promise<Contrato> {
    const contrato = await this.prisma.contrato.findUnique({
      where: { id },
      include: { cliente: true, plano: true },
    });
    if (!contrato) {
      throw new NotFoundException('Contrato nao encontrado');
    }
    return contrato;
  }
}
