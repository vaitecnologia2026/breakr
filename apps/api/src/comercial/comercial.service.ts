// Servico do comercial — pipeline de vendas (CRM, M11). Um Lead percorre o
// funil e, quando ganho, converte em Cliente.
import { Injectable, NotFoundException } from '@nestjs/common';
import { Lead, Prisma, StatusLead } from '@prisma/client';
import { ClienteStatus } from '@breakr/shared';
import { PrismaService } from '../prisma/prisma.service';
import { CodigoUnicoService } from '../common/codigo-unico/codigo-unico.service';
import { EngineService } from '../automacao/engine.service';
import { CriarLeadDto } from './dto/criar-lead.dto';

@Injectable()
export class ComercialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly codigoUnico: CodigoUnicoService,
    private readonly engine: EngineService,
  ) {}

  // Cria lead com status NOVO e codigo unico gerado (prefixo LEAD).
  criar(dto: CriarLeadDto): Promise<Lead> {
    return this.prisma.lead.create({
      data: {
        nome: dto.nome,
        empresa: dto.empresa,
        email: dto.email,
        telefone: dto.telefone,
        origem: dto.origem,
        observacao: dto.observacao,
        responsavelId: dto.responsavelId,
        status: StatusLead.NOVO,
        valorEstimado:
          dto.valorEstimado !== undefined
            ? new Prisma.Decimal(dto.valorEstimado)
            : undefined,
        codigoUnico: this.codigoUnico.gerar('LEAD'),
      },
    });
  }

  // Lista os leads (mais recentes primeiro), com filtro opcional por etapa e
  // responsavel.
  listar(filtro?: {
    status?: StatusLead;
    responsavelId?: string;
  }): Promise<Lead[]> {
    const where: Prisma.LeadWhereInput = {};
    if (filtro?.status !== undefined) {
      where.status = filtro.status;
    }
    if (filtro?.responsavelId !== undefined) {
      where.responsavelId = filtro.responsavelId;
    }
    return this.prisma.lead.findMany({
      where,
      include: {
        responsavel: { select: { nome: true } },
        cliente: { select: { nomeFantasia: true } },
      },
      orderBy: { criadoEm: 'desc' },
    });
  }

  // Busca um lead pelo id.
  async obter(id: string): Promise<Lead> {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      include: {
        responsavel: { select: { nome: true } },
        cliente: { select: { nomeFantasia: true } },
      },
    });
    if (!lead) {
      throw new NotFoundException('Lead nao encontrado');
    }
    return lead;
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

  // Converte o lead em cliente (idempotente). Cria o Cliente, marca o lead como
  // GANHO + vincula o cliente e dispara o evento lead.ganho no motor.
  async converter(id: string): Promise<Lead> {
    const lead = await this.obter(id);
    if (lead.clienteId) {
      return lead;
    }
    const novoCliente = await this.prisma.cliente.create({
      data: {
        nomeFantasia: lead.empresa || lead.nome,
        status: ClienteStatus.NOVO as never,
        codigoUnico: this.codigoUnico.gerar('CLI'),
      },
    });
    await this.prisma.lead.update({
      where: { id },
      data: {
        status: StatusLead.GANHO,
        clienteId: novoCliente.id,
      },
    });
    await this.engine.dispatch('lead.ganho', {
      leadId: id,
      clienteId: novoCliente.id,
    });
    return this.obter(id);
  }
}
