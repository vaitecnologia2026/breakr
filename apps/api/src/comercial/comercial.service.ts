// Servico do comercial — pipeline de vendas (CRM, M11). Um Lead percorre o
// funil e, quando ganho, converte em Cliente.
import { Injectable, NotFoundException } from '@nestjs/common';
import { Lead, Prisma, StatusLead } from '@prisma/client';
import { ClienteStatus } from '@breakr/shared';
import { PrismaService } from '../prisma/prisma.service';
import { CodigoUnicoService } from '../common/codigo-unico/codigo-unico.service';
import { EngineService } from '../automacao/engine.service';
import { CriarLeadDto } from './dto/criar-lead.dto';
import { CriarLeadPublicoDto } from './dto/criar-lead-publico.dto';

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
      },
    });
    if (!lead) {
      throw new NotFoundException('Lead nao encontrado');
    }
    return lead;
  }

  // Move o lead para uma ETAPA de pipeline. Ajusta o etapaId e deriva o status
  // do funil a partir do status da etapa (mantendo a logica validada de GANHO).
  async moverEtapa(id: string, etapaId: string): Promise<Lead> {
    const lead = await this.obter(id);
    const etapa = await this.prisma.etapaPipeline.findUnique({ where: { id: etapaId } });
    if (!etapa) throw new NotFoundException('Etapa nao encontrada');
    if (etapa.status === StatusLead.GANHO && !lead.clienteId) {
      await this.prisma.lead.update({ where: { id }, data: { etapaId, pipelineId: etapa.pipelineId } });
      return this.converter(id);
    }
    await this.prisma.lead.update({
      where: { id },
      data: { etapaId, pipelineId: etapa.pipelineId, status: etapa.status },
    });
    return this.obter(id);
  }

  // Move o lead para outra etapa do pipeline. Se for GANHO e ainda nao houver
  // cliente vinculado, converte (que ja seta GANHO e cria o cliente).
  async moverStatus(id: string, novoStatus: StatusLead): Promise<Lead> {
    const lead = await this.obter(id);
    if (novoStatus === StatusLead.GANHO && !lead.clienteId) {
      return this.converter(id);
    }
    await this.prisma.lead.update({
      where: { id },
      data: { status: novoStatus },
    });
    return this.obter(id);
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
