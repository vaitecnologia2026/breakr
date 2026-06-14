// DTO de atualizacao da config de IA. Campos opcionais: ausente = mantem.
// Chaves/modelos aceitam string vazia (= limpar).
import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ProvedorIa } from '@prisma/client';

export class AtualizarIaDto {
  @IsOptional()
  @IsBoolean()
  ativo?: boolean;

  @IsOptional()
  @IsEnum(ProvedorIa)
  provedorAtivo?: ProvedorIa;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  openaiApiKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  anthropicApiKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  geminiApiKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  modeloOpenai?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  modeloAnthropic?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  modeloGemini?: string;
}
