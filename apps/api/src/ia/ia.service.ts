// IaService — ponto unico de uso da IA no sistema. Resolve o provedor ativo a
// partir da configuracao e delega ao adapter. Qualquer feature (sugestoes de
// conteudo, IA de trafego, agentes...) chama `completar()` aqui e nao precisa
// saber qual provedor esta configurado.
import { Injectable } from '@nestjs/common';
import { ProvedorIa } from '@prisma/client';
import { IaConfigService, MODELO_PADRAO } from './ia-config.service';
import { IaProvider } from './provedores/ia.port';
import { OpenAiProvider } from './provedores/openai.provider';
import { AnthropicProvider } from './provedores/anthropic.provider';
import { GeminiProvider } from './provedores/gemini.provider';

@Injectable()
export class IaService {
  constructor(
    private readonly config: IaConfigService,
    private readonly openai: OpenAiProvider,
    private readonly anthropic: AnthropicProvider,
    private readonly gemini: GeminiProvider,
  ) {}

  // Resolve provedor + chave + modelo do provedor ativo. Null = IA indisponivel
  // (desativada ou sem chave) — degrada com elegancia, nao quebra a feature.
  private async resolver(): Promise<{ provider: IaProvider; apiKey: string; modelo: string } | null> {
    const c = await this.config.obterBruto();
    if (!c.ativo) return null;
    const mapa: Record<ProvedorIa, { provider: IaProvider; chave: string | null; modelo: string | null }> = {
      OPENAI: { provider: this.openai, chave: c.openaiApiKey, modelo: c.modeloOpenai },
      ANTHROPIC: { provider: this.anthropic, chave: c.anthropicApiKey, modelo: c.modeloAnthropic },
      GEMINI: { provider: this.gemini, chave: c.geminiApiKey, modelo: c.modeloGemini },
    };
    const e = mapa[c.provedorAtivo];
    if (!e.chave) return null;
    return { provider: e.provider, apiKey: e.chave, modelo: e.modelo ?? MODELO_PADRAO[c.provedorAtivo] };
  }

  /** A IA esta configurada e pronta para uso? */
  async disponivel(): Promise<boolean> {
    return (await this.resolver()) !== null;
  }

  /** Completa um prompt com o provedor ativo. Lanca se a IA nao estiver pronta. */
  async completar(prompt: string): Promise<string> {
    const r = await this.resolver();
    if (!r) {
      throw new Error('IA nao configurada — ative e informe a chave do provedor em Configuracoes.');
    }
    return r.provider.completar(prompt, { apiKey: r.apiKey, modelo: r.modelo });
  }

  /** Testa a conexao com uma chamada minima. Mensagem amigavel; nunca lanca. */
  async testar(): Promise<{ ok: boolean; mensagem: string }> {
    const r = await this.resolver();
    if (!r) {
      return {
        ok: false,
        mensagem: 'IA desativada ou sem chave no provedor ativo. Salve a chave e ative a IA.',
      };
    }
    try {
      const resposta = await r.provider.completar('Responda apenas com a palavra: OK', {
        apiKey: r.apiKey,
        modelo: r.modelo,
      });
      return { ok: true, mensagem: `Conexao OK com ${r.provider.nome}. Resposta: "${resposta.trim().slice(0, 40)}"` };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, mensagem: `Falha ao conectar com ${r.provider.nome}: ${msg.slice(0, 160)}` };
    }
  }
}
