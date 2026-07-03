// Aprovacao de estrategia (B6, req. l.202-208). A estrategista monta a estrategia/
// funil, envia ao cliente (aparece no portal) e o cliente aprova ou pede ajuste.
// A aprovacao/ajuste em si ocorrem no PortalService (rota publica do cliente).
// Importado por estrategia.module (provider) e estrategia.controller.
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { StatusEstrategia } from '@prisma/client';
import { Cargo } from '@breakr/shared';
import { PrismaService } from '../prisma/prisma.service';
import { NotificacoesService } from '../notificacoes/notificacoes.service';
import { CriarEstrategiaDto } from './dto/criar-estrategia.dto';
import { AtualizarEstrategiaDto } from './dto/atualizar-estrategia.dto';

const INCLUDE = {
  cliente: { select: { id: true, nomeFantasia: true, codigoUnico: true } },
  estrategista: { select: { id: true, nome: true } },
};

@Injectable()
export class EstrategiaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificacoes: NotificacoesService,
  ) {}

  listar(filtro?: { clienteId?: string; status?: StatusEstrategia }) {
    return this.prisma.estrategia.findMany({
      where: { clienteId: filtro?.clienteId, status: filtro?.status },
      include: INCLUDE,
      orderBy: { criadoEm: 'desc' },
    });
  }

  async obter(id: string) {
    const e = await this.prisma.estrategia.findUnique({ where: { id }, include: INCLUDE });
    if (!e) throw new NotFoundException('Estrategia nao encontrada');
    return e;
  }

  async criar(dto: CriarEstrategiaDto, estrategistaId?: string) {
    const cliente = await this.prisma.cliente.findUnique({
      where: { id: dto.clienteId },
      select: { id: true },
    });
    if (!cliente) throw new BadRequestException('Cliente nao encontrado');
    return this.prisma.estrategia.create({
      data: {
        clienteId: dto.clienteId,
        titulo: dto.titulo,
        descricao: dto.descricao,
        estrategistaId: estrategistaId ?? null,
        status: StatusEstrategia.RASCUNHO,
      },
      include: INCLUDE,
    });
  }

  async atualizar(id: string, dto: AtualizarEstrategiaDto) {
    await this.obter(id);
    return this.prisma.estrategia.update({
      where: { id },
      data: { titulo: dto.titulo, descricao: dto.descricao },
      include: INCLUDE,
    });
  }

  // Envia a estrategia ao cliente (passa a aparecer no portal para aprovacao).
  async enviar(id: string) {
    const e = await this.obter(id);
    const atualizada = await this.prisma.estrategia.update({
      where: { id },
      data: { status: StatusEstrategia.ENVIADA, enviadaEm: new Date() },
      include: INCLUDE,
    });
    // Avisa o CS para acompanhar a aprovacao (o cliente ve no portal).
    await this.notificacoes.notificarPorCargo(Cargo.CS, {
      titulo: 'Estrategia enviada ao cliente',
      mensagem: `A estrategia "${e.titulo}" de ${e.cliente.nomeFantasia} foi enviada para aprovacao no portal.`,
      tipo: 'INFO',
      link: '/estrategia',
    });
    return atualizada;
  }
}
