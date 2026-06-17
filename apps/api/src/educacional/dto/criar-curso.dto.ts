// DTO de criacao de curso educacional.
import { IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';

export class CriarCursoDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  titulo!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  descricao?: string;

  @IsUrl()
  @MaxLength(500)
  url!: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  plataforma?: string;
}
