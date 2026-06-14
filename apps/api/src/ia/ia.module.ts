// Modulo de IA — configuracao (3 provedores) + servico de uso (IaService).
// Exporta IaService para outros modulos consumirem (sugestoes, trafego, agentes).
import { Module } from '@nestjs/common';
import { IaController } from './ia.controller';
import { IaConfigService } from './ia-config.service';
import { IaService } from './ia.service';
import { OpenAiProvider } from './provedores/openai.provider';
import { AnthropicProvider } from './provedores/anthropic.provider';
import { GeminiProvider } from './provedores/gemini.provider';

@Module({
  controllers: [IaController],
  providers: [IaConfigService, IaService, OpenAiProvider, AnthropicProvider, GeminiProvider],
  exports: [IaService],
})
export class IaModule {}
