import { Module } from '@nestjs/common';
import { IaController } from './ia.controller';
import { IaConfigService } from './ia-config.service';
import { IaService } from './ia.service';
import { IaAssistenteService } from './ia-assistente.service';
import { IntegracoesConfigService } from './integracoes-config.service';
import { PortalConfigService } from './portal-config.service';
import { OpenAiProvider } from './provedores/openai.provider';
import { AnthropicProvider } from './provedores/anthropic.provider';
import { GeminiProvider } from './provedores/gemini.provider';

@Module({
  controllers: [IaController],
  providers: [IaConfigService, IaService, IaAssistenteService, IntegracoesConfigService, PortalConfigService, OpenAiProvider, AnthropicProvider, GeminiProvider],
  exports: [IaService, IntegracoesConfigService],
})
export class IaModule {}
