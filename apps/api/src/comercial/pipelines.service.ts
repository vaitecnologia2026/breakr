// Servico de pipelines, etapas e etiquetas do CRM (estilo RD). As etapas mapeiam
// para um `status` do funil (fonte de verdade); pipelines/etapas sao apenas uma
// organizacao visual em cima do mesmo funil validado.
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, StatusLead } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CriarPipelineDto,
  AtualizarPipelineDto,
  EtapaDto,
  AtualizarEtapaDto,
  CriarEtiquetaDto,
} from './dto/pipeline.dto';

// Pipelines padrao (semeados na 1a vez). Cada etapa liga a um status do funil.
const SEED: { nome: string; etapas: [string, StatusLead][] }[] = [
  {
    nome: 'Prospecção',
    etapas: [
      ['Entrada de Leads', 'NOVO'],
      ['Tentando contato', 'CONTATADO'],
      ['Contato realizado com a empresa', 'QUALIFICADO'],
      ['Contato realizado com o decisor', 'PROPOSTA'],
      ['Reunião Agendada [R1]', 'PROPOSTA'],
    ],
  },
  {
    nome: 'Inbound',
    etapas: [
      ['Entrada de Leads', 'NOVO'],
      ['Tentando contato', 'CONTATADO'],
      ['Qualificado', 'QUALIFICADO'],
      ['Proposta', 'PROPOSTA'],
    ],
  },
  {
    nome: 'Social Selling',
    etapas: [
      ['MQL Cadastrado', 'NOVO'],
      ['Tentando contato', 'CONTATADO'],
      ['Qualificado', 'QUALIFICADO'],
      ['Proposta', 'PROPOSTA'],
    ],
  },
  {
    nome: 'Negociação',
    etapas: [
      ['Apresentar proposta', 'PROPOSTA'],
      ['Contrato', 'PROPOSTA'],
      ['Pagamento', 'GANHO'],
    ],
  },
  {
    nome: 'Prospecção | Júlia',
    etapas: [
      ['Entrada de Leads', 'NOVO'],
      ['Tentando contato', 'CONTATADO'],
      ['Contato com decisor', 'PROPOSTA'],
      ['Reunião agendada', 'PROPOSTA'],
    ],
  },
];

@Injectable()
export class PipelinesService {
  constructor(private readonly prisma: PrismaService) {}

  private async semearSeVazio(): Promise<void> {
    const count = await this.prisma.pipeline.count();
    if (count > 0) return;
    for (let i = 0; i < SEED.length; i++) {
      const d = SEED[i];
      await this.prisma.pipeline.create({
        data: {
          nome: d.nome,
          ordem: i,
          etapas: { create: d.etapas.map(([nome, status], j) => ({ nome, status, ordem: j })) },
        },
      });
    }
  }

  // Lista pipelines ativos com suas etapas ordenadas (semeia padroes na 1a vez).
  async listarPipelines() {
    await this.semearSeVazio();
    return this.prisma.pipeline.findMany({
      where: { ativo: true },
      orderBy: [{ ordem: 'asc' }, { criadoEm: 'asc' }],
      include: { etapas: { orderBy: { ordem: 'asc' } } },
    });
  }

