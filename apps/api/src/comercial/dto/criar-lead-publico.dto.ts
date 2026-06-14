// DTO para o endpoint público de captação de leads do site.
// Subconjunto de CriarLeadDto — sem campos internos (responsável, valor, origem).
import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CriarLeadPublicoDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nome!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  empresa?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  telefone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  observacao?: string;
}
