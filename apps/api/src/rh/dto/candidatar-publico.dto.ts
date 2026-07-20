// DTO da inscrição pública na Página de Carreiras (sem login). Aditivo.
import {
  IsEmail,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CandidatarPublicoDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nome!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  telefone?: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  curriculoUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  mensagem?: string;

  // E-mail/nome do colaborador que indicou (Programa de Indicação). Se presente,
  // a origem do candidato é marcada como "Indicação".
  @IsOptional()
  @IsString()
  @MaxLength(160)
  indicadoPor?: string;
}
