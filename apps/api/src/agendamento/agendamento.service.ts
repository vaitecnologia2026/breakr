// Servico do calendario de Agendamento (menu Comercial). Eventos por colaborador.
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CriarAgendamentoDto } from './dto/criar-agendamento.dto';
import { GoogleAgendaService } from './google-agenda.service';

const INCLUDE_RESPONSAVEL = {
  responsavel: { select: { id: true, nome: true, cargo: true, fotoUrl: true } },
} as const;

@Injectable()
export class AgendamentoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly googleAgenda: GoogleAgendaService,
  ) {}

  // Lista eventos, opcionalmente filtrando por intervalo [inicio, fim] (ISO).
  listar(inicioIso?: string, fimIso?: string) {
    const where: Prisma.AgendamentoWhereInput = {};
    if (inicioIso || fimIso) {
      const filtro: Prisma.DateTimeFilter = {};
      if (inicioIso) filtro.gte = new Date(inicioIso);
      if (fimIso) filtro.lte = new Date(fimIso);
      where.inicio = filtro;
    }
    return this.prisma.agendamento.findMany({
      where,
      orderBy: { inicio: 'asc' },
      include: INCLUDE_RESPONSAVEL,
    });
  }

  // Colaboradores (ativos) que aparecem como linhas do calendario.
  colaboradores() {
    return this.prisma.usuario.findMany({
      where: { ativo: true },
      orderBy: { nome: 'asc' },
      select: { id: true, nome: true, cargo: true, fotoUrl: true },
    });
  }

  private montarDados(dto: CriarAgendamentoDto): Prisma.AgendamentoUncheckedCreateInput {
    return {
      titulo: dto.titulo,
      inicio: new Date(dto.inicio),
      fim: new Date(dto.fim),
      tipo: dto.tipo ?? 'VIDEO',
      comCliente: dto.comCliente ?? false,
      local: dto.local ?? null,
      observacao: dto.observacao ?? null,
      cor: dto.cor ?? null,
      convidadosIds: dto.convidadosIds ?? [],
      responsavelId: dto.responsavelId,
    };
  }

  // Regra da sala: dois agendamentos PRESENCIAIS nao podem se sobrepor no tempo
  // (sala unica). Lanca 409 se houver conflito. `ignorarId` exclui o proprio
  // evento na edicao.
  private async garantirSalaLivre(inicio: Date, fim: Date, ignorarId?: string) {
    const conflito = await this.prisma.agendamento.findFirst({
      where: {
        tipo: 'PRESENCIAL',
        ...(ignorarId ? { id: { not: ignorarId } } : {}),
        inicio: { lt: fim },
        fim: { gt: inicio },
      },
      select: { id: true },
    });
    if (conflito) {
      throw new ConflictException('Sala de reuniao ocupada nesse horario por outro agendamento presencial.');
    }
  }

  // E-mails dos colaboradores convidados (para adicionar como participantes no Meet).
  private async emailsDosConvidados(ids: string[]): Promise<string[]> {
    if (!ids.length) return [];
    const usuarios = await this.prisma.usuario.findMany({
      where: { id: { in: ids } },
      select: { email: true },
    });
    return usuarios.map((u) => u.email).filter((e): e is string => !!e);
  }

  async criar(dto: CriarAgendamentoDto) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: dto.responsavelId },
      select: { id: true },
    });
    if (!usuario) throw new NotFoundException('Colaborador nao encontrado');
    if ((dto.tipo ?? 'VIDEO') === 'PRESENCIAL') {
      await this.garantirSalaLivre(new Date(dto.inicio), new Date(dto.fim));
    }
    const criado = await this.prisma.agendamento.create({
      data: this.montarDados(dto),
      include: INCLUDE_RESPONSAVEL,
    });

    // Evento de video (online): tenta gerar o link do Google Meet via Google
    // Agenda. Best-effort — se a integracao nao estiver configurada ou falhar,
    // o agendamento fica salvo normalmente (sem link).
    if ((dto.tipo ?? 'VIDEO') === 'VIDEO') {
      const meet = await this.googleAgenda.criarEventoMeet({
        titulo: criado.titulo,
        inicioIso: criado.inicio.toISOString(),
        fimIso: criado.fim.toISOString(),
        descricao: criado.observacao,
        attendees: await this.emailsDosConvidados(criado.convidadosIds),
      });
      if (meet?.meetLink) {
        return this.prisma.agendamento.update({
          where: { id: criado.id },
          data: { meetLink: meet.meetLink, googleEventId: meet.eventId, googleHtmlLink: meet.htmlLink },
          include: INCLUDE_RESPONSAVEL,
        });
      }
    }
    return criado;
  }

  async atualizar(id: string, dto: CriarAgendamentoDto) {
    const existe = await this.prisma.agendamento.findUnique({ where: { id }, select: { id: true } });
    if (!existe) throw new NotFoundException('Agendamento nao encontrado');
    if ((dto.tipo ?? 'VIDEO') === 'PRESENCIAL') {
      await this.garantirSalaLivre(new Date(dto.inicio), new Date(dto.fim), id);
    }
    return this.prisma.agendamento.update({
      where: { id },
      data: this.montarDados(dto),
      include: INCLUDE_RESPONSAVEL,
    });
  }

  async remover(id: string) {
    const existe = await this.prisma.agendamento.findUnique({ where: { id }, select: { id: true } });
    if (!existe) throw new NotFoundException('Agendamento nao encontrado');
    await this.prisma.agendamento.delete({ where: { id } });
    return { ok: true };
  }
}
