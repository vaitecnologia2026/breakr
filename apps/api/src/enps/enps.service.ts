// Serviço de eNPS (NPS interno do time). Respostas anônimas; resultado agregado.
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ResponderEnpsDto } from './dto/responder-enps.dto';

@Injectable()
export class EnpsService {
  constructor(private readonly prisma: PrismaService) {}

  async responder(dto: ResponderEnpsDto) {
    await this.prisma.respostaEnps.create({
      data: { nota: dto.nota, comentario: dto.comentario },
    });
    return { ok: true };
  }

  // Resultado agregado: eNPS = %promotores - %detratores (escala -100..100).
  async resultados() {
    const respostas = await this.prisma.respostaEnps.findMany({
      orderBy: { criadoEm: 'desc' },
      select: { nota: true, comentario: true, criadoEm: true },
    });
    const total = respostas.length;
    const promotores = respostas.filter((r) => r.nota >= 9).length;
    const detratores = respostas.filter((r) => r.nota <= 6).length;
    const neutros = total - promotores - detratores;
    const enps = total > 0 ? Math.round(((promotores - detratores) / total) * 100) : null;
    return {
      total,
      promotores,
      neutros,
      detratores,
      enps,
      // Comentários (sem identificação — eNPS é anônimo).
      comentarios: respostas.filter((r) => r.comentario).map((r) => ({ comentario: r.comentario, nota: r.nota, criadoEm: r.criadoEm })),
    };
  }
}
