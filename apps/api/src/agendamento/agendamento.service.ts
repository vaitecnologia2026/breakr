// Servico do calendario de Agendamento (menu Comercial). Eventos por colaborador.
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CriarAgendamentoDto } from './dto/criar-agendamento.dto';
import { GoogleAgendaService } from './google-agenda.service';

const INCLUDE_RESPONSAVEL = {
  responsavel: { select: { id: true, nome: true, cargo: true, fotoUrl: true } },
} as const;

// Cores por tipo de reuniao interna (mesmas da tela Reunioes) — usadas no card do
// calendario para as reunioes do time, que aparecem na linha de todos.
const COR_REUNIAO_POR_TIPO: Record<string, string> = {
  GESTAO: '#2ecc71',
  VENDAS: '#a855f7',
  ESTRATEGICA: '#a855f7',
  FINANCEIRO: '#4aa3f0',
  OUTRO: '#9aa0ad',
};

@Injectable()
export class AgendamentoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly googleAgenda: GoogleAgendaService,
  ) {}

  // Lista eventos, opcionalmente filtrando por intervalo [inicio, fim] (ISO).
  // Alem dos agendamentos por colaborador, inclui as reunioes internas do time
  // (tela Reunioes internas) como eventos "para todos" — aparecem na linha de
  // cada colaborador no calendario.
  async listar(inicioIso?: string, fimIso?: string) {
    const filtro: Prisma.DateTimeFilter = {};
    if (inicioIso) filtro.gte = new Date(inicioIso);
    if (fimIso) filtro.lte = new Date(fimIso);

    const where: Prisma.AgendamentoWhereInput = {};
    if (inicioIso || fimIso) where.inicio = filtro;

    const eventos = await this.prisma.agendamento.findMany({
      where,
      orderBy: { inicio: 'asc' },
      include: INCLUDE_RESPONSAVEL,
    });

    const whereReuniao: Prisma.ReuniaoInternaWhereInput = {};
    if (inicioIso || fimIso) whereReuniao.data = filtro;
    const reunioes = await this.prisma.reuniaoInterna.findMany({
      where: whereReuniao,
      orderBy: { data: 'asc' },
    });

    return [...eventos, ...reunioes.map((r) => this.reuniaoParaEvento(r))];
  }

  // Converte uma reuniao interna do time num "evento" do calendario, marcado como
  // paraTodos (aparece na linha de todos os colaboradores). Sem responsavel; nao e
  // editavel/removivel por aqui — e gerida na tela Reunioes internas. Como a reuniao
  // interna nao tem "fim", o card usa inicio + 1h so para exibicao.
  private reuniaoParaEvento(r: {
    id: string;
    titulo: string;
    descricao: string | null;
    data: Date;
    meetLink: string | null;
    tipo: string;
  }) {
    const fim = new Date(r.data);
    fim.setHours(fim.getHours() + 1);
    return {
      id: r.id,
      titulo: r.titulo,
      inicio: r.data,
      fim,
      tipo: r.meetLink ? 'VIDEO' : 'OUTRO',
      comCliente: false,
      local: null as string | null,
      observacao: r.descricao,
      cor: COR_REUNIAO_POR_TIPO[r.tipo] ?? COR_REUNIAO_POR_TIPO.OUTRO,
      convidadosIds: [] as string[],
      meetLink: r.meetLink,
      googleEventId: null as string | null,
      googleHtmlLink: null as string | null,
      responsavel: null,
      responsavelId: null as string | null,
      paraTodos: true,
    };
  }

  // Colaboradores (ativos) que aparecem como linhas do calendario.
  colaboradores() {
    return this.prisma.usuario.findMany({
      where: { ativo: true },
      orderBy: { nome: 'asc' },
      select: { id: true, nome: true, cargo: true, fotoUrl: true },
    });
  }

  private montarDados(dto: CriarAgendamentoDto): Prisma.AgendamentoUncheckedCreateInput {
    return {
      titulo: dto.titulo,
      inicio: new Date(dto.inicio),
      fim: new Date(dto.fim),
      tipo: dto.tipo ?? 'VIDEO',
      comCliente: dto.comCliente ?? false,
      local: dto.local ?? null,
      observacao: dto.observacao ?? null,
      cor: dto.cor ?? null,
      convidadosIds: dto.convidadosIds ?? [],
      responsavelId: dto.responsavelId,
    };
  }

  // Regra da sala: dois agendamentos PRESENCIAIS nao podem se sobrepor no tempo
  // (sala unica). Lanca 409 se houver conflito. `ignorarId` exclui o proprio
  // evento na edicao.
  private async garantirSalaLivre(inicio: Date, fim: Date, ignorarId?: string) {
    const conflito = await this.prisma.agendamento.findFirst({
      where: {
        tipo: 'PRESENCIAL',
        ...(ignorarId ? { id: { not: ignorarId } } : {}),
        inicio: { lt: fim },
        fim: { gt: inicio },
      },
      select: { id: true },
    });
    if (conflito) {
      throw new ConflictException('Sala de reuniao ocupada nesse horario por outro agendamento presencial.');
    }
  }

  // E-mails dos colaboradores convidados (para adicionar como participantes no Meet).
  private async emailsDosConvidados(ids: string[]): Promise<string[]> {
    if (!ids.length) return [];
    const usuarios = await this.prisma.usuario.findMany({
      where: { id: { in: ids } },
      select: { email: true },
    });
    return usuarios.map((u) => u.email).filter((e): e is string => !!e);
  }

  async criar(dto: CriarAgendamentoDto) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: dto.responsavelId },
      select: { id: true },
    });
    if (!usuario) throw new NotFoundException('Colaborador nao encontrado');
    if ((dto.tipo ?? 'VIDEO') === 'PRESENCIAL') {
      await this.garantirSalaLivre(new Date(dto.inicio), new Date(dto.fim));
    }
    const criado = await this.prisma.agendamento.create({
      data: this.montarDados(dto),
      include: INCLUDE_RESPONSAVEL,
    });

    // Evento de video (online): gera o link do Meet como sala no Jitsi self-hosted
    // (meet-breakr.vaitecnologia.com.br). O VirtualHost e anonimo, entao a sala e
    // criada ao abrir a URL — basta um nome de sala unico.
    if ((dto.tipo ?? 'VIDEO') === 'VIDEO') {
      const meetLink = this.gerarLinkJitsi(criado.titulo);
      return this.prisma.agendamento.update({
        where: { id: criado.id },
        data: { meetLink },
        include: INCLUDE_RESPONSAVEL,
      });
    }
    return criado;
  }

  // Monta a URL da sala no Jitsi (meet-breakr.vaitecnologia.com.br). A sala e criada
  // ao acessar a URL (VirtualHost anonimo), entao geramos um nome unico e URL-safe:
  // breakr-<slug do titulo>-<sufixo aleatorio>. Base configuravel por env JITSI_BASE_URL.
  private gerarLinkJitsi(titulo: string): string {
    const base = (process.env.JITSI_BASE_URL ?? 'https://meet-breakr.vaitecnologia.com.br').replace(/\/+$/, '');
    const slug =
      (titulo || 'reuniao')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-zA-Z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 40)
        .toLowerCase() || 'reuniao';
    const sufixo = randomUUID().replace(/-/g, '').slice(0, 8);
    return `${base}/breakr-${slug}-${sufixo}`;
  }

  async atualizar(id: string, dto: CriarAgendamentoDto) {
    const existe = await this.prisma.agendamento.findUnique({ where: { id }, select: { id: true } });
    if (!existe) throw new NotFoundException('Agendamento nao encontrado');
    if ((dto.tipo ?? 'VIDEO') === 'PRESENCIAL') {
      await this.garantirSalaLivre(new Date(dto.inicio), new Date(dto.fim), id);
    }
    return this.prisma.agendamento.update({
      where: { id },
      data: this.montarDados(dto),
      include: INCLUDE_RESPONSAVEL,
    });
  }

  async remover(id: string) {
    const existe = await this.prisma.agendamento.findUnique({ where: { id }, select: { id: true } });
    if (!existe) throw new NotFoundException('Agendamento nao encontrado');
    await this.prisma.agendamento.delete({ where: { id } });
    return { ok: true };
  }
}
