// Serviço do catálogo de Tipos de Tarefa × Etapas (fluxo de produção — Marketing).
// Cada Tipo de Tarefa é um template com atributos de planejamento e uma matriz de
// 9 etapas (aplicável + responsável padrão). Ao criar um tipo, as 9 etapas são
// semeadas (todas aplicáveis, sem responsável). Não altera o funil de Conteudo.
import { Injectable, NotFoundException } from '@nestjs/common';
import { ControleEsforco, EtapaTipoTarefa, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CriarTipoTarefaDto } from './dto/criar-tipo-tarefa.dto';
import { AtualizarTipoTarefaDto } from './dto/atualizar-tipo-tarefa.dto';
import { AtualizarEtapaDto } from './dto/atualizar-etapa.dto';

// Ordem das etapas do fluxo (igual à matriz do wireframe do eKyte).
const ETAPAS_ORDEM: EtapaTipoTarefa[] = [
  EtapaTipoTarefa.BRIEFING,
  EtapaTipoTarefa.ANALISE,
  EtapaTipoTarefa.REDACAO,
  EtapaTipoTarefa.DESIGN,
  EtapaTipoTarefa.REVISAO_INTERNA,
  EtapaTipoTarefa.APROVACAO_CLIENTE,
  EtapaTipoTarefa.PUBLICACAO,
  EtapaTipoTarefa.DIVULGACAO,
  EtapaTipoTarefa.MONITORAMENTO,
];

@Injectable()
export class TiposTarefaService {
  constructor(private readonly prisma: PrismaService) {}

  listar() {
    return this.prisma.tipoTarefa.findMany({
      orderBy: { criadoEm: 'desc' },
      include: { etapas: true },
      take: 300,
    });
  }

  obter(id: string) {
    return this.prisma.tipoTarefa.findUnique({
      where: { id },
      include: { etapas: true },
    });
  }

  // Cria o tipo e semeia as 9 etapas (todas aplicáveis, sem responsável).
  criar(dto: CriarTipoTarefaDto, criadoPorId?: string) {
    return this.prisma.tipoTarefa.create({
      data: {
        titulo: dto.titulo,
        controleEsforco: dto.controleEsforco ?? ControleEsforco.AGIL,
        diasConcluir: dto.diasConcluir ?? null,
        esforcoPrevistoMin: dto.esforcoPrevistoMin ?? null,
        criadoPorId: criadoPorId ?? null,
        etapas: {
          create: ETAPAS_ORDEM.map((etapa) => ({ etapa, aplicavel: true })),
        },
      },
      include: { etapas: true },
    });
  }

  async atualizar(id: string, dto: AtualizarTipoTarefaDto) {
    await this.garantirExiste(id);
    return this.prisma.tipoTarefa.update({
      where: { id },
      data: {
        ...(dto.titulo !== undefined ? { titulo: dto.titulo } : {}),
        ...(dto.controleEsforco !== undefined
          ? { controleEsforco: dto.controleEsforco }
          : {}),
        ...(dto.diasConcluir !== undefined
          ? { diasConcluir: dto.diasConcluir }
          : {}),
        ...(dto.esforcoPrevistoMin !== undefined
          ? { esforcoPrevistoMin: dto.esforcoPrevistoMin }
          : {}),
      },
      include: { etapas: true },
    });
  }

  // Configura uma célula da matriz (aplicável e/ou responsável). Upsert por
  // segurança, mesmo que as 9 etapas já venham semeadas na criação.
  async atualizarEtapa(id: string, dto: AtualizarEtapaDto) {
    await this.garantirExiste(id);
    const update: Prisma.TipoTarefaEtapaUncheckedUpdateInput = {};
    if (dto.aplicavel !== undefined) update.aplicavel = dto.aplicavel;
    if (dto.responsavelId !== undefined) {
      update.responsavelId = dto.responsavelId ? dto.responsavelId : null;
    }
    await this.prisma.tipoTarefaEtapa.upsert({
      where: { tipoTarefaId_etapa: { tipoTarefaId: id, etapa: dto.etapa } },
      update,
      create: {
        tipoTarefaId: id,
        etapa: dto.etapa,
        aplicavel: dto.aplicavel ?? true,
        responsavelId: dto.responsavelId ? dto.responsavelId : null,
      },
    });
    return this.obter(id);
  }

  async remover(id: string) {
    await this.garantirExiste(id);
    // As etapas são removidas em cascata (onDelete: Cascade no schema).
    await this.prisma.tipoTarefa.delete({ where: { id } });
    return { ok: true };
  }

  private async garantirExiste(id: string) {
    const t = await this.prisma.tipoTarefa.findUnique({ where: { id } });
    if (!t) throw new NotFoundException('Tipo de tarefa não encontrado.');
    return t;
  }
}
