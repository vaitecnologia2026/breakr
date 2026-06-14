// Trafego pago (M17). CRUD de campanhas + métricas + IA ASSISTIVA: a IA sugere
// otimizações sobre as métricas; quem decide é o gestor (decisão travada do SOW).
// As métricas entram manualmente / por stub até a credencial Meta Ads chegar.
// gerarRelatorio(): equivale ao n8n "[Reportei] Envio de Relatórios pelo WhatsApp" —
//   agrega campanhas do cliente, gera resumo via IA, envia para o grupo WA do cliente.
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Campanha, Prisma, StatusCampanha } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CodigoUnicoService } from '../common/codigo-unico/codigo-unico.service';
import { IaService } from '../ia/ia.service';
import { WHATSAPP_PORT, WhatsappPort } from '../integracoes';
import { CriarCampanhaDto } from './dto/criar-campanha.dto';
import { AtualizarMetricasDto } from './dto/atualizar-metricas.dto';

const INCLUDE = { cliente: { select: { nomeFantasia: true } } } satisfies Prisma.CampanhaInclude;

@Injectable()
export class TrafegoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly codigoUnico: CodigoUnicoService,
    private readonly ia: IaService,
    @Inject(WHATSAPP_PORT) private readonly whatsapp: WhatsappPort,
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

  /**
   * Gera e envia o relatório mensal de campanhas do cliente via WhatsApp.
   * Equivale ao n8n "[Reportei] Envio de Relatórios pelo WhatsApp":
   *   agrega métricas → IA redige o texto → envia para o grupo WA do cliente.
   * Degrada graciosamente: sem IA entrega resumo em texto simples;
   * sem grupo WA retorna o relatório mas avisa que não foi enviado.
   */
  async gerarRelatorio(
    clienteId: string,
  ): Promise<{ relatorio: string | null; enviado: boolean; aviso?: string }> {
    const cliente = await this.prisma.cliente.findUnique({
      where: { id: clienteId },
      select: { nomeFantasia: true, whatsappGrupoId: true },
    });
    if (!cliente) throw new NotFoundException('Cliente nao encontrado');

    const campanhas = await this.prisma.campanha.findMany({
      where: {
        clienteId,
        status: { in: [StatusCampanha.ATIVA, StatusCampanha.PAUSADA, StatusCampanha.ENCERRADA] },
      },
      orderBy: { criadoEm: 'desc' },
      take: 10,
    });

    const totalImpressoes = campanhas.reduce((s, c) => s + c.impressoes, 0);
    const totalCliques = campanhas.reduce((s, c) => s + c.cliques, 0);
    const totalConversoes = campanhas.reduce((s, c) => s + c.conversoes, 0);
    const totalGasto = campanhas.reduce((s, c) => s + Number(c.gasto ?? 0), 0);
    const ctr = totalImpressoes > 0 ? ((totalCliques / totalImpressoes) * 100).toFixed(1) : '0';

    const linhasCampanhas =
      campanhas.length > 0
        ? campanhas.map(
            (c) =>
              `- ${c.nome}: ${c.impressoes} impressoes, ${c.cliques} cliques, ` +
              `${c.conversoes} conversoes, R$ ${Number(c.gasto ?? 0).toFixed(2)} gasto`,
          )
        : ['(sem campanhas no periodo)'];

    const resumoPadrao =
      `Relatorio de campanhas — ${cliente.nomeFantasia}\n\n` +
      linhasCampanhas.join('\n') +
      `\n\nTotal: ${totalImpressoes} impressoes, ${totalCliques} cliques ` +
      `(CTR ${ctr}%), ${totalConversoes} conversoes, R$ ${totalGasto.toFixed(2)} investido.`;

    let relatorio = resumoPadrao;
    let aviso: string | undefined;

    if (await this.ia.disponivel()) {
      try {
        const prompt =
          `Você é um analista de marketing digital de uma agência. Gere um relatório ` +
          `mensal em texto corrido, em português, de 3 a 5 parágrafos curtos, destacando ` +
          `os principais resultados e uma recomendação principal para o próximo período.\n\n` +
          `Cliente: ${cliente.nomeFantasia}\n` +
          `Campanhas:\n${linhasCampanhas.join('\n')}\n\n` +
          `Totais: ${totalImpressoes} impressões, ${totalCliques} cliques (CTR ${ctr}%), ` +
          `${totalConversoes} conversões, R$ ${totalGasto.toFixed(2)} investido.\n` +
          `Responda apenas com o relatório, sem preâmbulo.`;
        relatorio = await this.ia.completar(prompt);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        aviso = `IA indisponivel — relatorio gerado sem narrador: ${msg.slice(0, 120)}`;
        relatorio = resumoPadrao;
      }
    } else {
      aviso = 'IA nao configurada — relatorio gerado sem narrador. Configure em Configuracoes.';
    }

    let enviado = false;
    if (cliente.whatsappGrupoId) {
      try {
        await this.whatsapp.enviarMensagem({
          destino: cliente.whatsappGrupoId,
          texto: relatorio,
        });
        enviado = true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        aviso = (aviso ? aviso + ' | ' : '') + `WhatsApp: ${msg.slice(0, 120)}`;
      }
    } else {
      aviso = (aviso ? aviso + ' | ' : '') + 'Cliente sem grupo WhatsApp cadastrado.';
    }

    return { relatorio, enviado, aviso };
  }
}
