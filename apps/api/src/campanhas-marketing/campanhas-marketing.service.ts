// Servico de campanhas de marketing (producao) — Briefing Marketing (Secao 3).
// Cada campanha reune materiais que percorrem o pipeline de status. Aditivo e
// isolado do dominio de trafego pago (model Campanha).
import { Injectable, NotFoundException } from '@nestjs/common';
import { StatusMaterial } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CodigoUnicoService } from '../common/codigo-unico/codigo-unico.service';
import { CriarCampanhaDto } from './dto/criar-campanha.dto';
import { AtualizarCampanhaDto } from './dto/atualizar-campanha.dto';
import { CriarMaterialDto } from './dto/criar-material.dto';
import { AtualizarMaterialDto } from './dto/atualizar-material.dto';

@Injectable()
export class CampanhasMarketingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly codigoUnico: CodigoUnicoService,
  ) {}

  private data(iso?: string): Date | undefined {
    return iso ? new Date(iso) : undefined;
  }

  // Lista campanhas com cliente/squad e a contagem de materiais por status.
  async listar() {
    const campanhas = await this.prisma.campanhaMarketing.findMany({
      orderBy: { criadoEm: 'desc' },
      include: {
        cliente: { select: { nomeFantasia: true } },
        squad: { select: { nome: true } },
        materiais: { select: { status: true } },
      },
    });
    return campanhas.map((c) => {
      const porStatus: Record<string, number> = {};
      for (const m of c.materiais) {
        porStatus[m.status] = (porStatus[m.status] ?? 0) + 1;
      }
      return {
        id: c.id,
        nome: c.nome,
        objetivo: c.objetivo,
        situacao: c.situacao,
        prazo: c.prazo,
        codigoUnico: c.codigoUnico,
        criadoEm: c.criadoEm,
        cliente: c.cliente?.nomeFantasia ?? null,
        clienteId: c.clienteId,
        squad: c.squad?.nome ?? null,
        squadId: c.squadId,
        totalMateriais: c.materiais.length,
        materiaisPorStatus: porStatus,
      };
    });
  }

  // Cria uma campanha de marketing (etapa Planejamento).
  criar(dto: CriarCampanhaDto) {
    return this.prisma.campanhaMarketing.create({
      data: {
        nome: dto.nome.trim(),
        objetivo: dto.objetivo,
        clienteId: dto.clienteId,
        squadId: dto.squadId,
        prazo: this.data(dto.prazo),
        codigoUnico: this.codigoUnico.gerar('CMP'),
      },
    });
  }

  // Detalhe da campanha com os materiais (pipeline) e o responsavel de cada um.
  async obter(id: string) {
    const campanha = await this.prisma.campanhaMarketing.findUnique({
      where: { id },
      include: {
        cliente: { select: { nomeFantasia: true } },
        squad: { select: { nome: true } },
        materiais: {
          orderBy: { criadoEm: 'asc' },
          include: { responsavel: { select: { id: true, nome: true } } },
        },
      },
    });
    if (!campanha) {
      throw new NotFoundException('Campanha nao encontrada');
    }
    return campanha;
  }

  // Atualiza campos da campanha (so os enviados).
  async atualizar(id: string, dto: AtualizarCampanhaDto) {
    await this.garantirCampanha(id);
    return this.prisma.campanhaMarketing.update({
      where: { id },
      data: {
        nome: dto.nome?.trim(),
        objetivo: dto.objetivo,
        situacao: dto.situacao,
        squadId: dto.squadId,
        prazo: dto.prazo !== undefined ? this.data(dto.prazo) : undefined,
      },
    });
  }

  // Remove a campanha (cascata: apaga seus materiais).
  async remover(id: string) {
    await this.garantirCampanha(id);
    await this.prisma.campanhaMarketing.delete({ where: { id } });
    return { ok: true };
  }

  // Adiciona um material (tarefa) a campanha — status inicial PLANEJADO.
  async adicionarMaterial(campanhaId: string, dto: CriarMaterialDto) {
    await this.garantirCampanha(campanhaId);
    return this.prisma.materialCampanha.create({
      data: {
        campanhaId,
        titulo: dto.titulo.trim(),
        tipo: dto.tipo,
        destino: dto.destino ?? 'TRAFEGO_PAGO',
        responsavelId: dto.responsavelId,
        prazo: this.data(dto.prazo),
      },
    });
  }

  // Atualiza um material — inclui a transicao de status do pipeline. Quando o
  // material volta para EM_AJUSTE (retrabalho), incrementa reworkCount.
  async atualizarMaterial(materialId: string, dto: AtualizarMaterialDto) {
    const atual = await this.prisma.materialCampanha.findUnique({
      where: { id: materialId },
      select: { status: true },
    });
    if (!atual) {
      throw new NotFoundException('Material nao encontrado');
    }
    const voltouParaAjuste =
      dto.status === StatusMaterial.EM_AJUSTE && atual.status !== StatusMaterial.EM_AJUSTE;
    return this.prisma.materialCampanha.update({
      where: { id: materialId },
      data: {
        titulo: dto.titulo?.trim(),
        tipo: dto.tipo,
        destino: dto.destino,
        status: dto.status,
        responsavelId: dto.responsavelId,
        prazo: dto.prazo !== undefined ? this.data(dto.prazo) : undefined,
        reworkCount: voltouParaAjuste ? { increment: 1 } : undefined,
      },
    });
  }

  // Remove um material da campanha.
  async removerMaterial(materialId: string) {
    const existe = await this.prisma.materialCampanha.findUnique({
      where: { id: materialId },
      select: { id: true },
    });
    if (!existe) {
      throw new NotFoundException('Material nao encontrado');
    }
    await this.prisma.materialCampanha.delete({ where: { id: materialId } });
    return { ok: true };
  }

  private async garantirCampanha(id: string) {
    const c = await this.prisma.campanhaMarketing.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!c) {
      throw new NotFoundException('Campanha nao encontrada');
    }
  }
}
