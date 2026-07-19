// DTO de atualização de processo jurídico (todos os campos opcionais).
import { IsDateString, IsEnum, IsNumberString, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { StatusProcessoJuridico } from '@prisma/client';

export class AtualizarProcessoDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  numero?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  parte?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  vara?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  fase?: string;

  @IsOptional()
  @IsEnum(StatusProcessoJuridico)
  status?: StatusProcessoJuridico;

  @IsOptional()
  @IsNumberString()
  valorCausa?: string;

  @IsOptional()
  @IsDateString()
  proximoPrazo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  observacao?: string;
}
