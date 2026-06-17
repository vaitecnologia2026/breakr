// Serviço da central de ouvidoria (manifestações do time → jurídico).
import { Injectable, NotFoundException } from '@nestjs/common';
import { Cargo } from '@breakr/shared';
import { PrismaService } from '../prisma/prisma.service';
import { NotificacoesService } from '../notificacoes/notificacoes.service';
import { CriarOuvidoriaDto } from './dto/criar-ouvidoria.dto';
import { ResolverOuvidoriaDto } from './dto/resolver-ouvidoria.dto';

@Injectable()
export class OuvidoriaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificacoes: NotificacoesService,
  ) {}

  // Visão do jurídico/admin. Em manifestações anônimas o autor é ocultado.
  async listar() {
    const itens = await this.prisma.ouvidoria.findMany({
      orderBy: { criadoEm: 'desc' },
      include: { autor: { select: { nome: true } } },
    });
    return itens.map((o) => ({
      id: o.id,
      assunto: o.assunto,
      mensagem: o.mensagem,
      status: o.status,
      resolucao: o.resolucao,
      criadoEm: o.criadoEm,
      autor: o.anonima ? null : o.autor?.nome ?? null,
      anonima: o.anonima,
    }));
  }

  async criar(dto: CriarOuvidoriaDto, autorId: string) {
    const item = await this.prisma.ouvidoria.create({
      data: {
        assunto: dto.assunto,
        mensagem: dto.mensagem,
        anonima: dto.anonima ?? false,
        // Em manifestação anônima não guardamos o vínculo com o autor.
        autorId: dto.anonima ? null : autorId,
      },
    });
    await this.notificacoes.notificarPorCargo(Cargo.JURIDICO, {
      titulo: 'Nova manifestação na ouvidoria',
      mensagem: `Assunto: ${dto.assunto}.`,
      tipo: 'ALERTA',
      link: '/ouvidoria',
    });
    return { id: item.id };
  }

  async resolver(id: string, dto: ResolverOuvidoriaDto) {
    const item = await this.prisma.ouvidoria.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Manifestacao nao encontrada');
    return this.prisma.ouvidoria.update({
      where: { id },
      data: { status: dto.status ?? 'RESOLVIDA', resolucao: dto.resolucao },
    });
  }
}
