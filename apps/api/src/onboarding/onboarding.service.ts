// Servico de onboarding gamificado (M14). Liberado apos o pagamento da 1a
// fatura: cria o checklist do cliente e move o cliente para ONBOARD; quando
// todas as etapas sao concluidas, o cliente vira ATIVO.
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Onboarding } from '@prisma/client';
import { ClienteStatus } from '@breakr/shared';
import { PrismaService } from '../prisma/prisma.service';
import { GOOGLE_MEET_PORT, GoogleMeetPort } from '../integracoes';
import { CriarAulaDto } from './dto/criar-aula.dto';
import { AtualizarAulaDto } from './dto/atualizar-aula.dto';
import { CriarEventoDto } from './dto/criar-evento.dto';
import { AtualizarEtapaDto } from './dto/atualizar-etapa.dto';
import { CriarEtapaOnboardingDto } from './dto/criar-etapa-onboarding.dto';
import { CriarChecklistModeloDto } from './dto/criar-checklist-modelo.dto';
import { AtualizarInfoEmpresaDto } from './dto/atualizar-info-empresa.dto';

// Etapas padrao do onboarding (ordem fixa do checklist gamificado).
// Alinhadas aos 6 processos do fluxo real de onboarding (workflow n8n
// "Liberar Onboarding Apos Pagamento" / checklist 6.5).
const ETAPAS_PADRAO: Array<{ ordem: number; titulo: string }> = [
  { ordem: 1, titulo: 'Alinhamento de expectativa (ligação)' },
  { ordem: 2, titulo: 'Briefing (Meet)' },
  { ordem: 3, titulo: 'Coleta de acessos (Meet)' },
  { ordem: 4, titulo: 'Cadastro no Hub' },
  { ordem: 5, titulo: 'Produção de materiais' },
  { ordem: 6, titulo: 'Instalar integrações' },
];

