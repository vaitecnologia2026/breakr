// DTO de criacao de meta trimestral.
import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CriarMetaDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  titulo!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  descricao?: string;

  // Formato "AAAA-QN" (ex.: 2026-Q3).
  @Matches(/^\d{4}-Q[1-4]$/)
  periodo!: string;
}
