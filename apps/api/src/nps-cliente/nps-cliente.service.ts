// NPS de cliente (Sucesso do Cliente, req. l.196-198, 544-547). Registra a nota
// (0..10) com comentario no historico; nota de DETRATOR (<= 6) marca crise e
// notifica o CS para abrir gestao de crise (req. l.185, l.547). Aditivo.
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { NpsCliente } from '@prisma/client';
import { Cargo } from '@breakr/shared';
import { PrismaService } from '../prisma/prisma.service';
import { NotificacoesService } from '../notificacoes/notificacoes.service';
import { RegistrarNpsDto } from './dto/nps-cliente.dto';

const NOTA_MAX = 10;
const LIMITE_DETRATOR = 6; // 0..6 = detrator (abre crise)

@Injectable()
export class NpsClienteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificacoes: NotificacoesService,
  ) {}

  // Historico (mais recentes primeiro) com nome do cliente; filtro opcional.
  listar(clienteId?: string) {
    return this.prisma.npsCliente.findMany({
      where: clienteId ? { clienteId } : undefined,
      include: { cliente: { select: { nomeFantasia: true } } },
      orderBy: { criadoEm: 'desc' },
    });
  }

  async registrar(dto: RegistrarNpsDto): Promise<NpsCliente> {
    if (!Number.isInteger(dto.nota) || dto.nota < 0 || dto.nota > NOTA_MAX) {
      throw new BadRequestException('Nota do NPS deve ser um inteiro de 0 a 10.');
    }
    const cliente = await this.prisma.cliente.findUnique({
      where: { id: dto.clienteId },
      select: { id: true, nomeFantasia: true },
    });
    if (!cliente) throw new NotFoundException('Cliente nao encontrado');

    const crise = dto.nota <= LIMITE_DETRATOR;
    const registro = await this.prisma.npsCliente.create({
      data: { clienteId: dto.clienteId, nota: dto.nota, comentario: dto.comentario, crise },
    });

    // NPS baixo -> abre gestao de crise notificando o CS (req. l.185, l.547).
    if (crise) {
      const detalhe = dto.comentario ? ': ' + dto.comentario : '.';
      await this.notificacoes.notificarPorCargo(Cargo.CS, {
        titulo: 'NPS baixo — abrir gestao de crise',
        mensagem: `${cliente.nomeFantasia} deu NPS ${dto.nota}/10${detalhe}`,
        tipo: 'ERRO',
        link: '/nps-cliente',
      });
    }
    return registro;
  }

  // Resumo por squad do cliente: media de NPS, total e nº de detratores.
  async resumoPorSquad() {
    const registros = await this.prisma.npsCliente.findMany({
      include: { cliente: { select: { squad: { select: { nome: true } } } } },
    });
    const mapa = new Map<string, { squad: string; soma: number; n: number; detratores: number }>();
    for (const r of registros) {
      const squad = r.cliente?.squad?.nome ?? 'Sem squad';
      const acc = mapa.get(squad) ?? { squad, soma: 0, n: 0, detratores: 0 };
      acc.soma += r.nota;
      acc.n += 1;
      if (r.crise) acc.detratores += 1;
      mapa.set(squad, acc);
    }
    return [...mapa.values()]
      .map((a) => ({
        squad: a.squad,
        media: a.n ? Math.round((a.soma / a.n) * 10) / 10 : 0,
        total: a.n,
        detratores: a.detratores,
      }))
      .sort((a, b) => b.total - a.total);
  }
}
