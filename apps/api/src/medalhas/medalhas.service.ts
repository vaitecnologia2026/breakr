// Serviço de medalhas (gamificação do portal do cliente).
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CriarMedalhaDto } from './dto/criar-medalha.dto';

@Injectable()
export class MedalhasService {
  constructor(private readonly prisma: PrismaService) {}

  listar() {
    return this.prisma.medalha.findMany({ orderBy: { criadoEm: 'desc' } });
  }

  criar(dto: CriarMedalhaDto) {
    return this.prisma.medalha.create({
      data: { titulo: dto.titulo, icone: dto.icone, descricao: dto.descricao },
    });
  }

  async remover(id: string) {
    const m = await this.prisma.medalha.findUnique({ where: { id } });
    if (!m) throw new NotFoundException('Medalha nao encontrada');
    await this.prisma.medalha.delete({ where: { id } });
    return { ok: true };
  }

  // Concede uma medalha a um cliente (idempotente).
  async conceder(medalhaId: string, clienteId: string) {
    const [medalha, cliente] = await Promise.all([
      this.prisma.medalha.findUnique({ where: { id: medalhaId } }),
      this.prisma.cliente.findUnique({ where: { id: clienteId } }),
    ]);
    if (!medalha) throw new NotFoundException('Medalha nao encontrada');
    if (!cliente) throw new NotFoundException('Cliente nao encontrado');
    await this.prisma.clienteMedalha.upsert({
      where: { medalhaId_clienteId: { medalhaId, clienteId } },
      create: { medalhaId, clienteId },
      update: {},
    });
    return { ok: true };
  }

  async revogar(medalhaId: string, clienteId: string) {
    await this.prisma.clienteMedalha
      .delete({ where: { medalhaId_clienteId: { medalhaId, clienteId } } })
      .catch(() => null);
    return { ok: true };
  }

  // Medalhas concedidas a um cliente (visão de gestão).
  doCliente(clienteId: string) {
    return this.prisma.clienteMedalha.findMany({
      where: { clienteId },
      include: { medalha: true },
      orderBy: { concedidaEm: 'desc' },
    });
  }
}
