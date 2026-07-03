// Painel do designer (B8, l.407-415): fila de peças por prazo/prioridade, atalhos
// dos clientes e notas pessoais. Reaproveita Conteudo (peças do responsável) — sem
// duplicar dados. As notas ficam no próprio Usuario (Usuario.notasPessoais).
// Importado por painel-designer.module (provider) e painel-designer.controller.
import { Injectable } from '@nestjs/common';
import { StatusConteudo } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AtualizarNotasDto } from './dto/atualizar-notas.dto';

// Status ainda "em aberto" para o designer (não entram publicados/arquivados).
const STATUS_ABERTOS: StatusConteudo[] = [
  StatusConteudo.IDEIA,
  StatusConteudo.ROTEIRO,
  StatusConteudo.PRODUCAO,
  StatusConteudo.REVISAO,
  StatusConteudo.EM_ALTERACAO,
  StatusConteudo.APROVACAO_CLIENTE,
  StatusConteudo.AGENDADO,
  StatusConteudo.LABORATORIO,
];

@Injectable()
export class PainelDesignerService {
  constructor(private readonly prisma: PrismaService) {}

  // Peças sob responsabilidade do usuário, em aberto, ordenadas pelo prazo.
  async minhasPecas(usuarioId?: string) {
    if (!usuarioId) return [];
    return this.prisma.conteudo.findMany({
      where: { responsavelId: usuarioId, status: { in: STATUS_ABERTOS } },
      orderBy: [{ dataAgendada: 'asc' }, { criadoEm: 'asc' }],
      select: {
        id: true,
        titulo: true,
        tipo: true,
        status: true,
        dataAgendada: true,
        midiaUrl: true,
        cliente: { select: { id: true, nomeFantasia: true } },
      },
    });
  }

  async obterNotas(usuarioId?: string): Promise<{ notasPessoais: string | null }> {
    if (!usuarioId) return { notasPessoais: null };
    const u = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: { notasPessoais: true },
    });
    return { notasPessoais: u?.notasPessoais ?? null };
  }

  async atualizarNotas(
    usuarioId: string | undefined,
    dto: AtualizarNotasDto,
  ): Promise<{ notasPessoais: string | null }> {
    if (!usuarioId) return { notasPessoais: null };
    const u = await this.prisma.usuario.update({
      where: { id: usuarioId },
      data: { notasPessoais: dto.notas?.trim() || null },
      select: { notasPessoais: true },
    });
    return { notasPessoais: u.notasPessoais };
  }
}
