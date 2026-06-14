// Trafego pago (M17). CRUD de campanhas + métricas + IA ASSISTIVA: a IA sugere
// otimizações sobre as métricas; quem decide é o gestor (decisão travada do SOW).
// As métricas entram manualmente / por stub até a credencial Meta Ads chegar.
import { Injectable, NotFoundException } from '@nestjs/common';
import { Campanha, Prisma, StatusCampanha } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CodigoUnicoService } from '../common/codigo-unico/codigo-unico.service';
import { IaService } from '../ia/ia.service';
import { CriarCampanhaDto } from './dto/criar-campanha.dto';
import { AtualizarMetricasDto } from './dto/atualizar-metricas.dto';

const INCLUDE = { cliente: { select: { nomeFantasia: true } } } satisfies Prisma.CampanhaInclude;

@Injectable()
export class TrafegoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly codigoUnico: CodigoUnicoService,
    private readonly ia: IaService,
  ) {}

  criar(dto: CriarCampanhaDto): Promise<Campanha> {
    return this.prisma.campanha.create({
      data: {
        clienteId: dto.clienteId,
        nome: dto.nome,
        objetivo: dto.objetivo,
        status: StatusCampanha.RASCUNHO,
        orcamentoDiario:
          dto.orcamentoDiario !== undefined ? new Prisma.Decimal(dto.orcamentoDiario) : undefined,
        codigoUnico: this.codigoUnico.gerar('CAM'),
      },
      include: INCLUDE,
    });
  }

  listar(filtro?: { clienteId?: string; status?: StatusCampanha }): Promise<Campanha[]> {
    return this.prisma.campanha.findMany({
      where: { clienteId: filtro?.clienteId, status: filtro?.status },
      include: INCLUDE,
      orderBy: { criadoEm: 'desc' },
    });
  }

  async obter(id: string): Promise<Campanha & { cliente: { nomeFantasia: string } }> {
    const campanha = await this.prisma.campanha.findUnique({ where: { id }, include: INCLUDE });
    if (!campanha) {
      throw new NotFoundException('Campanha nao encontrada');
    }
    return campanha;
  }

  async atualizarMetricas(id: string, dto: AtualizarMetricasDto): Promise<Campanha> {
    await this.obter(id);
    return this.prisma.campanha.update({
      where: { id },
      data: {
        impressoes: dto.impressoes,
        cliques: dto.cliques,
        conversoes: dto.conversoes,
        gasto: dto.gasto !== undefined ? new Prisma.Decimal(dto.gasto) : undefined,
      },
      include: INCLUDE,
    });
  }

  async moverStatus(id: string, status: StatusCampanha): Promise<Campanha> {
    await this.obter(id);
    return this.prisma.campanha.update({ where: { id }, data: { status }, include: INCLUDE });
  }

  /**
   * IA assistiva: pede ao provedor ativo sugestões de otimização sobre as
   * métricas. Degrada com elegância se a IA não estiver configurada (aviso).
   */
  async sugerir(id: string): Promise<{ sugestoes: string | null; aviso?: string }> {
    const c = await this.obter(id);
    if (!(await this.ia.disponivel())) {
      return {
        sugestoes: null,
        aviso: 'IA não configurada. Ative e informe a chave de um provedor em Configurações.',
      };
    }

    const ctr = c.impressoes > 0 ? ((c.cliques / c.impressoes) * 100).toFixed(2) : 'n/d';
    const cpa =
      c.conversoes > 0 && c.gasto ? (Number(c.gasto) / c.conversoes).toFixed(2) : 'n/d';
    const prompt =
      `Você é um gestor de tráfego sênior de uma agência. Analise esta campanha de ` +
      `Meta Ads e dê de 3 a 5 sugestões objetivas de otimização, em português, em tópicos curtos.\n` +
      `Cliente: ${c.cliente.nomeFantasia}\n` +
      `Campanha: ${c.nome} (objetivo: ${c.objetivo ?? 'não informado'})\n` +
      `Orçamento diário: R$ ${c.orcamentoDiario?.toString() ?? 'n/d'}\n` +
      `Métricas: ${c.impressoes} impressões, ${c.cliques} cliques (CTR ${ctr}%), ` +
      `${c.conversoes} conversões, gasto R$ ${c.gasto?.toString() ?? '0'} (CPA R$ ${cpa}).\n` +
      `Responda apenas com as sugestões, sem preâmbulo.`;

    try {
      const sugestoes = await this.ia.completar(prompt);
      await this.prisma.campanha.update({ where: { id }, data: { sugestoesIa: sugestoes } });
      return { sugestoes };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { sugestoes: null, aviso: `Não foi possível gerar sugestões: ${msg.slice(0, 160)}` };
    }
  }
}
