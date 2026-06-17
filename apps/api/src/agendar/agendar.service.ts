// Serviço de agendamento público com colaborador (página de booking).
// Regras (do vídeo): mínimo 24h de antecedência e janela de até 7 dias úteis.
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AgendarDto } from './dto/agendar.dto';

// Horários de atendimento (hora cheia). Pula o almoço (12–13h).
const HORAS = [9, 10, 11, 14, 15, 16, 17];
const DIAS_UTEIS_JANELA = 7;
const ANTECEDENCIA_MIN_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class AgendarService {
  constructor(private readonly prisma: PrismaService) {}

  // Colaboradores disponíveis para agendamento (só dados públicos).
  async colaboradores() {
    const us = await this.prisma.usuario.findMany({
      where: { ativo: true },
      orderBy: { nome: 'asc' },
      select: { id: true, nome: true, cargo: true },
    });
    return us;
  }

  // Slots disponíveis: próximos 7 dias úteis, fora de fim de semana/feriado,
  // com 24h de antecedência, excluindo horários já reservados.
  async slots(colaboradorId: string): Promise<string[]> {
    const colaborador = await this.prisma.usuario.findUnique({ where: { id: colaboradorId } });
    if (!colaborador) throw new NotFoundException('Colaborador nao encontrado');

    const agora = new Date();
    const minimo = new Date(agora.getTime() + ANTECEDENCIA_MIN_MS);

    // Feriados na janela.
    const feriados = await this.prisma.feriado.findMany({ select: { data: true } });
    const feriadoSet = new Set(feriados.map((f) => f.data.toISOString().slice(0, 10)));

    // Agendamentos existentes do colaborador (para excluir horários ocupados).
    const ocupados = await this.prisma.agendamentoColaborador.findMany({
      where: { colaboradorId, inicio: { gte: agora } },
      select: { inicio: true },
    });
    const ocupadoSet = new Set(ocupados.map((o) => o.inicio.toISOString()));

    const slots: string[] = [];
    let diasUteis = 0;
    const cursor = new Date(agora);
    cursor.setHours(0, 0, 0, 0);

    while (diasUteis < DIAS_UTEIS_JANELA) {
      const dow = cursor.getDay(); // 0=dom, 6=sáb
      const ymd = cursor.toISOString().slice(0, 10);
      const ehUtil = dow !== 0 && dow !== 6 && !feriadoSet.has(ymd);
      if (ehUtil) {
        diasUteis += 1;
        for (const h of HORAS) {
          const slot = new Date(cursor);
          slot.setHours(h, 0, 0, 0);
          if (slot >= minimo && !ocupadoSet.has(slot.toISOString())) {
            slots.push(slot.toISOString());
          }
        }
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    return slots;
  }

  async agendar(colaboradorId: string, dto: AgendarDto) {
    const colaborador = await this.prisma.usuario.findUnique({ where: { id: colaboradorId } });
    if (!colaborador) throw new NotFoundException('Colaborador nao encontrado');

    const inicio = new Date(dto.inicio);
    const minimo = new Date(Date.now() + ANTECEDENCIA_MIN_MS);
    if (inicio < minimo) {
      throw new BadRequestException('Agendamentos exigem no mínimo 24h de antecedência');
    }
    const fim = new Date(inicio.getTime() + 60 * 60 * 1000);

    // Evita reserva dupla do mesmo horário.
    const conflito = await this.prisma.agendamentoColaborador.findFirst({
      where: { colaboradorId, inicio },
    });
    if (conflito) throw new BadRequestException('Esse horário já foi reservado');

    const ag = await this.prisma.agendamentoColaborador.create({
      data: {
        colaboradorId,
        nome: dto.nome.trim(),
        email: dto.email,
        telefone: dto.telefone,
        assunto: dto.assunto,
        inicio,
        fim,
      },
    });
    return { ok: true, agendamentoId: ag.id };
  }

  // Visão interna: agendamentos recebidos por um colaborador.
  listarDoColaborador(colaboradorId: string) {
    return this.prisma.agendamentoColaborador.findMany({
      where: { colaboradorId, inicio: { gte: new Date() } },
      orderBy: { inicio: 'asc' },
    });
  }
}
