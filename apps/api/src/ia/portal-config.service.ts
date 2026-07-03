// Config do portal do cliente (frase motivacional exibida abaixo do nome do CS).
// Fica no campo Config.parametros.portalFrase do banco (sem migracao de schema).
// Preserva as demais chaves de parametros (ex.: integracoes) ao salvar.
// Importado por ia.module (provider) e ia.controller (GET/PATCH /config/portal).
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AtualizarPortalDto } from './dto/atualizar-portal.dto';

const CONFIG_ID = '00000000-0000-0000-0000-000000000001';

@Injectable()
export class PortalConfigService {
  constructor(private readonly prisma: PrismaService) {}

  async obter(): Promise<{ fraseMotivacional: string | null }> {
    const config = await this.prisma.config.findUnique({ where: { id: CONFIG_ID } });
    const params = (config?.parametros as Record<string, unknown>) ?? {};
    const frase = typeof params.portalFrase === 'string' ? params.portalFrase : null;
    return { fraseMotivacional: frase };
  }

  async atualizar(dto: AtualizarPortalDto): Promise<{ fraseMotivacional: string | null }> {
    const config = await this.prisma.config.findUnique({ where: { id: CONFIG_ID } });
    const params = (config?.parametros as Record<string, unknown>) ?? {};
    const frase =
      dto.fraseMotivacional === undefined
        ? (typeof params.portalFrase === 'string' ? params.portalFrase : null)
        : dto.fraseMotivacional.trim() || null;
    const payload = { ...params, portalFrase: frase } as unknown as Parameters<
      typeof this.prisma.config.upsert
    >[0]['update']['parametros'];
    await this.prisma.config.upsert({
      where: { id: CONFIG_ID },
      update: { parametros: payload },
      create: { id: CONFIG_ID, branding: {}, parametros: payload },
    });
    return this.obter();
  }
}
