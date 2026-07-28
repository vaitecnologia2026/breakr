import { Injectable } from '@nestjs/common';
import { Cargo } from '@breakr/shared';
import { PrismaService } from '../prisma/prisma.service';
import { NotificacoesGateway } from './notificacoes.gateway';
import { PushService } from '../push/push.service';

export interface NovaNotificacao {
  titulo: string;
  mensagem: string;
  tipo?: string; // INFO | ALERTA | SUCESSO | ERRO
  link?: string;
}

/**
 * Notificacoes in-app. Alem de persistir e consultar, agora tambem entrega em
 * tempo real via WebSocket (NotificacoesGateway) — ex.: o pop-up "novo
 * contrato p/ a Franciela". Qualquer modulo (ex.: o motor) pode chamar `criar`
 * e o usuario recebe o evento 'nova-notificacao' na hora, sem polling.
 *
 * O gateway esta no mesmo modulo e nao depende do service, entao a injecao e
 * direta (sem forwardRef / sem ciclo).
 */
@Injectable()
export class NotificacoesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: NotificacoesGateway,
    private readonly push: PushService,
  ) {}

  async criar(usuarioId: string, dados: NovaNotificacao) {
    const notificacao = await this.prisma.notificacao.create({
      data: {
        usuarioId,
        titulo: dados.titulo,
        mensagem: dados.mensagem,
        tipo: dados.tipo ?? 'INFO',
        link: dados.link,
      },
    });
    // Empurra em tempo real para as conexoes abertas do usuario.
    this.gateway.emitirParaUsuario(usuarioId, notificacao);
    // Push nativo (app mobile) — fire-and-forget, nunca quebra o fluxo.
    void this.push.enviarParaUsuario(usuarioId, dados);
    return notificacao;
  }

  /**
   * Notifica todos os usuarios ativos de um cargo — ex.: o pop-up para a
   * Franciela (FINANCEIRO) quando um contrato cai para revisao ou um pagamento
   * e confirmado. Reaproveita `criar`, entao cada um recebe em tempo real.
   */
  async notificarPorCargo(
    cargo: Cargo,
    dados: NovaNotificacao,
  ): Promise<{ enviadas: number }> {
    const usuarios = await this.prisma.usuario.findMany({
      // cast: o enum do @breakr/shared espelha o enum do Prisma (mesmos valores).
      where: { cargo: cargo as never, ativo: true },
      select: { id: true },
    });
    if (usuarios.length === 0) {
      return { enviadas: 0 };
    }
    // Um unico INSERT em lote (evita N+1) e depois entrega em tempo real.
    await this.prisma.notificacao.createMany({
      data: usuarios.map((u) => ({
        usuarioId: u.id,
        titulo: dados.titulo,
        mensagem: dados.mensagem,
        tipo: dados.tipo ?? 'INFO',
        link: dados.link,
      })),
    });
    // createMany nao retorna os registros, entao emitimos os dados informados
    // (mesmo padrao do broadcast).
    const payload = {
      titulo: dados.titulo,
      mensagem: dados.mensagem,
      tipo: dados.tipo ?? 'INFO',
      link: dados.link ?? null,
    };
    for (const u of usuarios) {
      this.gateway.emitirParaUsuario(u.id, payload);
      void this.push.enviarParaUsuario(u.id, dados);
    }
    return { enviadas: usuarios.length };
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
    // Notifica cada usuario na sua room. O payload do broadcast nao tem id de
    // registro (createMany nao retorna), entao enviamos os dados informados.
    const payload = {
      titulo: dados.titulo,
      mensagem: dados.mensagem,
      tipo: dados.tipo ?? 'INFO',
      link: dados.link ?? null,
    };
    for (const u of usuarios) {
      this.gateway.emitirParaUsuario(u.id, payload);
      void this.push.enviarParaUsuario(u.id, dados);
    }
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