  async criarPipeline(dto: CriarPipelineDto) {
    const agg = await this.prisma.pipeline.aggregate({ _max: { ordem: true } });
    const etapas = dto.etapas && dto.etapas.length ? dto.etapas : [
      { nome: 'Entrada de Leads', status: 'NOVO' as StatusLead },
      { nome: 'Tentando contato', status: 'CONTATADO' as StatusLead },
      { nome: 'Qualificado', status: 'QUALIFICADO' as StatusLead },
      { nome: 'Proposta', status: 'PROPOSTA' as StatusLead },
    ];
    try {
      return await this.prisma.pipeline.create({
        data: {
          nome: dto.nome,
          ordem: (agg._max.ordem ?? 0) + 1,
          etapas: { create: etapas.map((e: EtapaDto, i: number) => ({ nome: e.nome, status: e.status, ordem: e.ordem ?? i })) },
        },
        include: { etapas: { orderBy: { ordem: 'asc' } } },
      });
    } catch (erro) {
      if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === 'P2002') {
        throw new ConflictException('Ja existe um pipeline com esse nome');
      }
      throw erro;
    }
  }

  async atualizarPipeline(id: string, dto: AtualizarPipelineDto) {
    await this.garantirPipeline(id);
    try {
      return await this.prisma.pipeline.update({
        where: { id },
        data: {
          ...(dto.nome !== undefined && { nome: dto.nome }),
          ...(dto.ativo !== undefined && { ativo: dto.ativo }),
          ...(dto.ordem !== undefined && { ordem: dto.ordem }),
        },
        include: { etapas: { orderBy: { ordem: 'asc' } } },
      });
    } catch (erro) {
      if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === 'P2002') {
        throw new ConflictException('Ja existe um pipeline com esse nome');
      }
      throw erro;
    }
  }

  // Exclui um pipeline (e suas etapas em cascata). Leads apontando para ele ficam
  // com pipeline_id/etapa_id nulos (mantendo status) — nada e apagado.
  async excluirPipeline(id: string) {
    await this.garantirPipeline(id);
    await this.prisma.pipeline.delete({ where: { id } });
    return { ok: true };
  }

  async criarEtapa(pipelineId: string, dto: EtapaDto) {
    await this.garantirPipeline(pipelineId);
    const agg = await this.prisma.etapaPipeline.aggregate({ where: { pipelineId }, _max: { ordem: true } });
    return this.prisma.etapaPipeline.create({
      data: { pipelineId, nome: dto.nome, status: dto.status, ordem: (agg._max.ordem ?? -1) + 1 },
    });
  }

  async atualizarEtapa(id: string, dto: AtualizarEtapaDto) {
    const etapa = await this.prisma.etapaPipeline.findUnique({ where: { id } });
    if (!etapa) throw new NotFoundException('Etapa nao encontrada');
    return this.prisma.etapaPipeline.update({
      where: { id },
      data: {
        ...(dto.nome !== undefined && { nome: dto.nome }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.ordem !== undefined && { ordem: dto.ordem }),
      },
    });
  }

  async excluirEtapa(id: string) {
    const etapa = await this.prisma.etapaPipeline.findUnique({ where: { id } });
    if (!etapa) throw new NotFoundException('Etapa nao encontrada');
    await this.prisma.etapaPipeline.delete({ where: { id } });
    return { ok: true };
  }

  // Reordena as etapas de um pipeline conforme a lista de ids (index vira ordem).
  async reordenarEtapas(pipelineId: string, ids: string[]) {
    await this.garantirPipeline(pipelineId);
    await this.prisma.$transaction(
      ids.map((id, i) =>
        this.prisma.etapaPipeline.updateMany({ where: { id, pipelineId }, data: { ordem: i } }),
      ),
    );
    return this.prisma.etapaPipeline.findMany({ where: { pipelineId }, orderBy: { ordem: 'asc' } });
  }

  // ── Etiquetas ──────────────────────────────────────────────────────────────
  listarEtiquetas() {
    return this.prisma.etiqueta.findMany({ orderBy: { nome: 'asc' } });
  }

  async criarEtiqueta(dto: CriarEtiquetaDto) {
    try {
      return await this.prisma.etiqueta.create({
        data: { nome: dto.nome, ...(dto.cor !== undefined && { cor: dto.cor }) },
      });
    } catch (erro) {
      if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === 'P2002') {
        throw new ConflictException('Ja existe uma etiqueta com esse nome');
      }
      throw erro;
    }
  }

  async excluirEtiqueta(id: string) {
    const et = await this.prisma.etiqueta.findUnique({ where: { id } });
    if (!et) throw new NotFoundException('Etiqueta nao encontrada');
    await this.prisma.etiqueta.delete({ where: { id } });
    return { ok: true };
  }

  private async garantirPipeline(id: string): Promise<void> {
    const p = await this.prisma.pipeline.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('Pipeline nao encontrado');
  }
}
