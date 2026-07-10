// Servico da tela "Atividades" do CRM comercial. CRUD de atividades (ligacoes,
// WhatsApp, reunioes...) opcionalmente ligadas a um Lead e a um responsavel.
import { Injectable, NotFoundException } from '@nestjs/common';
import { AtividadeComercial } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CriarAtividadeDto } from './dto/criar-atividade.dto';
import { AtualizarAtividadeDto } from './dto/atualizar-atividade.dto';

const INCLUDE = {
  lead: { select: { id: true, nome: true, empresa: true } },
  responsavel: { select: { nome: true } },
} as const;

@Injectable()
export class AtividadesComercialService {
  constructor(private readonly prisma: PrismaService) {}

  // Lista as atividades (pendentes/vencidas primeiro por vencimento; depois as
  // mais recentes). O agrupamento por periodo (Hoje/Amanha/...) fica no frontend.
  listar(): Promise<AtividadeComercial[]> {
    return this.prisma.atividadeComercial.findMany({
      include: INCLUDE,
      orderBy: [{ vencimento: 'asc' }, { criadoEm: 'desc' }],
    });
  }

  criar(dto: CriarAtividadeDto): Promise<AtividadeComercial> {
    return this.prisma.atividadeComercial.create({
      data: {
        titulo: dto.titulo,
        tipo: dto.tipo,
        vencimento: dto.vencimento ? new Date(dto.vencimento) : undefined,
        horaFim: dto.horaFim ? new Date(dto.horaFim) : undefined,
        notas: dto.notas,
        contato: dto.contato,
        empresaNome: dto.empresaNome,
        leadId: dto.leadId,
        responsavelId: dto.responsavelId,
      },
      include: INCLUDE,
    });
  }

  async atualizar(id: string, dto: AtualizarAtividadeDto): Promise<AtividadeComercial> {
    const existe = await this.prisma.atividadeComercial.findUnique({ where: { id } });
    if (!existe) {
      throw new NotFoundException('Atividade nao encontrada');
    }
    return this.prisma.atividadeComercial.update({
      where: { id },
      data: {
        titulo: dto.titulo,
        tipo: dto.tipo,
        status: dto.status,
        vencimento: dto.vencimento ? new Date(dto.vencimento) : undefined,
        horaFim: dto.horaFim ? new Date(dto.horaFim) : undefined,
        notas: dto.notas,
        contato: dto.contato,
        empresaNome: dto.empresaNome,
        leadId: dto.leadId,
        responsavelId: dto.responsavelId,
      },
      include: INCLUDE,
    });
  }

  async excluir(id: string): Promise<{ ok: true }> {
    const existe = await this.prisma.atividadeComercial.findUnique({ where: { id } });
    if (!existe) {
      throw new NotFoundException('Atividade nao encontrada');
    }
    await this.prisma.atividadeComercial.delete({ where: { id } });
    return { ok: true };
  }
}
