import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChatService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    const canais = [
      { nome: 'geral',  descricao: 'Canal oficial da equipe' },
      { nome: 'avisos', descricao: 'Comunicados e anúncios importantes' },
      { nome: 'random', descricao: 'Conversas informais' },
    ];
    for (const c of canais) {
      await this.prisma.canalChat.upsert({
        where: { nome: c.nome },
        create: c,
        update: {},
      });
    }
  }

  listarCanais() {
    return this.prisma.canalChat.findMany({ orderBy: { nome: 'asc' } });
  }

  listarMensagens(canalId: string, depois?: string) {
    return this.prisma.mensagemChat.findMany({
      where: {
        canalId,
        ...(depois ? { criadoEm: { gt: new Date(depois) } } : {}),
      },
      orderBy: { criadoEm: 'asc' },
      take: 200,
      include: { autor: { select: { id: true, nome: true } } },
    });
  }

  enviarMensagem(canalId: string, conteudo: string, autorId?: string) {
    return this.prisma.mensagemChat.create({
      data: { canalId, conteudo: conteudo.trim(), autorId: autorId ?? null },
      include: { autor: { select: { id: true, nome: true } } },
    });
  }

  criarCanal(nome: string, descricao?: string) {
    return this.prisma.canalChat.create({ data: { nome, descricao } });
  }

  // ----------------------- Mensagens diretas (DM 1:1) — B7 -----------------------

  // Colegas (ativos) para iniciar/continuar uma conversa direta, exceto o proprio.
  listarContatos(usuarioId?: string) {
    return this.prisma.usuario.findMany({
      where: { ativo: true, ...(usuarioId ? { id: { not: usuarioId } } : {}) },
      select: { id: true, nome: true, cargo: true, fotoUrl: true },
      orderBy: { nome: 'asc' },
    });
  }

  // Conversas diretas do usuario: por parceiro, ultima mensagem + total nao lidas.
  async listarConversasDiretas(usuarioId?: string) {
    if (!usuarioId) return [];
    const mensagens = await this.prisma.mensagemDireta.findMany({
      where: { OR: [{ deId: usuarioId }, { paraId: usuarioId }] },
      orderBy: { criadoEm: 'desc' },
      include: {
        de: { select: { id: true, nome: true, fotoUrl: true } },
        para: { select: { id: true, nome: true, fotoUrl: true } },
      },
    });
    type Parceiro = { id: string; nome: string; fotoUrl: string | null };
    const mapa = new Map<
      string,
      { parceiro: Parceiro; ultima: string; ultimaEm: Date; naoLidas: number }
    >();
    for (const m of mensagens) {
      const parceiro: Parceiro = m.deId === usuarioId ? m.para : m.de;
      const atual = mapa.get(parceiro.id);
      const naoLida = m.paraId === usuarioId && !m.lidaEm;
      if (!atual) {
        mapa.set(parceiro.id, {
          parceiro,
          ultima: m.texto,
          ultimaEm: m.criadoEm,
          naoLidas: naoLida ? 1 : 0,
        });
      } else if (naoLida) {
        atual.naoLidas += 1;
      }
    }
    return [...mapa.values()];
  }

  // Thread entre o usuario atual e outro; marca as recebidas como lidas.
  async listarMensagensDiretas(
    usuarioId: string | undefined,
    outroId: string,
    depois?: string,
  ) {
    if (!usuarioId) return [];
    const mensagens = await this.prisma.mensagemDireta.findMany({
      where: {
        OR: [
          { deId: usuarioId, paraId: outroId },
          { deId: outroId, paraId: usuarioId },
        ],
        ...(depois ? { criadoEm: { gt: new Date(depois) } } : {}),
      },
      orderBy: { criadoEm: 'asc' },
      take: 200,
      include: { de: { select: { id: true, nome: true } } },
    });
    await this.prisma.mensagemDireta.updateMany({
      where: { deId: outroId, paraId: usuarioId, lidaEm: null },
      data: { lidaEm: new Date() },
    });
    return mensagens;
  }

  enviarMensagemDireta(deId: string | undefined, paraId: string, texto: string) {
    if (!deId) throw new BadRequestException('Usuario nao identificado');
    const conteudo = (texto ?? '').trim();
    if (!conteudo) throw new BadRequestException('Mensagem vazia');
    return this.prisma.mensagemDireta.create({
      data: { deId, paraId, texto: conteudo },
      include: { de: { select: { id: true, nome: true } } },
    });
  }
}
