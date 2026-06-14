// Servico de projetos — auto-criacao a partir do plano do cliente (M15).
// Os projetos (ate 3: MARKETING/GESTAO/FINANCEIRO) sao criados quando o
// pagamento da 1a fatura libera o cliente. A criacao e idempotente: o
// @@unique([clienteId, tipo]) garante 1 projeto por tipo por cliente.
import { Injectable } from '@nestjs/common';
import { Projeto } from '@prisma/client';
import { TipoProjeto } from '@breakr/shared';
import { PrismaService } from '../prisma/prisma.service';
import { CodigoUnicoService } from '../common/codigo-unico/codigo-unico.service';

@Injectable()
export class ProjetosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly codigoUnico: CodigoUnicoService,
  ) {}

  // Rotulo amigavel do tipo de projeto (usado no nome exibido).
  private rotulo(tipo: TipoProjeto): string {
    switch (tipo) {
      case TipoProjeto.MARKETING:
        return 'Marketing';
      case TipoProjeto.GESTAO:
        return 'Gestão';
      case TipoProjeto.FINANCEIRO:
        return 'Financeiro';
      default:
        return String(tipo);
    }
  }

  // Cria (idempotente) os projetos definidos no plano do cliente e retorna
  // todos os projetos dele. Sem plano ou sem tiposProjeto -> nada a fazer.
  async criarProjetosDoPlano(clienteId: string): Promise<Projeto[]> {
    const cliente = await this.prisma.cliente.findUnique({
      where: { id: clienteId },
      include: { plano: true },
    });

    // Sem cliente, sem plano ou plano sem tipos -> retorna a lista atual (vazia).
    const tipos = cliente?.plano?.tiposProjeto ?? [];
    if (!cliente || tipos.length === 0) {
      return [];
    }

    // upsert por tipo: o @@unique([clienteId, tipo]) torna a operacao segura
    // mesmo se a liberacao do cliente rodar mais de uma vez.
    for (const tipo of tipos) {
      await this.prisma.projeto.upsert({
        where: { clienteId_tipo: { clienteId, tipo } },
        // Ja existe -> nao mexe (idempotencia).
        update: {},
        create: {
          clienteId,
          tipo,
          // cast: tipo vem do enum do Prisma; rotulo usa o enum do @breakr/shared
          // (mesmos valores). Veja nota de enums shared-vs-prisma no escopo.
          nome: `${this.rotulo(tipo as never)} — ${cliente.nomeFantasia}`,
          codigoUnico: this.codigoUnico.gerar('PRJ'),
        },
      });
    }

    return this.listarPorCliente(clienteId);
  }

  // Lista todos os projetos (mais recentes primeiro).
  listar(): Promise<Projeto[]> {
    return this.prisma.projeto.findMany({
      orderBy: { criadoEm: 'desc' },
      include: { cliente: { select: { nomeFantasia: true } } },
    });
  }

  // Lista os projetos de um cliente (mais recentes primeiro).
  listarPorCliente(clienteId: string): Promise<Projeto[]> {
    return this.prisma.projeto.findMany({
      where: { clienteId },
      orderBy: { criadoEm: 'desc' },
    });
  }
}
