import { Injectable, OnModuleInit } from '@nestjs/common';
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
}
