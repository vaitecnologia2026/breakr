// Servico do comercial — pipeline de vendas (CRM, M11). Um Lead percorre o
// funil e, quando ganho, converte em Cliente.
import { Injectable, NotFoundException } from '@nestjs/common';
import { Lead, Prisma, StatusLead } from '@prisma/client';
import { ClienteStatus } from '@breakr/shared';
import { PrismaService } from '../prisma/prisma.service';
import { CodigoUnicoService } from '../common/codigo-unico/codigo-unico.service';
import { EngineService } from '../automacao/engine.service';
import { CriarLeadDto } from './dto/criar-lead.dto';
import { AtualizarLeadDto } from './dto/atualizar-lead.dto';
import { DefinirItensNegocioDto } from './dto/definir-itens-negocio.dto';
import { CriarLeadPublicoDto } from './dto/criar-lead-publico.dto';
import { SalvarCadastroContratoDto } from './dto/salvar-cadastro-contrato.dto';

// Rotulo legivel de cada status do funil (usado no historico do negocio).
const STATUS_LABEL: Record<StatusLead, string> = {
  [StatusLead.NOVO]: 'Entrada de Leads',
  [StatusLead.CONTATADO]: 'Tentando contato',
  [StatusLead.QUALIFICADO]: 'Qualificado',
  [StatusLead.PROPOSTA]: 'Proposta',
  [StatusLead.GANHO]: 'Ganho',
  [StatusLead.PERDIDO]: 'Perdido',
};

