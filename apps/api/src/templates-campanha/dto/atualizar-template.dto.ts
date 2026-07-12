// DTO de atualizacao de template de campanha (todos opcionais).
import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class AtualizarTemplateDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  nome?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  tipoCampanha?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  tipoServico?: string;

  @IsOptional()
  @IsBoolean()
  arquivado?: boolean;
}
