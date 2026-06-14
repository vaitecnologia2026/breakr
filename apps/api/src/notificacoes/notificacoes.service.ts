import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface NovaNotificacao {
  titulo: string;
  mensagem: string;
  tipo?: string; // INFO | ALERTA | SUCESSO | ERRO
  link?: string;
}

/**
 * Notificacoes in-app. A entrega em tempo real (WebSocket) — ex.: o pop-up
 * "novo contrato p/ a Franciela" — entra na proxima etapa; aqui ficam a
 * persistencia e as consultas, ja usaveis por qualquer modulo (ex.: o motor).
 */
@Injectable()
export class NotificacoesService {
  constructor(private readonly prisma: PrismaService) {}

  criar(usuarioId: string, dados: NovaNotificacao) {
    return this.prisma.notificacao.create({
      data: {
        usuarioId,
        titulo: dados.titulo,
        mensagem: dados.mensagem,
        tipo: dados.tipo ?? 'INFO',
        link: dados.link,
      },
    });
  }

  /** Comunicado para todos os usuarios ativos (broadcast). */
  async broadcast(dados: NovaNotificacao): Promise<{ enviadas: number }> {
    const usuarios = await this.prisma.usuario.findMany({
      where: { ativo: true },
      select: { id: true },
    });
    await this.prisma.notificacao.createMany({
      data: usuarios.map((u) => ({
        usuarioId: u.id,
        titulo: dados.titulo,
        mensagem: dados.mensagem,
        tipo: dados.tipo ?? 'INFO',
        link: dados.link,
      })),
    });
    return { enviadas: usuarios.length };
  }

  listar(usuarioId: string) {
    return this.prisma.notificacao.findMany({
      where: { usuarioId },
      orderBy: { criadoEm: 'desc' },
      take: 50,
    });
  }

  contarNaoLidas(usuarioId: string) {
    return this.prisma.notificacao.count({ where: { usuarioId, lida: false } });
  }

  async marcarLida(usuarioId: string, id: string): Promise<{ ok: boolean }> {
    // updateMany com usuarioId garante que so o dono marca a propria notificacao.
    await this.prisma.notificacao.updateMany({
      where: { id, usuarioId },
      data: { lida: true },
    });
    return { ok: true };
  }

  async marcarTodasLidas(usuarioId: string): Promise<{ atualizadas: number }> {
    const r = await this.prisma.notificacao.updateMany({
      where: { usuarioId, lida: false },
      data: { lida: true },
    });
    return { atualizadas: r.count };
  }
}
