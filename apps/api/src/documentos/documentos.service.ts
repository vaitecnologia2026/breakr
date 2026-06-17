// Serviço de documentos do colaborador (holerite/folha/contrato/manual).
// Por link + assinatura: o colaborador assina dentro do sistema.
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificacoesService } from '../notificacoes/notificacoes.service';
import { CriarDocumentoDto } from './dto/criar-documento.dto';

@Injectable()
export class DocumentosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificacoes: NotificacoesService,
  ) {}

  // Documentos do próprio usuário.
  meus(usuarioId: string) {
    return this.prisma.documentoColaborador.findMany({
      where: { colaboradorId: usuarioId },
      orderBy: { criadoEm: 'desc' },
    });
  }

  // Visão de gestão (RH) — opcionalmente por colaborador.
  listar(colaboradorId?: string) {
    return this.prisma.documentoColaborador.findMany({
      where: colaboradorId ? { colaboradorId } : undefined,
      orderBy: { criadoEm: 'desc' },
      include: { colaborador: { select: { nome: true } } },
    });
  }

  async criar(dto: CriarDocumentoDto) {
    const doc = await this.prisma.documentoColaborador.create({
      data: {
        tipo: dto.tipo,
        titulo: dto.titulo,
        url: dto.url,
        competencia: dto.competencia,
        colaboradorId: dto.colaboradorId,
      },
    });
    await this.notificacoes.criar(dto.colaboradorId, {
      titulo: 'Novo documento para assinar',
      mensagem: `${dto.titulo} disponível. Acesse e assine.`,
      tipo: 'ALERTA',
      link: '/documentos',
    });
    return doc;
  }

  // Assinatura — só o próprio colaborador assina o seu documento.
  async assinar(id: string, usuarioId: string) {
    const doc = await this.prisma.documentoColaborador.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Documento nao encontrado');
    if (doc.colaboradorId !== usuarioId) {
      throw new ForbiddenException('Voce so pode assinar os seus documentos');
    }
    return this.prisma.documentoColaborador.update({
      where: { id },
      data: { assinadoEm: new Date() },
    });
  }

  async remover(id: string) {
    const doc = await this.prisma.documentoColaborador.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Documento nao encontrado');
    await this.prisma.documentoColaborador.delete({ where: { id } });
    return { ok: true };
  }
}