@Injectable()
export class ComercialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly codigoUnico: CodigoUnicoService,
    private readonly engine: EngineService,
  ) {}

  // Cria lead. Se veio uma etapa de pipeline, o status inicial vem do status
  // dessa etapa (a etapa liga ao funil); senao NOVO. Codigo unico prefixo LEAD.
  async criar(dto: CriarLeadDto): Promise<Lead> {
    let status: StatusLead = StatusLead.NOVO;
    let pipelineId = dto.pipelineId;
    if (dto.etapaId) {
      const etapa = await this.prisma.etapaPipeline.findUnique({ where: { id: dto.etapaId } });
      if (etapa) {
        status = etapa.status;
        pipelineId = pipelineId ?? etapa.pipelineId;
      }
    }
    const lead = await this.prisma.lead.create({
      data: {
        nome: dto.nome,
        empresa: dto.empresa,
        email: dto.email,
        telefone: dto.telefone,
        origem: dto.origem,
        observacao: dto.observacao,
        responsavelId: dto.responsavelId,
        status,
        valorEstimado:
          dto.valorEstimado !== undefined
            ? new Prisma.Decimal(dto.valorEstimado)
            : undefined,
        codigoUnico: this.codigoUnico.gerar('LEAD'),
        ...(pipelineId && { pipelineId }),
        ...(dto.etapaId && { etapaId: dto.etapaId }),
        ...(dto.previsaoFechamento && { previsaoFechamento: new Date(dto.previsaoFechamento) }),
        ...(dto.etiquetaIds && dto.etiquetaIds.length && {
          etiquetas: { create: dto.etiquetaIds.map((etiquetaId) => ({ etiquetaId })) },
        }),
      },
    });
    await this.engine.dispatch('lead.capturado', {
      leadId: lead.id,
      nome: lead.nome,
      empresa: lead.empresa ?? '',
      telefone: lead.telefone ?? '',
      email: lead.email ?? '',
      origem: lead.origem ?? '',
    });
    return lead;
  }

  // Lista os leads (mais recentes primeiro), com filtro opcional por etapa e
  // responsavel.
  listar(filtro?: {
    status?: StatusLead;
    responsavelId?: string;
    pipelineId?: string;
    etapaId?: string;
    etiquetaId?: string;
  }): Promise<Lead[]> {
    const where: Prisma.LeadWhereInput = {};
    if (filtro?.status !== undefined) {
      where.status = filtro.status;
    }
    if (filtro?.responsavelId !== undefined) {
      where.responsavelId = filtro.responsavelId;
    }
    if (filtro?.pipelineId !== undefined) {
      where.pipelineId = filtro.pipelineId;
    }
    if (filtro?.etapaId !== undefined) {
      where.etapaId = filtro.etapaId;
    }
    if (filtro?.etiquetaId !== undefined) {
      where.etiquetas = { some: { etiquetaId: filtro.etiquetaId } };
    }
    return this.prisma.lead.findMany({
      where,
      include: {
        responsavel: { select: { nome: true } },
        cliente: { select: { nomeFantasia: true } },
        pipeline: { select: { id: true, nome: true } },
        etapa: { select: { id: true, nome: true, status: true } },
        etiquetas: { include: { etiqueta: true } },
      },
      orderBy: { criadoEm: 'desc' },
    });
  }

  // Performance comercial: visão de gestão sobre o pipeline.
  async performance() {
    const leads = await this.prisma.lead.findMany({
      select: { status: true, responsavel: { select: { nome: true } } },
    });
    const total = leads.length;
    const ganhos = leads.filter((l) => l.status === StatusLead.GANHO).length;
    const perdidos = leads.filter((l) => l.status === StatusLead.PERDIDO).length;
    const abertos = total - ganhos - perdidos;
    const fechados = ganhos + perdidos;
    const taxaConversao = fechados > 0 ? Math.round((ganhos / fechados) * 100) : 0;

    const mapa = new Map<string, { responsavel: string; ganhos: number; abertos: number }>();
    for (const l of leads) {
      const nome = l.responsavel?.nome ?? 'Sem responsável';
      const r = mapa.get(nome) ?? { responsavel: nome, ganhos: 0, abertos: 0 };
      if (l.status === StatusLead.GANHO) r.ganhos += 1;
      else if (l.status !== StatusLead.PERDIDO) r.abertos += 1;
      mapa.set(nome, r);
    }
    const ranking = [...mapa.values()].sort((a, b) => b.ganhos - a.ganhos);
    return { total, abertos, ganhos, perdidos, taxaConversao, ranking };
  }

  // Busca um lead pelo id.
  async obter(id: string): Promise<Lead> {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      include: {
        responsavel: { select: { nome: true } },
        cliente: { select: { nomeFantasia: true } },
        pipeline: { select: { id: true, nome: true } },
        etapa: { select: { id: true, nome: true, status: true } },
        etiquetas: { include: { etiqueta: true } },
        planos: { include: { plano: { select: { id: true, nome: true, valor: true, entregaveis: true, produtos: { select: { produto: { select: { id: true, nome: true, descricao: true } } } } } } } },
        produtos: { include: { produto: { select: { id: true, nome: true, valor: true, descricao: true } } } },
      },
    });
    if (!lead) {
      throw new NotFoundException('Lead nao encontrado');
    }
    return lead;
  }

  // Define os planos/produtos do negocio ("+ Produtos"). Substitui o conjunto
  // atual e recalcula o valor do negocio como a soma (valor x quantidade) de
  // todos os itens. Aceita so plano, so produto, ou ambos.
  async definirItens(id: string, dto: DefinirItensNegocioDto): Promise<Lead> {
    await this.obter(id);
    const planos = dto.planos ?? [];
    const produtos = dto.produtos ?? [];
    const planoIds = planos.map((p) => p.planoId);
    const produtoIds = produtos.map((p) => p.produtoId);
    const pl = planoIds.length
      ? await this.prisma.plano.findMany({ where: { id: { in: planoIds } } })
      : [];
    const pr = produtoIds.length
      ? await this.prisma.produto.findMany({ where: { id: { in: produtoIds } } })
      : [];
    const valorPlano = new Map<string, Prisma.Decimal>(pl.map((x) => [x.id, x.valor] as [string, Prisma.Decimal]));
    const valorProduto = new Map<string, Prisma.Decimal>(pr.map((x) => [x.id, x.valor] as [string, Prisma.Decimal]));
    let total = new Prisma.Decimal(0);
    for (const it of planos) {
      const v = valorPlano.get(it.planoId);
      if (v) total = total.plus(v.mul(it.quantidade ?? 1));
    }
    for (const it of produtos) {
      const v = valorProduto.get(it.produtoId);
      if (v) total = total.plus(v.mul(it.quantidade ?? 1));
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.leadPlano.deleteMany({ where: { leadId: id } });
      await tx.leadProduto.deleteMany({ where: { leadId: id } });
      if (planos.length) {
        await tx.leadPlano.createMany({ data: planos.map((p) => ({ leadId: id, planoId: p.planoId, quantidade: p.quantidade ?? 1 })) });
      }
      if (produtos.length) {
        await tx.leadProduto.createMany({ data: produtos.map((p) => ({ leadId: id, produtoId: p.produtoId, quantidade: p.quantidade ?? 1 })) });
      }
      await tx.lead.update({ where: { id }, data: { valorEstimado: total } });
    });
    return this.obter(id);
  }

  // Move o lead para uma ETAPA de pipeline. Ajusta o etapaId e deriva o status
  // do funil a partir do status da etapa (mantendo a logica validada de GANHO).
  // Registra o movimento no historico do negocio (aba "Historico").
  async moverEtapa(id: string, etapaId: string, autorId?: string): Promise<Lead> {
    const atual = await this.prisma.lead.findUnique({
      where: { id },
      select: { status: true, clienteId: true, etapa: { select: { nome: true } } },
    });
    if (!atual) throw new NotFoundException('Lead nao encontrado');
    const etapa = await this.prisma.etapaPipeline.findUnique({ where: { id: etapaId } });
    if (!etapa) throw new NotFoundException('Etapa nao encontrada');
    const deNome = atual.etapa?.nome ?? STATUS_LABEL[atual.status];
    if (etapa.status === StatusLead.GANHO && !atual.clienteId) {
      await this.prisma.lead.update({ where: { id }, data: { etapaId, pipelineId: etapa.pipelineId } });
      await this.registrarHistorico(id, deNome, etapa.nome, autorId);
      return this.converter(id);
    }
    await this.prisma.lead.update({
      where: { id },
      data: { etapaId, pipelineId: etapa.pipelineId, status: etapa.status },
    });
    await this.registrarHistorico(id, deNome, etapa.nome, autorId);
    return this.obter(id);
  }

  // Move o lead para outra etapa do pipeline. Se for GANHO e ainda nao houver
  // cliente vinculado, converte (que ja seta GANHO e cria o cliente).
  async moverStatus(id: string, novoStatus: StatusLead, autorId?: string): Promise<Lead> {
    const lead = await this.obter(id);
    if (lead.status !== novoStatus) {
      await this.registrarHistorico(id, STATUS_LABEL[lead.status], STATUS_LABEL[novoStatus], autorId, 'Status alterado');
    }
    if (novoStatus === StatusLead.GANHO && !lead.clienteId) {
      return this.converter(id);
    }
    await this.prisma.lead.update({
      where: { id },
      data: { status: novoStatus },
    });
    return this.obter(id);
  }

  // Atualiza os campos do negocio (aba/RESUMO da tela de detalhe): empresa,
  // email, telefone, observacao (contato), valor, previsao e etiquetas.
  async atualizar(id: string, dto: AtualizarLeadDto): Promise<Lead> {
    await this.obter(id);
    const data: Prisma.LeadUpdateInput = {};
    if (dto.empresa !== undefined) data.empresa = dto.empresa;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.telefone !== undefined) data.telefone = dto.telefone;
    if (dto.observacao !== undefined) data.observacao = dto.observacao;
    if (dto.valorEstimado !== undefined) {
      data.valorEstimado = dto.valorEstimado === null || dto.valorEstimado === ''
        ? null
        : new Prisma.Decimal(dto.valorEstimado);
    }
    if (dto.previsaoFechamento !== undefined) {
      data.previsaoFechamento = dto.previsaoFechamento ? new Date(dto.previsaoFechamento) : null;
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.lead.update({ where: { id }, data });
      if (dto.etiquetaIds !== undefined) {
        await tx.leadEtiqueta.deleteMany({ where: { leadId: id } });
        if (dto.etiquetaIds.length) {
          await tx.leadEtiqueta.createMany({
            data: dto.etiquetaIds.map((etiquetaId) => ({ leadId: id, etiquetaId })),
          });
        }
      }
    });
    return this.obter(id);
  }

  // ── Cadastro Completo (dados de captacao p/ contrato) ──────────────────────
  // Retorna o cadastro do negocio (ou null se ainda nao preenchido).
  async obterCadastro(leadId: string) {
    await this.obter(leadId);
    return this.prisma.cadastroContrato.findUnique({ where: { leadId } });
  }

  // Cria ou atualiza (upsert) o cadastro completo do negocio.
  async salvarCadastro(leadId: string, dto: SalvarCadastroContratoDto) {
    await this.obter(leadId);
    const data = {
      razaoSocial: dto.razaoSocial ?? null,
      nomeFantasia: dto.nomeFantasia ?? null,
      cnpj: dto.cnpj ?? null,
      nomeSocio: dto.nomeSocio ?? null,
      cpfSocio: dto.cpfSocio ?? null,
      dataNascimentoSocio: dto.dataNascimentoSocio ?? null,
      profissao: dto.profissao ?? null,
      nacionalidade: dto.nacionalidade ?? null,
      email: dto.email ?? null,
      whatsappSocio: dto.whatsappSocio ?? null,
      whatsappFinanceiro: dto.whatsappFinanceiro ?? null,
      cep: dto.cep ?? null,
      endereco: dto.endereco ?? null,
      numero: dto.numero ?? null,
      complemento: dto.complemento ?? null,
      bairro: dto.bairro ?? null,
      cidadeEstado: dto.cidadeEstado ?? null,
      cidade: dto.cidade ?? null,
      estado: dto.estado ?? null,
      inscricaoMunicipal: dto.inscricaoMunicipal ?? null,
      inscricaoEstadual: dto.inscricaoEstadual ?? null,
    };
    return this.prisma.cadastroContrato.upsert({
      where: { leadId },
      create: { leadId, ...data },
      update: data,
    });
  }

  // ── Notas do negocio (aba "Notas") ─────────────────────────────────────────
  listarNotas(id: string) {
    return this.prisma.notaLead.findMany({
      where: { leadId: id },
      include: { autor: { select: { nome: true } } },
      orderBy: { criadoEm: 'desc' },
    });
  }

  async criarNota(id: string, texto: string, autorId?: string) {
    await this.obter(id);
    return this.prisma.notaLead.create({
      data: { leadId: id, texto, autorId: autorId ?? null },
      include: { autor: { select: { nome: true } } },
    });
  }

  // ── Historico do negocio (aba "Historico") ─────────────────────────────────
  listarHistorico(id: string) {
    return this.prisma.historicoLead.findMany({
      where: { leadId: id },
      include: { autor: { select: { nome: true } } },
      orderBy: { criadoEm: 'desc' },
    });
  }

  private async registrarHistorico(
    leadId: string,
    de: string | null,
    para: string | null,
    autorId?: string,
    acao = 'Etapa alterada',
  ): Promise<void> {
    await this.prisma.historicoLead.create({
      data: { leadId, de, para, autorId: autorId ?? null, acao },
    });
  }

  // Atribui um responsavel ao lead.
  async atribuirResponsavel(
    id: string,
    responsavelId: string,
  ): Promise<Lead> {
    await this.obter(id);
    await this.prisma.lead.update({
      where: { id },
      data: { responsavelId },
    });
    return this.obter(id);
  }

  // Captura um lead vindo do site público (sem autenticação).
  // Equivale ao workflow n8n "[Site Breakr] Leads do Site":
  //   cria o Lead com origem fixa + dispara lead.site_capturado → motor notifica COMERCIAL.
  async capturarLeadPublico(dto: CriarLeadPublicoDto): Promise<Lead> {
    const lead = await this.prisma.lead.create({
      data: {
        nome: dto.nome,
        empresa: dto.empresa,
        email: dto.email,
        telefone: dto.telefone,
        origem: 'Site Breakr',
        observacao: dto.observacao,
        status: StatusLead.NOVO,
        codigoUnico: this.codigoUnico.gerar('LEAD'),
      },
    });
    await this.engine.dispatch('lead.site_capturado', {
      leadId: lead.id,
      nome: lead.nome,
      empresa: lead.empresa ?? '',
      telefone: lead.telefone ?? '',
      email: lead.email ?? '',
    });
    return lead;
  }

  // Converte o lead em cliente (idempotente). Cria o Cliente, marca o lead como
  // GANHO + vincula o cliente e dispara o evento lead.ganho no motor.
  async converter(id: string): Promise<Lead> {
    const lead = await this.obter(id);
    if (lead.clienteId) {
      return lead;
    }
    // Cria o cliente e vincula o lead atomicamente. O re-check do clienteId
    // dentro da transacao evita criar um segundo cliente em chamadas concorrentes
    // (ex.: dois GANHO simultaneos) ou em retries apos falha parcial.
    const novoCliente = await this.prisma.$transaction(async (tx) => {
      const atual = await tx.lead.findUnique({
        where: { id },
        select: { clienteId: true },
      });
      if (!atual) {
        throw new NotFoundException('Lead nao encontrado');
      }
      if (atual.clienteId) {
        return null; // ja convertido por outra chamada
      }
      const cliente = await tx.cliente.create({
        data: {
          nomeFantasia: lead.empresa || lead.nome,
          status: ClienteStatus.NOVO as never,
          codigoUnico: this.codigoUnico.gerar('CLI'),
        },
      });
      await tx.lead.update({
        where: { id },
        data: {
          status: StatusLead.GANHO,
          clienteId: cliente.id,
        },
      });
      return cliente;
    });

    // Dispara o evento somente apos o commit, e apenas se esta chamada converteu.
    if (novoCliente) {
      await this.engine.dispatch('lead.ganho', {
        leadId: id,
        clienteId: novoCliente.id,
      });
    }
    return this.obter(id);
  }
}
