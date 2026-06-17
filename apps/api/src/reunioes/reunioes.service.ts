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
        meetLink,
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
