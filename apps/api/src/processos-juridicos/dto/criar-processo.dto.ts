// DTO de criação de processo jurídico.
import { IsDateString, IsEnum, IsNumberString, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { StatusProcessoJuridico } from '@prisma/client';

export class CriarProcessoDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  numero!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  parte!: string;

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
