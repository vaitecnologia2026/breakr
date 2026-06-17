// Serviço de agenda interna: feriados, sala de reuniões presencial e home office.
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CriarFeriadoDto } from './dto/criar-feriado.dto';
import { AgendarSalaDto } from './dto/agendar-sala.dto';
import { MarcarHomeOfficeDto } from './dto/marcar-home-office.dto';

@Injectable()
export class AgendaService {
  constructor(private readonly prisma: PrismaService) {}

  // --- Feriados ---
  listarFeriados() {
    return this.prisma.feriado.findMany({ orderBy: { data: 'asc' } });
  }
  criarFeriado(dto: CriarFeriadoDto) {
    return this.prisma.feriado.create({ data: { data: new Date(dto.data), titulo: dto.titulo } });
  }
  async removerFeriado(id: string) {
    await this.prisma.feriado.delete({ where: { id } }).catch(() => {
      throw new NotFoundException('Feriado nao encontrado');
    });
    return { ok: true };
  }

  // --- Sala de reuniões presencial ---
  listarAgendamentosSala() {
    return this.prisma.agendamentoSala.findMany({
      orderBy: { inicio: 'asc' },
      include: { responsavel: { select: { nome: true } } },
    });
  }
  async agendarSala(dto: AgendarSalaDto, responsavelId: string) {
    const inicio = new Date(dto.inicio);
    const fim = new Date(dto.fim);
    if (fim <= inicio) throw new BadRequestException('Fim deve ser depois do início');
    // Conflito: sobreposição com outro agendamento na mesma sala.
    const conflito = await this.prisma.agendamentoSala.findFirst({
      where: { inicio: { lt: fim }, fim: { gt: inicio } },
    });
    if (conflito) throw new BadRequestException('A sala já está reservada nesse horário');
    return this.prisma.agendamentoSala.create({
      data: { titulo: dto.titulo, inicio, fim, responsavelId },
      include: { responsavel: { select: { nome: true } } },
    });
  }
  async cancelarSala(id: string) {
    await this.prisma.agendamentoSala.delete({ where: { id } }).catch(() => {
      throw new NotFoundException('Agendamento nao encontrado');
    });
    return { ok: true };
  }

  // --- Home office ---
  meusDiasHomeOffice(usuarioId: string) {
    return this.prisma.homeOffice.findMany({
      where: { usuarioId, data: { gte: this.hoje() } },
      orderBy: { data: 'asc' },
    });
  }
  async marcarHomeOffice(usuarioId: string, dto: MarcarHomeOfficeDto) {
    const data = new Date(dto.data);
    return this.prisma.homeOffice.upsert({
      where: { usuarioId_data: { usuarioId, data } },
      create: { usuarioId, data },
      update: {},
    });
  }
  async desmarcarHomeOffice(id: string, usuarioId: string) {
    const ho = await this.prisma.homeOffice.findUnique({ where: { id } });
    if (!ho || ho.usuarioId !== usuarioId) throw new NotFoundException('Registro nao encontrado');
    await this.prisma.homeOffice.delete({ where: { id } });
    return { ok: true };
  }
  // Quem está em home office hoje (para saber quem está presencial).
  async hojeEmHomeOffice() {
    const inicio = this.hoje();
    const fim = new Date(inicio);
    fim.setHours(23, 59, 59, 999);
    const registros = await this.prisma.homeOffice.findMany({
      where: { data: { gte: inicio, lte: fim } },
      include: { usuario: { select: { nome: true } } },
    });
    return registros.map((r) => r.usuario.nome);
  }

  private hoje(): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }
}
