// Servico de onboarding gamificado (M14). Liberado apos o pagamento da 1a
// fatura: cria o checklist do cliente e move o cliente para ONBOARD; quando
// todas as etapas sao concluidas, o cliente vira ATIVO.
import { Injectable, NotFoundException } from '@nestjs/common';
import { Onboarding } from '@prisma/client';
import { ClienteStatus } from '@breakr/shared';
import { PrismaService } from '../prisma/prisma.service';
import { CriarAulaDto } from './dto/criar-aula.dto';
import { AtualizarAulaDto } from './dto/atualizar-aula.dto';
import { CriarEventoDto } from './dto/criar-evento.dto';
import { AtualizarEtapaDto } from './dto/atualizar-etapa.dto';

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

    // Cria onboarding + etapas (nested create) e avanca o status do cliente
    // de forma atomica (sem isto, uma falha no update do cliente deixaria o
    // onboarding criado mas o cliente fora da fase ONBOARD).
    return this.prisma.$transaction(async (tx) => {
      const onboarding = await tx.onboarding.create({
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
      await tx.cliente.update({
        where: { id: clienteId },
        data: { status: ClienteStatus.ONBOARD as never },
      });

      return onboarding;
    });
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

    // Atualiza a etapa, recalcula o progresso e, se concluido, ativa o cliente —
    // tudo na mesma transacao para evitar progresso/status inconsistentes.
    return this.prisma.$transaction(async (tx) => {
      await tx.onboardingStep.update({
        where: { id: stepId },
        data: { concluido: true },
      });

      // Recalcula progresso a partir das etapas do mesmo onboarding.
      const etapas = await tx.onboardingStep.findMany({
        where: { onboardingId: etapa.onboardingId },
      });
      const total = etapas.length;
      const concluidas = etapas.filter((e) => e.concluido).length;
      const progresso = total === 0 ? 0 : Math.round((concluidas / total) * 100);
      const concluido = total > 0 && concluidas === total;

      const onboarding = await tx.onboarding.update({
        where: { id: etapa.onboardingId },
        data: { progresso, concluido },
        include: { etapas: { orderBy: { ordem: 'asc' } } },
      });

      // Onboarding 100% -> cliente vira ATIVO. cast: enum do shared == enum Prisma.
      if (concluido) {
        await tx.cliente.update({
          where: { id: onboarding.clienteId },
          data: { status: ClienteStatus.ATIVO as never },
        });
      }

      return onboarding;
    });
  }

  // --- Edicao de etapa (titulo/descricao/link) ---
  async atualizarEtapa(stepId: string, dto: AtualizarEtapaDto) {
    const etapa = await this.prisma.onboardingStep.findUnique({ where: { id: stepId } });
    if (!etapa) throw new NotFoundException('Etapa de onboarding nao encontrada');
    return this.prisma.onboardingStep.update({
      where: { id: stepId },
      data: { titulo: dto.titulo, descricao: dto.descricao, link: dto.link },
    });
  }

  // --- Agenda de eventos do cliente (coleta de dados, reunioes...) ---
  async listarEventos(clienteId: string) {
    return this.prisma.onboardingEvento.findMany({
      where: { clienteId },
      orderBy: { data: 'asc' },
    });
  }

  async criarEvento(clienteId: string, dto: CriarEventoDto) {
    const cliente = await this.prisma.cliente.findUnique({
      where: { id: clienteId },
      select: { id: true },
    });
    if (!cliente) throw new NotFoundException('Cliente nao encontrado');
    return this.prisma.onboardingEvento.create({
      data: {
        clienteId,
        titulo: dto.titulo,
        descricao: dto.descricao,
        data: new Date(dto.data),
        oQueLevar: dto.oQueLevar,
      },
    });
  }

  async removerEvento(eventoId: string) {
    const evento = await this.prisma.onboardingEvento.findUnique({ where: { id: eventoId } });
    if (!evento) throw new NotFoundException('Evento nao encontrado');
    await this.prisma.onboardingEvento.delete({ where: { id: eventoId } });
    return { ok: true };
  }

  // --- Catalogo de aulas do onboarding educativo ---
  listarAulas() {
    return this.prisma.aula.findMany({ orderBy: { ordem: 'asc' } });
  }

  criarAula(dto: CriarAulaDto) {
    return this.prisma.aula.create({
      data: {
        titulo: dto.titulo,
        descricao: dto.descricao,
        videoUrl: dto.videoUrl,
        ordem: dto.ordem ?? 0,
        ativo: dto.ativo ?? true,
      },
    });
  }

  async atualizarAula(id: string, dto: AtualizarAulaDto) {
    const aula = await this.prisma.aula.findUnique({ where: { id } });
    if (!aula) throw new NotFoundException('Aula nao encontrada');
    return this.prisma.aula.update({
      where: { id },
      data: {
        titulo: dto.titulo,
        descricao: dto.descricao,
        videoUrl: dto.videoUrl,
        ordem: dto.ordem,
        ativo: dto.ativo,
      },
    });
  }

  async removerAula(id: string) {
    const aula = await this.prisma.aula.findUnique({ where: { id } });
    if (!aula) throw new NotFoundException('Aula nao encontrada');
    await this.prisma.aula.delete({ where: { id } });
    return { ok: true };
  }
}
