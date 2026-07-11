// Servico do calendario de Agendamento (menu Comercial). Eventos por colaborador.
import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CriarAgendamentoDto } from './dto/criar-agendamento.dto';

const INCLUDE_RESPONSAVEL = {
  responsavel: { select: { id: true, nome: true, cargo: true, fotoUrl: true } },
} as const;

@Injectable()
export class AgendamentoService {
  constructor(private readonly prisma: PrismaService) {}

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
      responsavelId: dto.responsavelId,
    };
  }

  async criar(dto: CriarAgendamentoDto) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: dto.responsavelId },
      select: { id: true },
    });
    if (!usuario) throw new NotFoundException('Colaborador nao encontrado');
    return this.prisma.agendamento.create({
      data: this.montarDados(dto),
      include: INCLUDE_RESPONSAVEL,
    });
  }

  async atualizar(id: string, dto: CriarAgendamentoDto) {
    const existe = await this.prisma.agendamento.findUnique({ where: { id }, select: { id: true } });
    if (!existe) throw new NotFoundException('Agendamento nao encontrado');
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