@Injectable()
export class OnboardingService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(GOOGLE_MEET_PORT) private readonly meet: GoogleMeetPort,
  ) {}

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

  // Adiciona um item PERSONALIZADO ao checklist do cliente (ex.: agendamentos
  // criados pela CS: "Agendar reuniao", "Agendar apresentacao da proposta
  // comercial"). O item entra ao final da lista, marcado como personalizado
  // (removivel), e o progresso e recalculado. Nao altera o status do cliente.
  async criarEtapa(
    clienteId: string,
    dto: CriarEtapaOnboardingDto,
  ): Promise<Onboarding> {
    let onboarding = await this.prisma.onboarding.findUnique({
      where: { clienteId },
      include: { etapas: true },
    });
    if (!onboarding) {
      // Cliente ainda sem onboarding: inicia pelo MESMO caminho validado — criar()
      // e idempotente e ja usado pelo fluxo de pagamento (cria as 6 etapas padrao
      // e move o cliente para ONBOARD). Assim, agendar antes do onboarding "abre"
      // o checklist do cliente em vez de dar 404, sem divergir do fluxo oficial.
      await this.criar(clienteId);
      onboarding = await this.prisma.onboarding.findUnique({
        where: { clienteId },
        include: { etapas: true },
      });
    }
    if (!onboarding) {
      throw new NotFoundException('Onboarding do cliente nao encontrado');
    }
    const proximaOrdem =
      onboarding.etapas.reduce((max, e) => (e.ordem > max ? e.ordem : max), 0) + 1;

    return this.prisma.$transaction(async (tx) => {
      await tx.onboardingStep.create({
        data: {
          onboardingId: onboarding.id,
          titulo: dto.titulo.trim(),
          descricao: dto.descricao?.trim() || null,
          ordem: proximaOrdem,
          concluido: false,
          personalizado: true,
        },
      });
      // Recalcula o progresso a partir das etapas atuais (mesma regra do concluir).
      const etapas = await tx.onboardingStep.findMany({
        where: { onboardingId: onboarding.id },
      });
      const total = etapas.length;
      const concluidas = etapas.filter((e) => e.concluido).length;
      const progresso = total === 0 ? 0 : Math.round((concluidas / total) * 100);
      const concluido = total > 0 && concluidas === total;
      return tx.onboarding.update({
        where: { id: onboarding.id },
        data: { progresso, concluido },
        include: { etapas: { orderBy: { ordem: 'asc' } } },
      });
    });
  }

  // Remove um item do checklist (qualquer item — o usuario controla o checklist).
  // Recalcula o progresso. Nao altera o status do cliente.
  async removerEtapa(stepId: string): Promise<Onboarding> {
    const etapa = await this.prisma.onboardingStep.findUnique({
      where: { id: stepId },
    });
    if (!etapa) {
      throw new NotFoundException('Etapa de onboarding nao encontrada');
    }
    const onboardingId = etapa.onboardingId;
    return this.prisma.$transaction(async (tx) => {
      await tx.onboardingStep.delete({ where: { id: stepId } });
      const etapas = await tx.onboardingStep.findMany({
        where: { onboardingId },
      });
      const total = etapas.length;
      const concluidas = etapas.filter((e) => e.concluido).length;
      const progresso = total === 0 ? 0 : Math.round((concluidas / total) * 100);
      const concluido = total > 0 && concluidas === total;
      return tx.onboarding.update({
        where: { id: onboardingId },
        data: { progresso, concluido },
        include: { etapas: { orderBy: { ordem: 'asc' } } },
      });
    });
  }

  // Salva as informacoes da empresa que esta sendo onboardada (texto livre no
  // checklist do cliente, alem de marcar as etapas). Nao altera etapas nem
  // status do cliente; apenas grava o campo. Requer onboarding existente.
  async salvarInfoEmpresa(
    clienteId: string,
    dto: AtualizarInfoEmpresaDto,
  ): Promise<Onboarding> {
    const onboarding = await this.prisma.onboarding.findUnique({
      where: { clienteId },
    });
    if (!onboarding) {
      throw new NotFoundException('Onboarding do cliente nao encontrado');
    }
    return this.prisma.onboarding.update({
      where: { clienteId },
      data: { infoEmpresa: dto.infoEmpresa?.trim() || null },
      include: { etapas: { orderBy: { ordem: 'asc' } } },
    });
  }

  // --- Modelos (templates) de checklist reutilizaveis ---
  // Catalogo global: a CS cria varios modelos e os aplica ao onboarding de cada
  // cliente. Nao altera o checklist padrao (ETAPAS_PADRAO) nem o fluxo validado.
  listarChecklistModelos() {
    return this.prisma.checklistModelo.findMany({
      include: { itens: { orderBy: { ordem: 'asc' } } },
      orderBy: { criadoEm: 'asc' },
    });
  }

  criarChecklistModelo(dto: CriarChecklistModeloDto) {
    return this.prisma.checklistModelo.create({
      data: {
        nome: dto.nome.trim(),
        itens: {
          create: dto.itens.map((titulo, i) => ({
            titulo: titulo.trim(),
            ordem: i,
          })),
        },
      },
      include: { itens: { orderBy: { ordem: 'asc' } } },
    });
  }

  async removerChecklistModelo(modeloId: string) {
    const modelo = await this.prisma.checklistModelo.findUnique({
      where: { id: modeloId },
    });
    if (!modelo) throw new NotFoundException('Modelo de checklist nao encontrado');
    await this.prisma.checklistModelo.delete({ where: { id: modeloId } });
    return { ok: true };
  }

  // Aplica um modelo ao onboarding do cliente: adiciona os itens do modelo como
  // etapas PERSONALIZADAS (removiveis) ao final do checklist e recalcula o
  // progresso. Se o cliente ainda nao tem onboarding, inicia pelo mesmo caminho
  // validado criar() (idempotente, como no fluxo de pagamento). Nao altera o
  // checklist padrao nem os itens ja existentes.
  async aplicarChecklistModelo(
    clienteId: string,
    modeloId: string,
  ): Promise<Onboarding> {
    const modelo = await this.prisma.checklistModelo.findUnique({
      where: { id: modeloId },
      include: { itens: { orderBy: { ordem: 'asc' } } },
    });
    if (!modelo) throw new NotFoundException('Modelo de checklist nao encontrado');

    let onboarding = await this.prisma.onboarding.findUnique({
      where: { clienteId },
      include: { etapas: true },
    });
    if (!onboarding) {
      await this.criar(clienteId);
      onboarding = await this.prisma.onboarding.findUnique({
        where: { clienteId },
        include: { etapas: true },
      });
    }
    if (!onboarding) {
      throw new NotFoundException('Onboarding do cliente nao encontrado');
    }
    const onb = onboarding;
    const baseOrdem =
      onb.etapas.reduce((max, e) => (e.ordem > max ? e.ordem : max), 0) + 1;

    return this.prisma.$transaction(async (tx) => {
      await tx.onboardingStep.createMany({
        data: modelo.itens.map((item, i) => ({
          onboardingId: onb.id,
          titulo: item.titulo,
          ordem: baseOrdem + i,
          concluido: false,
          personalizado: true,
        })),
      });
      const etapas = await tx.onboardingStep.findMany({
        where: { onboardingId: onb.id },
      });
      const total = etapas.length;
      const concluidas = etapas.filter((e) => e.concluido).length;
      const progresso = total === 0 ? 0 : Math.round((concluidas / total) * 100);
      const concluido = total > 0 && concluidas === total;
      return tx.onboarding.update({
        where: { id: onb.id },
        data: { progresso, concluido },
        include: { etapas: { orderBy: { ordem: 'asc' } } },
      });
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

    // Gera o link do Google Meet quando solicitado (stub até a credencial entrar).
    let meetLink: string | undefined;
    if (dto.gerarMeet) {
      const r = await this.meet.criarMeet({
        titulo: dto.titulo,
        inicio: new Date(dto.data).toISOString(),
        convidados: dto.convidados,
      });
      meetLink = r.meetLink;
    }

    return this.prisma.onboardingEvento.create({
      data: {
        clienteId,
        titulo: dto.titulo,
        descricao: dto.descricao,
        data: new Date(dto.data),
        oQueLevar: dto.oQueLevar,
        meetLink,
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
