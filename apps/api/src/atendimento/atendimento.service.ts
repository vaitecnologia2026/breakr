// Servico de atendimento: inbox WhatsApp com modelo PENDENTE/ATENDENDO/RESOLVIDO.
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AtendimentoService {
  constructor(private readonly prisma: PrismaService) {}

  async listar() {
    const todas = await this.prisma.conversa.findMany({
      include: {
        cliente: { select: { id: true, nomeFantasia: true, tag: true } },
        atendente: { select: { id: true, nome: true } },
        mensagens: { orderBy: { criadoEm: 'desc' }, take: 1 },
      },
      orderBy: [{ ultimaMsgEm: 'desc' }, { criadoEm: 'desc' }],
    });

    return {
      pendente: todas.filter((c) => c.status === 'PENDENTE'),
      atendendo: todas.filter((c) => c.status === 'ATENDENDO'),
      resolvido: todas.filter((c) => c.status === 'RESOLVIDO'),
    };
  }

  async obter(id: string) {
    return this.prisma.conversa.findUnique({
      where: { id },
      include: {
        cliente: true,
        atendente: { select: { id: true, nome: true } },
        mensagens: { orderBy: { criadoEm: 'asc' } },
      },
    });
  }

  async criar(clienteId?: string, waTelefone?: string, assunto?: string) {
    return this.prisma.conversa.create({
      data: {
        status: 'PENDENTE',
        clienteId: clienteId ?? null,
        waTelefone: waTelefone ?? null,
        assunto: assunto ?? null,
        ultimaMsgEm: new Date(),
      },
      include: {
        cliente: { select: { id: true, nomeFantasia: true, tag: true } },
      },
    });
  }

  async aceitar(id: string, atendenteId: string) {
    return this.prisma.conversa.update({
      where: { id },
      data: { status: 'ATENDENDO', atendenteId },
    });
  }

  async resolver(id: string) {
    return this.prisma.conversa.update({
      where: { id },
      data: { status: 'RESOLVIDO' },
    });
  }

  async reabrir(id: string) {
    return this.prisma.conversa.update({
      where: { id },
      data: { status: 'PENDENTE', atendenteId: null },
    });
  }

  async enviarMensagem(conversaId: string, texto: string) {
    const conversa = await this.prisma.conversa.findUnique({ where: { id: conversaId } });
    if (!conversa) throw new Error('Conversa não encontrada');

    const msg = await this.prisma.mensagem.create({
      data: { conversaId, autor: 'ATENDENTE', direcao: 'outbound', tipo: 'text', texto },
    });

    await this.prisma.conversa.update({
      where: { id: conversaId },
      data: { ultimaMsgEm: new Date() },
    });

    // Tenta enviar via Meta Cloud API se estiver configurado
    if (conversa.waTelefone) {
      const cfg = await this.prisma.configuracaoWhatsapp.findUnique({
        where: { id: 'singleton' },
      });

      if (cfg?.ativo && cfg.phoneNumberId && cfg.accessToken) {
        try {
          const res = await fetch(
            `https://graph.facebook.com/v20.0/${cfg.phoneNumberId}/messages`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${cfg.accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                messaging_product: 'whatsapp',
                to: conversa.waTelefone,
                type: 'text',
                text: { body: texto, preview_url: false },
              }),
            },
          );

          if (res.ok) {
            const data = (await res.json()) as { messages?: { id: string }[] };
            const waMsgId = data?.messages?.[0]?.id;
            if (waMsgId) {
              await this.prisma.mensagem.update({
                where: { id: msg.id },
                data: { waMsgId },
              });
            }
          } else {
            const errBody = await res.text().catch(() => '');
            console.warn(`[Atendimento] Meta send ${res.status}: ${errBody}`);
          }
        } catch (e) {
          console.warn('[Atendimento] Meta fetch error:', (e as Error).message);
        }
      }
    }

    return msg;
  }

  async processarWebhookMeta(payload: unknown) {
    await this.prisma.webhookLog.create({
      data: { fonte: 'meta', payload: payload as object },
    });

    const p = payload as Record<string, unknown>;
    const entry = ((p?.entry ?? []) as Record<string, unknown>[])[0];
    const change = ((entry?.changes ?? []) as Record<string, unknown>[])[0];
    const value = change?.value as Record<string, unknown> | undefined;
    const messages = (value?.messages ?? []) as Record<string, unknown>[];

    for (const msg of messages) {
      const from = msg.from as string;
      const waMsgId = msg.id as string;
      const tipo = (msg.type as string) || 'text';
      const texto = ((msg.text as Record<string, unknown>)?.body as string) || '';

      const existente = await this.prisma.mensagem.findUnique({ where: { waMsgId } });
      if (existente) continue;

      let conversa = await this.prisma.conversa.findFirst({
        where: { waTelefone: from, status: { not: 'RESOLVIDO' } },
        orderBy: { criadoEm: 'desc' },
      });

      if (!conversa) {
        const cliente = await this.prisma.cliente.findFirst({
          where: { telefone: from },
        });
        conversa = await this.prisma.conversa.create({
          data: {
            status: 'PENDENTE',
            waTelefone: from,
            clienteId: cliente?.id ?? null,
            ultimaMsgEm: new Date(),
          },
        });
      }

      await this.prisma.mensagem.create({
        data: {
          conversaId: conversa.id,
          autor: 'CLIENTE',
          direcao: 'inbound',
          tipo,
          texto,
          waMsgId,
        },
      });

      await this.prisma.conversa.update({
        where: { id: conversa.id },
        data: { ultimaMsgEm: new Date() },
      });
    }
  }

  async getConfig() {
    const cfg = await this.prisma.configuracaoWhatsapp.findUnique({
      where: { id: 'singleton' },
    });
    if (!cfg) {
      return { ativo: false, phoneNumberId: null, waBaId: null, temWebhookVerifyToken: false, accessToken: null };
    }
    return {
      ativo: cfg.ativo,
      phoneNumberId: cfg.phoneNumberId,
      waBaId: cfg.waBaId,
      // Segredo que autentica os webhooks inbound: nunca devolver em claro.
      temWebhookVerifyToken: !!cfg.webhookVerifyToken,
      accessToken: cfg.accessToken ? `***${cfg.accessToken.slice(-4)}` : null,
    };
  }

  async salvarConfig(data: {
    phoneNumberId?: string;
    accessToken?: string;
    webhookVerifyToken?: string;
    waBaId?: string;
    ativo?: boolean;
  }) {
    return this.prisma.configuracaoWhatsapp.upsert({
      where: { id: 'singleton' },
      create: { id: 'singleton', ...data },
      update: data,
    });
  }
}
