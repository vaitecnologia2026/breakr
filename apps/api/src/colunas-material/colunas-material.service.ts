// Servico das colunas do board de Campanhas de Marketing (config GLOBAL).
// As 9 do nucleo (nucleo=true) sao as etapas validadas (mesmas chaves/rotulos do
// enum StatusMaterial original) — podem ser renomeadas/reordenadas/ocultadas, mas
// NAO excluidas (retrabalho/metricas/portal dependem dessas chaves). Colunas novas
// (nucleo=false) tem CRUD livre. `chave` e o valor gravado em MaterialCampanha.status.
import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CriarColunaDto } from './dto/criar-coluna.dto';
import { AtualizarColunaDto } from './dto/atualizar-coluna.dto';

// Ordem e rotulos identicos ao board original (Briefing Marketing — Secao 3).
const NUCLEO: { chave: string; rotulo: string }[] = [
  { chave: 'PLANEJADO', rotulo: 'Planejado' },
  { chave: 'EM_COPY', rotulo: 'Em Copy' },
  { chave: 'COPY_CONCLUIDA', rotulo: 'Copy Concluída' },
  { chave: 'EM_DESIGN', rotulo: 'Em Design' },
  { chave: 'AGUARDANDO_APROVACAO', rotulo: 'Aguard. Aprovação' },
  { chave: 'APROVADO', rotulo: 'Aprovado' },
  { chave: 'EM_AJUSTE', rotulo: 'Em Ajuste' },
  { chave: 'ATIVO_TRAFEGO', rotulo: 'Ativo no Tráfego' },
  { chave: 'CONCLUIDO', rotulo: 'Concluído' },
];

@Injectable()
export class ColunasMaterialService {
  constructor(private readonly prisma: PrismaService) {}

  // Semeia as 9 colunas do nucleo (idempotente) na 1a listagem.
  private async garantirNucleo(): Promise<void> {
    const qtd = await this.prisma.colunaMaterial.count({ where: { nucleo: true } });
    if (qtd > 0) return;
    await this.prisma.colunaMaterial.createMany({
      data: NUCLEO.map((c, i) => ({ chave: c.chave, rotulo: c.rotulo, ordem: i, nucleo: true })),
      skipDuplicates: true,
    });
  }

  // Lista as colunas do board, ordenadas. Qualquer autenticado pode ler.
  async listar() {
    await this.garantirNucleo();
    return this.prisma.colunaMaterial.findMany({ orderBy: { ordem: 'asc' } });
  }

  // Cria uma coluna customizada (vai para o fim do board).
  async criar(dto: CriarColunaDto) {
    await this.garantirNucleo();
    const ultima = await this.prisma.colunaMaterial.findFirst({
      orderBy: { ordem: 'desc' },
      select: { ordem: true },
    });
    const ordem = (ultima?.ordem ?? -1) + 1;
    return this.prisma.colunaMaterial.create({
      data: {
        chave: `CUSTOM_${randomUUID().slice(0, 8).toUpperCase()}`,
        rotulo: dto.rotulo.trim(),
        ordem,
        nucleo: false,
      },
    });
  }

  // Atualiza rotulo/ordem/oculta (permitido tambem para o nucleo).
  async atualizar(id: string, dto: AtualizarColunaDto) {
    await this.obter(id);
    return this.prisma.colunaMaterial.update({
      where: { id },
      data: {
        rotulo: dto.rotulo?.trim(),
        ordem: dto.ordem,
        oculta: dto.oculta,
      },
    });
  }

  // Exclui uma coluna (qualquer uma, inclusive as do nucleo). Os materiais que estao
  // nela sao movidos para outra coluna existente (PLANEJADO se houver; senao a primeira
  // por ordem) para nao ficarem orfaos — tudo numa transacao.
  async remover(id: string) {
    const col = await this.obter(id);
    const outras = await this.prisma.colunaMaterial.findMany({
      where: { id: { not: id } },
      orderBy: { ordem: 'asc' },
      select: { chave: true },
    });
    const destino = outras.find((c) => c.chave === 'PLANEJADO')?.chave ?? outras[0]?.chave;
    await this.prisma.$transaction([
      ...(destino
        ? [
            this.prisma.materialCampanha.updateMany({
              where: { status: col.chave },
              data: { status: destino },
            }),
          ]
        : []),
      this.prisma.colunaMaterial.delete({ where: { id } }),
    ]);
    return { ok: true };
  }

  private async obter(id: string) {
    const col = await this.prisma.colunaMaterial.findUnique({ where: { id } });
    if (!col) {
      throw new NotFoundException('Coluna não encontrada');
    }
    return col;
  }
}
