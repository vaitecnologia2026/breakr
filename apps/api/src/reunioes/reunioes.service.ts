// Serviço de reuniões internas do time (independentes de cliente).
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
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
      // Link do Meet = sala no Jitsi self-hosted (meet-breakr.vaitecnologia.com.br).
      // O VirtualHost e anonimo, entao a sala e criada ao abrir a URL — basta um
      // nome de sala unico. (Nao usa o GoogleMeetPort, mantido para onboarding/automacao.)
      meetLink = this.gerarLinkJitsi(dto.titulo);
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

  // Monta a URL da sala no Jitsi (meet-breakr.vaitecnologia.com.br). A sala e
  // criada ao acessar a URL (VirtualHost anonimo), entao geramos um nome unico e
  // URL-safe: breakr-<slug do titulo>-<sufixo aleatorio>. Base configuravel por env.
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
