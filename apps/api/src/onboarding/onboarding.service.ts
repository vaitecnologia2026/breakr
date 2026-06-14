// Servico de onboarding gamificado (M14). Liberado apos o pagamento da 1a
// fatura: cria o checklist do cliente e move o cliente para ONBOARD; quando
// todas as etapas sao concluidas, o cliente vira ATIVO.
import { Injectable, NotFoundException } from '@nestjs/common';
import { Onboarding } from '@prisma/client';
import { ClienteStatus } from '@breakr/shared';
import { PrismaService } from '../prisma/prisma.service';

// Etapas padrao do onboarding (ordem fixa do checklist gamificado).
const ETAPAS_PADRAO: Array<{ ordem: number; titulo: string }> = [
  { ordem: 1, titulo: 'Preencher briefing da marca' },
  { ordem: 2, titulo: 'Enviar acessos (Instagram, Meta, site)' },
  { ordem: 3, titulo: 'Aprovar identidade e tom de voz' },
  { ordem: 4, titulo: 'Reunião de kickoff com o squad' },
  { ordem: 5, titulo: 'Definir metas e orçamento do mês' },
];

@Injectable()
export class OnboardingService {
  constructor(private readonly prisma: PrismaService) {}

  // Cria o onboarding do cliente (idempotente). Se ja existir, devolve o atual.
  // Tambem move o cliente para ONBOARD (entrou no fluxo de ativacao).
  async criar(clienteId: string): Promise<Onboarding> {
    const existente = await this.prisma.onboarding.findUnique({
      where: { clienteId },
      include: { etapas: { orderBy: { ordem: 'asc' } } },
    });
    if (existente) {
      return existente;
    }

    // Cria onboarding + etapas (nested create) e ja avanca o status do cliente.
    const onboarding = await this.prisma.onboarding.create({
      data: {
        clienteId,
        progresso: 0,
        concluido: false,
        etapas: {
          create: ETAPAS_PADRAO.map((e) => ({
            ordem: e.ordem,
            titulo: e.titulo,
            concluido: false,
          })),
        },
      },
      include: { etapas: { orderBy: { ordem: 'asc' } } },
    });

    // Cliente entra na fase de onboarding. cast: enum do shared == enum Prisma.
    await this.prisma.cliente.update({
      where: { id: clienteId },
      data: { status: ClienteStatus.ONBOARD as never },
    });

    return onboarding;
  }

  // Onboarding do cliente (com etapas ordenadas) ou null se nao houver.
  obterPorCliente(clienteId: string): Promise<Onboarding | null> {
    return this.prisma.onboarding.findUnique({
      where: { clienteId },
      include: { etapas: { orderBy: { ordem: 'asc' } } },
    });
  }

  // Marca uma etapa como concluida, recalcula o progresso (0..100) e, quando
  // todas as etapas terminam, conclui o onboarding e ativa o cliente.
  async concluirEtapa(stepId: string): Promise<Onboarding> {
    const etapa = await this.prisma.onboardingStep.findUnique({
      where: { id: stepId },
    });
    if (!etapa) {
      throw new NotFoundException('Etapa de onboarding nao encontrada');
    }

    await this.prisma.onboardingStep.update({
      where: { id: stepId },
      data: { concluido: true },
    });

    // Recalcula progresso a partir das etapas do mesmo onboarding.
    const etapas = await this.prisma.onboardingStep.findMany({
      where: { onboardingId: etapa.onboardingId },
    });
    const total = etapas.length;
    const concluidas = etapas.filter((e) => e.concluido).length;
    const progresso = total === 0 ? 0 : Math.round((concluidas / total) * 100);
    const concluido = total > 0 && concluidas === total;

    const onboarding = await this.prisma.onboarding.update({
      where: { id: etapa.onboardingId },
      data: { progresso, concluido },
      include: { etapas: { orderBy: { ordem: 'asc' } } },
    });

    // Onboarding 100% -> cliente vira ATIVO. cast: enum do shared == enum Prisma.
    if (concluido) {
      await this.prisma.cliente.update({
        where: { id: onboarding.clienteId },
        data: { status: ClienteStatus.ATIVO as never },
      });
    }

    return onboarding;
  }
}
