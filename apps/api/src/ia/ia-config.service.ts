// Configuracao de IA (singleton). Le/grava as 3 chaves + provedor ativo.
// REGRA DE SEGURANCA: o metodo publico `obter()` NUNCA devolve a chave inteira —
// so um preview mascarado. A chave crua so sai por `obterBruto()` (uso interno
// do IaService, nunca via HTTP).
import { Injectable } from '@nestjs/common';
import { ConfiguracaoIa, Prisma, ProvedorIa } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AtualizarIaDto } from './dto/atualizar-ia.dto';

const ID = 'singleton';

// Modelo padrao quando o usuario nao define um explicitamente.
export const MODELO_PADRAO: Record<ProvedorIa, string> = {
  OPENAI: 'gpt-4o-mini',
  ANTHROPIC: 'claude-3-5-sonnet-latest',
  GEMINI: 'gemini-1.5-flash',
};

@Injectable()
export class IaConfigService {
  constructor(private readonly prisma: PrismaService) {}

  // Garante o registro singleton.
  private garantir(): Promise<ConfiguracaoIa> {
    return this.prisma.configuracaoIa.upsert({
      where: { id: ID },
      update: {},
      create: { id: ID },
    });
  }

  /** Config crua (com chaves) — USO INTERNO. Nunca exposto via HTTP. */
  obterBruto(): Promise<ConfiguracaoIa> {
    return this.garantir();
  }

  // "****" + ultimos 4 caracteres; null quando nao ha chave.
  private mascarar(chave: string | null): string | null {
    if (!chave) return null;
    return `••••${chave.slice(-4)}`;
  }

  /** DTO publico (mascarado) para a tela de Configuracoes. */
  async obter() {
    const c = await this.garantir();
    return {
      ativo: c.ativo,
      provedorAtivo: c.provedorAtivo,
      provedores: {
        openai: { temChave: !!c.openaiApiKey, preview: this.mascarar(c.openaiApiKey), modelo: c.modeloOpenai },
        anthropic: {
          temChave: !!c.anthropicApiKey,
          preview: this.mascarar(c.anthropicApiKey),
          modelo: c.modeloAnthropic,
        },
        gemini: { temChave: !!c.geminiApiKey, preview: this.mascarar(c.geminiApiKey), modelo: c.modeloGemini },
      },
    };
  }

  /**
   * Atualiza so os campos enviados. Para chaves/modelos: campo ausente = mantem;
   * string vazia = limpa (null); valor = grava.
   */
  async atualizar(dto: AtualizarIaDto) {
    await this.garantir();
    const data: Prisma.ConfiguracaoIaUpdateInput = {};
    if (dto.ativo !== undefined) data.ativo = dto.ativo;
    if (dto.provedorAtivo !== undefined) data.provedorAtivo = dto.provedorAtivo;
    const limpavel = (v: string | undefined) => (v === '' ? null : v);
    if (dto.openaiApiKey !== undefined) data.openaiApiKey = limpavel(dto.openaiApiKey);
    if (dto.anthropicApiKey !== undefined) data.anthropicApiKey = limpavel(dto.anthropicApiKey);
    if (dto.geminiApiKey !== undefined) data.geminiApiKey = limpavel(dto.geminiApiKey);
    if (dto.modeloOpenai !== undefined) data.modeloOpenai = limpavel(dto.modeloOpenai);
    if (dto.modeloAnthropic !== undefined) data.modeloAnthropic = limpavel(dto.modeloAnthropic);
    if (dto.modeloGemini !== undefined) data.modeloGemini = limpavel(dto.modeloGemini);

    await this.prisma.configuracaoIa.update({ where: { id: ID }, data });
    return this.obter();
  }
}
