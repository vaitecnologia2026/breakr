// Dashboard de Qualidade & Rework (M18).
// Agrega metricas sobre aprovacoes, avaliacoes dimensionais e historico de rework.
import { Injectable } from '@nestjs/common';
import { StatusConteudo } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class QualidadeService {
  constructor(private readonly prisma: PrismaService) {}

  // Painel de metricas: nps de qualidade, rework por origem, media dimensional.
  async dashboard() {
    const [
      totalAprovados,
      totalReworkExterno,
      totalReworkInterno,
      mediaDimensoes,
    ] = await Promise.all([
      this.prisma.conteudo.count({ where: { aprovadoEm: { not: null } } }),
      this.prisma.reworkLog.count({ where: { origem: 'EXTERNO' } }),
      this.prisma.reworkLog.count({ where: { origem: 'INTERNO' } }),
      this.prisma.avaliacao.aggregate({
        _avg: {
          qualidadeGrafica: true,
          qualidadeTexto: true,
          facilidadeAprovar: true,
        },
      }),
    ]);

    const taxaRework =
      totalAprovados + totalReworkExterno > 0
        ? (totalReworkExterno / (totalAprovados + totalReworkExterno)) * 100
        : 0;

    return {
      totalAprovados,
      totalReworkExterno,
      totalReworkInterno,
      taxaReworkPct: Math.round(taxaRework * 10) / 10,
      mediaQualidadeGrafica:
        mediaDimensoes._avg.qualidadeGrafica != null
          ? Math.round(mediaDimensoes._avg.qualidadeGrafica * 10) / 10
          : null,
      mediaQualidadeTexto:
        mediaDimensoes._avg.qualidadeTexto != null
          ? Math.round(mediaDimensoes._avg.qualidadeTexto * 10) / 10
          : null,
      mediaFacilidadeAprovar:
        mediaDimensoes._avg.facilidadeAprovar != null
          ? Math.round(mediaDimensoes._avg.facilidadeAprovar * 10) / 10
          : null,
    };
  }

  // Historico de rework com filtro por origem e paginacao simples.
  async listarRework(filtros: {
    origem?: 'EXTERNO' | 'INTERNO';
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, filtros.page ?? 1);
    const limit = Math.min(100, filtros.limit ?? 20);
    const skip = (page - 1) * limit;

    const where = filtros.origem ? { origem: filtros.origem } : {};

    const [total, itens] = await Promise.all([
      this.prisma.reworkLog.count({ where }),
      this.prisma.reworkLog.findMany({
        where,
        orderBy: { criadoEm: 'desc' },
        skip,
        take: limit,
        include: {
          conteudo: {
            select: {
              codigoUnico: true,
              titulo: true,
              tipo: true,
              cliente: { select: { nomeFantasia: true } },
            },
          },
        },
      }),
    ]);

    return { total, page, limit, itens };
  }

  // Carga por designer: conteudos ativos (PRODUCAO ou REVISAO) por responsavel.
  async cargaDesigner() {
    const grupos = await this.prisma.conteudo.groupBy({
      by: ['responsavelId'],
      where: {
        status: { in: [StatusConteudo.PRODUCAO, StatusConteudo.REVISAO] },
        responsavelId: { not: null },
      },
      _count: { id: true },
    });

    if (grupos.length === 0) return [];

    const ids = grupos.map((g) => g.responsavelId as string);
    const usuarios = await this.prisma.usuario.findMany({
      where: { id: { in: ids } },
      select: { id: true, nome: true },
    });

    const mapaUsuario = new Map(usuarios.map((u) => [u.id, u.nome]));

    return grupos
      .map((g) => ({
        responsavelId: g.responsavelId,
        nome: mapaUsuario.get(g.responsavelId as string) ?? 'Sem nome',
        pecasAtivas: g._count.id,
      }))
      .sort((a, b) => b.pecasAtivas - a.pecasAtivas);
  }
}
