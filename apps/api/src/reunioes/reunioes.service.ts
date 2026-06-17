// Serviço de reuniões internas do time (independentes de cliente).
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GOOGLE_MEET_PORT, GoogleMeetPort } from '../integracoes';
import { CriarReuniaoDto } from './dto/criar-reuniao.dto';

@Injectable()
export class ReunioesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(GOOGLE_MEET_PORT) private readonly meet: GoogleMeetPort,
  ) {}

  listar() {
    return this.prisma.reuniaoInterna.findMany({ orderBy: { data: 'asc' } });
  }

  async criar(dto: CriarReuniaoDto) {
    let meetLink: string | undefined;
    if (dto.gerarMeet) {
      const r = await this.meet.criarMeet({
        titulo: dto.titulo,
        inicio: new Date(dto.data).toISOString(),
        convidados: dto.convidados,
      });
      meetLink = r.meetLink;
    }
    return this.prisma.reuniaoInterna.create({
      data: {
        titulo: dto.titulo,
        descricao: dto.descricao,
        data: new Date(dto.data),
        tipo: dto.tipo ?? 'OUTRO',
        meetLink,
      },
    });
  }

  // Garante a reunião presencial fixa do 2º sábado do mês (idempotente).
  async garantirReuniaoSabado() {
    const agora = new Date();
    const primeiro = new Date(agora.getFullYear(), agora.getMonth(), 1);
    const primeiroSabado = 1 + ((6 - primeiro.getDay() + 7) % 7);
    const dia = primeiroSabado + 7; // 2º sábado
    const dataReuniao = new Date(agora.getFullYear(), agora.getMonth(), dia, 10, 0, 0);

    const inicioDia = new Date(dataReuniao);
    inicioDia.setHours(0, 0, 0, 0);
    const fimDia = new Date(dataReuniao);
    fimDia.setHours(23, 59, 59, 999);
    const TITULO = 'Reunião presencial mensal';
    const existe = await this.prisma.reuniaoInterna.findFirst({
      where: { titulo: TITULO, data: { gte: inicioDia, lte: fimDia } },
    });
    if (existe) return existe;
    return this.prisma.reuniaoInterna.create({
      data: {
        titulo: TITULO,
        descricao: 'Reunião presencial do time (2º sábado do mês).',
        data: dataReuniao,
        tipo: 'GESTAO',
      },
    });
  }

  async remover(id: string) {
    const reuniao = await this.prisma.reuniaoInterna.findUnique({ where: { id } });
    if (!reuniao) throw new NotFoundException('Reuniao nao encontrada');
    await this.prisma.reuniaoInterna.delete({ where: { id } });
    return { ok: true };
  }
}
