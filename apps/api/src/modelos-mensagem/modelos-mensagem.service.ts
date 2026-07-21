import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CriarModeloMensagemDto } from './dto/criar-modelo-mensagem.dto';
import { AtualizarModeloMensagemDto } from './dto/atualizar-modelo-mensagem.dto';

@Injectable()
export class ModelosMensagemService {
  constructor(private readonly prisma: PrismaService) {}

  async listar() {
    const modelos = await this.prisma.modeloMensagem.findMany({
      orderBy: { criadoEm: 'desc' },
      take: 300,
    });
    // Enriquece com o nome do criador (lookup read-only; criadoPorId é escalar,
    // sem relação formal — mantém o módulo isolado).
    const ids = [
      ...new Set(modelos.map((m) => m.criadoPorId).filter((v): v is string => !!v)),
    ];
    const autores = ids.length
      ? await this.prisma.usuario.findMany({
          where: { id: { in: ids } },
          select: { id: true, nome: true },
        })
      : [];
    const nomePorId = new Map(autores.map((a) => [a.id, a.nome]));
    return modelos.map((m) => ({
      ...m,
      criadoPorNome: m.criadoPorId ? nomePorId.get(m.criadoPorId) ?? null : null,
    }));
  }

  criar(dto: CriarModeloMensagemDto, criadoPorId?: string) {
    return this.prisma.modeloMensagem.create({
      data: {
        titulo: dto.titulo,
        tipo: dto.tipo ?? null,
        corpo: dto.corpo,
        criadoPorId: criadoPorId ?? null,
      },
    });
  }

  async atualizar(id: string, dto: AtualizarModeloMensagemDto) {
    await this.garantirExiste(id);
    return this.prisma.modeloMensagem.update({
      where: { id },
      data: {
        ...(dto.titulo !== undefined ? { titulo: dto.titulo } : {}),
        ...(dto.tipo !== undefined ? { tipo: dto.tipo } : {}),
        ...(dto.corpo !== undefined ? { corpo: dto.corpo } : {}),
      },
    });
  }

  async remover(id: string) {
    await this.garantirExiste(id);
    await this.prisma.modeloMensagem.delete({ where: { id } });
    return { ok: true };
  }

  private async garantirExiste(id: string) {
    const m = await this.prisma.modeloMensagem.findUnique({ where: { id } });
    if (!m) throw new NotFoundException('Modelo de mensagem não encontrado.');
    return m;
  }
}
