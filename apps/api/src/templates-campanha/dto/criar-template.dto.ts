// DTO de criacao de template de campanha (Briefing Marketing — Secao 4).
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CriarTemplateDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  nome!: string;

  // Tipo de campanha: datas comemorativas | lancamentos | promocoes.
  @IsOptional()
  @IsString()
  @MaxLength(80)
  tipoCampanha?: string;

  // Tipo de servico: trafego pago | social media | impresso.
  @IsOptional()
  @IsString()
  @MaxLength(80)
  tipoServico?: string;
}
